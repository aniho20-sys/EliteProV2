import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { db, auth, functions } from '../firebase';
import {
  collection, doc, addDoc, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, getDocs, query, where, or, orderBy, limit, runTransaction,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult,
  GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut, deleteUser,
} from 'firebase/auth';
import { exerciseLibrary as defaultExercises, muscleGroups, equipmentTypes } from '../data/exercises';
import { localToday } from '../utils/dateUtils';
import { RECENT_BODY_STATS, recentSince, SUMMARY_VERSION } from '../utils/recentHistory';
import { canonicalExercise } from '../utils/exerciseUtils';
import { normalizeInviteCode } from '../utils/inviteCodeUtils';
import { getNewBadges } from './badgeUtils';
import { managedClientId, MANAGED_NAME_MAX } from '../utils/managedClient';
import { newId } from '../utils/ids';
import { isIOS, isStandalone, googleSignInMethod } from '../utils/deviceUtils';

// Exported so the screenshot renderer in mock/ can supply a stubbed value and mount the
// real pages without Firebase. The app itself always goes through AppProvider/useApp.
// eslint-disable-next-line react-refresh/only-export-components
export const AppContext = createContext();
const googleProvider = new GoogleAuthProvider();

// Firestore throws 'permission-denied'; the Functions SDK throws
// 'functions/permission-denied' for the same condition. Callers that map an error to a
// user-facing reason need both, or a permission failure gets reported as a bad connection
// and the user is told to check their internet.
// eslint-disable-next-line react-refresh/only-export-components
export const isPermissionError = (err) => {
  const code = err?.code || '';
  return code === 'permission-denied' || code === 'functions/permission-denied';
};

// The invite code callables refuse an account after its day's tries (B79).
// eslint-disable-next-line react-refresh/only-export-components
export const isTooManyTries = (err) => (err?.code || '').endsWith('resource-exhausted');

export function AppProvider({ children }) {
  // --- Individual collection states ---
  const [users, setUsers] = useState([]);
  const [bodyStatsMap, setBodyStatsMap] = useState({});
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [ownLogs, setOwnLogs] = useState([]);
  const [clientLogsMap, setClientLogsMap] = useState({});
  const [scheduleWindow, setSchedule] = useState([]);
  // The coach's sessions are loaded from this date on (B76); the calendar moves it back
  // when the coach looks at older weeks (extendScheduleTo).
  const [scheduleSince, setScheduleSince] = useState(recentSince);
  // A client's full history, while a page that needs it is open (watchClientHistory).
  const [fullHistory, setFullHistory] = useState({});
  const historyWatchers = useRef({});
  const [trainerBusySlots, setTrainerBusySlots] = useState([]);
  const [messages, setMessages] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [exerciseOverrides, setExerciseOverrides] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [studios, setStudios] = useState([]);
  const [studioSlots, setStudioSlots] = useState([]);
  const [gymApplications, setGymApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  // Firebase Auth state: undefined = checking, null = no user, object = authenticated
  const [firebaseUser, setFirebaseUser] = useState(undefined);
  const [googleAuthError, setGoogleAuthError] = useState(null);
  // Redirect result must be checked before declaring auth ready, to prevent
  // a flash of the login page when returning from Google OAuth redirect.
  const [redirectChecked, setRedirectChecked] = useState(false);
  // True from the moment signInWithGoogle() is called until onAuthStateChanged
  // fires with the result. Keeps the LoadingScreen up regardless of batch timing.
  const [signingIn, setSigningIn] = useState(false);

  const loadedRef = useRef(new Set());
  const [listenerEpoch, setListenerEpoch] = useState(0);
  const retryCountRef = useRef(0);

  const markLoaded = useCallback((name) => {
    loadedRef.current.add(name);
    if (loadedRef.current.size >= 8) setLoading(false);
  }, []);

  // Auto-retry on transient Firestore errors (network hiccup, WebSocket drop).
  // Silently re-subscribes up to 2 times before showing the error banner.
  const listenerFailed = useCallback((name) => {
    markLoaded(name);
    if (retryCountRef.current < 2) {
      retryCountRef.current += 1;
      setTimeout(() => setListenerEpoch(e => e + 1), 2000);
    } else {
      setDataError('Failed to load data. Check your connection and refresh.');
    }
  }, [markLoaded]);

  // --- Firebase Auth listener ---
  useEffect(() => {
    // Process any pending Google redirect sign-in before declaring auth ready.
    // This prevents a login-page flash when returning from Google OAuth.
    getRedirectResult(auth)
      .catch((err) => {
        const silent = [
          'auth/no-current-user',
          'auth/redirect-cancelled-by-user',
          'auth/user-cancelled',
        ];
        if (!silent.includes(err.code)) setGoogleAuthError(err);
      })
      .finally(() => setRedirectChecked(true));

    const unsub = onAuthStateChanged(auth, (user) => {
      // Clear signingIn first so it lands in the same render batch as the
      // auth state change, eliminating any cross-component timing gap.
      setSigningIn(false);
      // Set loading=true together with firebaseUser so the Firestore listener
      // useEffect and the auth state change land in the same render batch,
      // preventing a one-frame flash of LoginPage / RoleSelectPage.
      if (user) setLoading(true);
      setFirebaseUser(user || null);
      if (!user) setCurrentUser(null);
    });
    return unsub;
  }, []);

  // --- Set up real-time Firestore listeners (only when authed) ---
  useEffect(() => {
    if (!firebaseUser) {
      // Not authed: reset state and mark as non-loading
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUsers([]); setBodyStatsMap({}); setWorkoutPlans([]);
      setOwnLogs([]); setClientLogsMap({}); setSchedule([]); setTrainerBusySlots([]); setMessages([]); setExercises([]); setExerciseOverrides([]); setTemplates([]);
      loadedRef.current = new Set();
      retryCountRef.current = 0;
      setLoading(false);
      return;
    }

    setLoading(true);
    setDataError(null);
    loadedRef.current = new Set();
    const unsubs = [];
    const uid = firebaseUser.uid;

    const onErr = (name) => () => listenerFailed(name);

    // Split into two separate listeners (avoids the or() compound query which is
    // unreliable with IndexedDB persistence — the stale-cache snapshot can overwrite
    // the optimistic setUsers patch applied by updateClient).
    unsubs.push(onSnapshot(
      query(collection(db, 'users'), where('id', '==', uid)),
      (snap) => {
        setUsers(prev => {
          const selfDocs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
          const withoutSelf = prev.filter(u => u.id !== uid);
          return [...withoutSelf, ...selfDocs];
        });
        markLoaded('users');
      },
      onErr('users'),
    ));
    unsubs.push(onSnapshot(
      query(collection(db, 'users'), where('trainerId', '==', uid)),
      (snap) => {
        setUsers(prev => {
          const clientDocs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
          // Replace every client doc with the fresh snapshot; keep own doc and any
          // trainer doc. For a client, that trainer doc is their own coach
          // (added by the trainer-profile listener below) — dropping it here raced
          // that listener and could leave a client with no trainer in `users`.
          const kept = prev.filter(u => u.id === uid || u.role === 'trainer');
          return [...kept, ...clientDocs];
        });
        markLoaded('users');
      },
      onErr('users'),
    ));

    markLoaded('bodyStats'); // bodyStats handled via per-client subcollection listeners below

    unsubs.push(onSnapshot(query(collection(db, 'workoutPlans'), or(where('trainerId', '==', uid), where('clientId', '==', uid))), (snap) => {
      setWorkoutPlans(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('workoutPlans');
    }, onErr('workoutPlans')));

    // Own logs only. A coach's clients' logs come per client below — the rules let a coach
    // read a log only while its client is theirs, which a trainerId query cannot show.
    unsubs.push(onSnapshot(query(collection(db, 'workoutLogs'), where('clientId', '==', uid)), (snap) => {
      setOwnLogs(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('workoutLogs');
    }, onErr('workoutLogs')));

    // schedule: its own listener below, once the role is known (a coach's is windowed).

    unsubs.push(onSnapshot(query(collection(db, 'messages'), or(where('from', '==', uid), where('to', '==', uid))), (snap) => {
      setMessages(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('messages');
    }, onErr('messages')));

    markLoaded('exercises'); // exercises handled separately below

    unsubs.push(onSnapshot(
      query(collection(db, 'invoices'), or(where('trainerId', '==', uid), where('clientId', '==', uid))),
      (snap) => { setInvoices(snap.docs.map(d => ({ ...d.data(), id: d.id }))); markLoaded('invoices'); },
      onErr('invoices'),
    ));

    return () => unsubs.forEach(fn => fn());
  }, [firebaseUser, markLoaded, listenerFailed, listenerEpoch]);

  // --- Exercises: role-aware listener (trainer sees own; client sees trainer's + own) ---
  // A client's own exercises carry their own id: addExercise writes that while they have no
  // coach. They used to be listened to by nobody — invisible from the moment they were added,
  // and still after connecting to a coach (Grok Bot review 2026-10-24).
  useEffect(() => {
    if (!currentUser?.id) return;
    const owners = currentUser.role === 'trainer'
      ? [currentUser.id]
      : [currentUser.trainerId, currentUser.id].filter(Boolean);
    const byOwner = {};
    const publish = () => setExercises([...owners.flatMap(o => byOwner[o] || []), ...defaultExercises]);
    const unsubs = owners.map(owner => onSnapshot(
      query(collection(db, 'exercises'), where('trainerId', '==', owner)),
      (snap) => { byOwner[owner] = snap.docs.map(d => ({ ...d.data(), id: d.id })); publish(); },
      () => { byOwner[owner] = []; publish(); },
    ));
    return () => unsubs.forEach(u => u());
  }, [currentUser?.id, currentUser?.role, currentUser?.trainerId]);

  // --- Exercise Overrides: per-trainer video/instructions layered onto the static seed
  // exercises (which have no backing Firestore doc — see CLAUDE.md). Same targetTrainerId
  // as the exercises listener above, so trainer sees own overrides and clients see their
  // own trainer's — reused as-is, no new ID-resolution logic.
  useEffect(() => {
    if (!currentUser?.id) return;
    const targetTrainerId = currentUser.role === 'trainer' ? currentUser.id : currentUser.trainerId;
    if (!targetTrainerId) return;
    const unsub = onSnapshot(
      query(collection(db, 'exerciseOverrides'), where('trainerId', '==', targetTrainerId)),
      (snap) => setExerciseOverrides(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      () => setExerciseOverrides([]),
    );
    return () => unsub();
  }, [currentUser?.id, currentUser?.role, currentUser?.trainerId]);

  // --- Templates: trainer-only reusable plan blueprints ---
  useEffect(() => {
    if (!currentUser?.id || currentUser.role !== 'trainer') return;
    const unsub = onSnapshot(
      query(collection(db, 'templates'), where('trainerId', '==', currentUser.id)),
      (snap) => setTemplates(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      () => {},
    );
    return () => unsub();
  }, [currentUser?.id, currentUser?.role]);

  // --- Trainer time zone ---
  // Session dates and times are the trainer's wall clock; the server needs the zone to
  // judge a late cancel (functions/zonedTime.js) and otherwise reads them as UTC, an hour
  // out during British Summer Time. Written once, from this browser, when missing — not
  // overwritten on every visit, so opening the app abroad does not move every session.
  const trainerZoneMissing = currentUser?.role === 'trainer' && !currentUser.timeZone;
  useEffect(() => {
    if (!trainerZoneMissing) return;
    let timeZone;
    try { timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return; }
    if (!timeZone) return;
    updateDoc(doc(db, 'users', currentUser.id), { timeZone })
      .catch(err => console.error('[timeZone] could not save', err));
  }, [trainerZoneMissing, currentUser?.id]);

  // --- gym啦: studios, studioSlots, trainerApplications listeners ---
  useEffect(() => {
    if (!currentUser?.id) return;
    const unsubs = [];

    // Studios: all authenticated users can read
    unsubs.push(onSnapshot(
      collection(db, 'studios'),
      (snap) => setStudios(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      () => {},
    ));

    // Studio Slots: all authenticated users can read
    unsubs.push(onSnapshot(
      collection(db, 'studioSlots'),
      (snap) => setStudioSlots(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      () => {},
    ));

    // Trainer Applications: operator sees all, trainer sees own doc
    if (currentUser.role === 'operator') {
      unsubs.push(onSnapshot(
        collection(db, 'trainerApplications'),
        (snap) => setGymApplications(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
        () => {},
      ));
    } else if (currentUser.role === 'trainer') {
      unsubs.push(onSnapshot(
        doc(db, 'trainerApplications', currentUser.id),
        (snap) => {
          if (snap.exists()) setGymApplications([{ ...snap.data(), id: snap.id }]);
          else setGymApplications([]);
        },
        () => {},
      ));
    }

    return () => unsubs.forEach(fn => fn());
  }, [currentUser?.id, currentUser?.role]);

  // --- Trainer profile for clients: load trainer doc so ProfilePage can show trainer name/inviteCode ---
  useEffect(() => {
    if (!currentUser?.id || currentUser.role !== 'client' || !currentUser.trainerId) return;
    const unsub = onSnapshot(
      doc(db, 'users', currentUser.trainerId),
      (snap) => {
        if (snap.exists()) setUsers(prev => {
          const rest = prev.filter(u => u.id !== snap.id);
          return [...rest, { ...snap.data(), id: snap.id }];
        });
      },
      () => {},
    );
    return () => unsub();
  }, [currentUser?.id, currentUser?.trainerId, currentUser?.role]);

  // --- When a client's coach is busy (for booking) ---
  // Dates, times and lengths only, from the getTrainerAvailability function. Clients used to
  // listen to the coach's whole schedule, which showed them other clients' sessions and the
  // coach's notes (production audit 2026-09-28, High-value 4); firestore.rules no longer
  // allows it. Not live: the booking form refreshes it when it opens, and a client's own
  // bookings come from their own schedule listener, which is.
  const refreshTrainerBusySlots = useCallback(async () => {
    const { data } = await httpsCallable(functions, 'getTrainerAvailability')();
    setTrainerBusySlots((data && data.slots) || []);
  }, []);

  useEffect(() => {
    if (!currentUser?.id || currentUser.role !== 'client' || !currentUser.trainerId) return;
    let cancelled = false;
    httpsCallable(functions, 'getTrainerAvailability')()
      .then(({ data }) => { if (!cancelled) setTrainerBusySlots((data && data.slots) || []); })
      .catch(err => console.error('[availability] load failed', err));
    return () => { cancelled = true; };
  }, [currentUser?.id, currentUser?.trainerId, currentUser?.role]);

  const myClients = currentUser?.role === 'trainer' ? users.filter(u => u.trainerId === currentUser.id) : [];
  const myClientIds = myClients.map(u => u.id).sort().join(',');
  // Clients who keep their health information from this coach (B79): their body stats are
  // not listened to, and listening starts again the moment they share.
  const privateIds = myClients.filter(u => u.healthSharing === 'no').map(u => u.id).sort().join(',');
  const privateIdsRef = useRef(privateIds);
  useEffect(() => { privateIdsRef.current = privateIds; }, [privateIds]);
  // Whether a coach may see this client's health information. Not answered yet = shared
  // (Ani 2026-10-26); a client without the app never answers.
  const healthShared = (clientId) => users.find(u => u.id === clientId)?.healthSharing !== 'no';
  // B76 step 2: a client with a server-kept summary (functions/clientSummary.js) needs no
  // listener of their own — the summary arrives with the client docs already listened to.
  // Only the clients without one (from before step 2, until it is built) keep step 1's
  // per-client listeners.
  const summaryOf = (clientId) => {
    const s = users.find(u => u.id === clientId)?.summary;
    return s && s.version === SUMMARY_VERSION ? s : null;
  };
  const unsummarisedIds = myClients.filter(u => !(u.summary && u.summary.version === SUMMARY_VERSION))
    .map(u => u.id).sort().join(',');

  // Ask the server to build the missing summaries; when they land on the client docs,
  // unsummarisedIds empties and those listeners close. Asked again only when the set of
  // clients without one changes (a new client); building twice is harmless.
  useEffect(() => {
    if (!unsummarisedIds) return;
    httpsCallable(functions, 'ensureClientSummaries')()
      .catch(err => console.error('[clientSummary] could not build summaries', err));
  }, [unsummarisedIds]);

  // A windowed query needs a composite index (firestore.indexes.json). Until production has
  // built it — or if it is ever missing — the query is refused with failed-precondition, and
  // the emulator never refuses it, so tests would not notice (CLAUDE.md #34). Then the same
  // data is asked for unwindowed: slower, never empty.
  const listenWindowed = (windowed, unwindowed, onData, label, onFail = () => {}) => {
    const failed = (e) => { console.error(`[${label}] listener failed`, e); onFail(e); };
    let unsub = onSnapshot(windowed, onData, (err) => {
      if (err && err.code === 'failed-precondition') {
        console.warn(`[${label}] index not ready, loading without the date window`, err);
        unsub = onSnapshot(unwindowed, onData, failed);
      } else {
        failed(err);
      }
    });
    return () => unsub();
  };

  // --- Body Stats: a client's own in full; a coach's clients' latest few (B76) ---
  useEffect(() => {
    if (!currentUser?.id || currentUser.role === 'trainer') return;
    const cid = currentUser.id;
    return onSnapshot(
      query(collection(db, 'bodyStats', cid, 'entries'), orderBy('date', 'asc')),
      (snap) => setBodyStatsMap(prev => ({ ...prev, [cid]: snap.docs.map(d => ({ ...d.data(), id: d.id })) })),
      () => {},
    );
  }, [currentUser?.id, currentUser?.role]);
  useEffect(() => {
    if (!unsummarisedIds) return;
    const hidden = new Set(privateIds.split(','));
    const unsubs = unsummarisedIds.split(',').filter(cid => !hidden.has(cid)).map(cid =>
      onSnapshot(
        query(collection(db, 'bodyStats', cid, 'entries'), orderBy('date', 'desc'), limit(RECENT_BODY_STATS)),
        (snap) => setBodyStatsMap(prev => ({ ...prev, [cid]: snap.docs.map(d => ({ ...d.data(), id: d.id })).reverse() })),
        () => {},
      )
    );
    return () => unsubs.forEach(u => u());
  }, [unsummarisedIds, privateIds]);

  // --- Workout logs of a coach's clients: one listener per current client, recent days only ---
  // A log carries the coach it was written under (trainerId); a client who has left must not
  // stay readable through it, so the rules check the client's current coach and the app asks
  // client by client (Grok Bot review 2026-10-24). Full history: watchClientHistory.
  useEffect(() => {
    if (!unsummarisedIds) return;
    const since = recentSince();
    const unsubs = unsummarisedIds.split(',').map(cid => listenWindowed(
      query(collection(db, 'workoutLogs'), where('clientId', '==', cid), where('date', '>=', since)),
      query(collection(db, 'workoutLogs'), where('clientId', '==', cid)),
      (snap) => setClientLogsMap(prev => ({ ...prev, [cid]: snap.docs.map(d => ({ ...d.data(), id: d.id })) })),
      'workoutLogs',
    ));
    return () => unsubs.forEach(u => u());
  }, [unsummarisedIds]);

  // --- Schedule: a coach's from scheduleSince on; a client's own in full ---
  useEffect(() => {
    if (!currentUser?.id) return;
    const uid = currentUser.id;
    const onData = (snap) => {
      setSchedule(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('schedule');
    };
    if (currentUser.role !== 'trainer') {
      return onSnapshot(
        query(collection(db, 'schedule'), or(where('trainerId', '==', uid), where('clientId', '==', uid))),
        onData, () => listenerFailed('schedule'),
      );
    }
    return listenWindowed(
      query(collection(db, 'schedule'), where('trainerId', '==', uid), where('date', '>=', scheduleSince)),
      query(collection(db, 'schedule'), where('trainerId', '==', uid)),
      onData, 'schedule', () => listenerFailed('schedule'),
    );
  }, [currentUser?.id, currentUser?.role, scheduleSince, listenerEpoch, markLoaded, listenerFailed]);

  // The calendar asks for older weeks; the window only ever widens.
  const extendScheduleTo = useCallback((date) => {
    setScheduleSince(prev => (date && date < prev ? date : prev));
  }, []);

  // --- A client's full history, for the pages that need all of it (B76) ---
  // Returns a release function; pages call it from an effect. Counted per client, so two
  // pages showing the same client share one set of listeners.
  const coachId = currentUser?.role === 'trainer' ? currentUser.id : null;
  // A watched client's body stats. Not listened to while the client keeps them private
  // (B79) — empty, so the page still finishes loading; a refusal (they stopped sharing while
  // watched) closes the listener, so sharing again opens a new one.
  const listenHistoryBody = useCallback((cid) => {
    const w = historyWatchers.current[cid];
    if (!w || w.bodyUnsub) return;
    const empty = () => setFullHistory(prev => ({ ...prev, [cid]: { ...prev[cid], bodyStats: [] } }));
    if (privateIdsRef.current.split(',').includes(cid)) { empty(); return; }
    w.bodyUnsub = onSnapshot(
      query(collection(db, 'bodyStats', cid, 'entries'), orderBy('date', 'asc')),
      (snap) => setFullHistory(prev => ({ ...prev, [cid]: { ...prev[cid], bodyStats: snap.docs.map(d => ({ ...d.data(), id: d.id })) } })),
      (err) => { console.error('[history] bodyStats failed', cid, err); w.bodyUnsub = null; empty(); },
    );
  }, [privateIdsRef]);
  const watchClientHistory = useCallback((clientIds) => {
    if (!coachId) return () => {};
    const uid = coachId;
    for (const cid of clientIds) {
      const w = historyWatchers.current[cid];
      if (w) { w.count += 1; continue; }
      const put = (key) => (snap) => setFullHistory(prev => ({
        ...prev, [cid]: { ...prev[cid], [key]: snap.docs.map(d => ({ ...d.data(), id: d.id })) },
      }));
      const failed = (key) => (err) => console.error(`[history] ${key} failed`, cid, err);
      historyWatchers.current[cid] = {
        count: 1,
        unsubs: [
          onSnapshot(query(collection(db, 'workoutLogs'), where('clientId', '==', cid)), put('logs'), failed('logs')),
          onSnapshot(query(collection(db, 'schedule'), where('trainerId', '==', uid), where('clientId', '==', cid)), put('schedule'), failed('schedule')),
        ],
        bodyUnsub: null,
      };
      listenHistoryBody(cid);
    }
    return () => {
      for (const cid of clientIds) {
        const w = historyWatchers.current[cid];
        if (!w) continue;
        w.count -= 1;
        if (w.count > 0) continue;
        w.unsubs.forEach(u => u());
        if (w.bodyUnsub) w.bodyUnsub();
        delete historyWatchers.current[cid];
        setFullHistory(prev => { const next = { ...prev }; delete next[cid]; return next; });
      }
    };
  }, [coachId, listenHistoryBody]);

  // A client changing what they share while their page is open (B79).
  useEffect(() => {
    const hidden = new Set(privateIds.split(','));
    for (const [cid, w] of Object.entries(historyWatchers.current)) {
      if (!hidden.has(cid)) { listenHistoryBody(cid); continue; }
      if (w.bodyUnsub) { w.bodyUnsub(); w.bodyUnsub = null; }
      setFullHistory(prev => ({ ...prev, [cid]: { ...prev[cid], bodyStats: [] } }));
    }
  }, [privateIds, listenHistoryBody]);

  // Whether a client's whole history is here: always for a client's own data; for a coach's
  // client only while watchClientHistory has it loaded.
  const historyComplete = (clientId) => currentUser?.role !== 'trainer' || clientId === currentUser?.id
    || !!(fullHistory[clientId]?.logs && fullHistory[clientId]?.schedule && fullHistory[clientId]?.bodyStats);
  // Where a client's loaded history starts, for getLastActivity — null when it is all here,
  // or when the summary (built from all of it) speaks for it.
  const historyStart = (clientId) => (historyComplete(clientId) || summaryOf(clientId) ? null : recentSince());

  // A client who has left keeps no logs here, even ones loaded before they left. Per client,
  // the best there is: full history if a page is watching it, else the summary's newest
  // logs (date and plan only — no sets), else step 1's recent window.
  const workoutLogs = useMemo(() => {
    const clients = coachId ? users.filter(u => u.trainerId === coachId) : [];
    const theirs = clients.flatMap(c => {
      if (fullHistory[c.id]?.logs) return fullHistory[c.id].logs;
      const s = c.summary && c.summary.version === SUMMARY_VERSION ? c.summary : null;
      if (s) return (s.recentLogs || []).map(l => ({ ...l, clientId: c.id, entries: [], fromSummary: true }));
      return clientLogsMap[c.id] || [];
    });
    return [...ownLogs, ...theirs];
  }, [ownLogs, clientLogsMap, fullHistory, users, coachId]);

  // The coach's recent sessions plus the full history of the clients being watched.
  const schedule = useMemo(() => {
    const current = new Set(myClientIds ? myClientIds.split(',') : []);
    const byId = new Map(scheduleWindow.map(s => [s.id, s]));
    for (const [cid, h] of Object.entries(fullHistory)) {
      if (!current.has(cid)) continue;
      for (const s of h.schedule || []) if (!byId.has(s.id)) byId.set(s.id, s);
    }
    return [...byId.values()];
  }, [scheduleWindow, fullHistory, myClientIds]);

  // --- Sync currentUser when users list or firebaseUser changes ---
  useEffect(() => {
    if (!firebaseUser) return;
    const profile = users.find(u => u.id === firebaseUser.uid);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile) setCurrentUser(profile);
  }, [users, firebaseUser]);

// ========== Auth ==========

  // Firebase Auth: Google Sign-In
  // Popup everywhere except an iPhone home-screen app, which goes by redirect
  // (googleSignInMethod, utils/deviceUtils.js). Popup was once right there too: older iOS
  // sent a redirect out to Safari and never back. Current iOS keeps it inside the app,
  // and its popup now dies on "missing initial state" (Ani 2026-10-21). The redirect
  // finishes on this app's own domain (authDomain in firebase.js), so its state is readable.
  const signInWithGoogle = () => {
    setSigningIn(true);
    if (googleSignInMethod({ ios: isIOS(), standalone: isStandalone() }) === 'redirect') {
      return signInWithRedirect(auth, googleProvider).catch((err) => {
        setSigningIn(false);
        setGoogleAuthError(err);
      });
    }
    return signInWithPopup(auth, googleProvider).catch((err) => {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/internal-error') {
        // Popup blocked — fall back to redirect. Page will reload so signingIn
        // state resets automatically; don't clear it here.
        signInWithRedirect(auth, googleProvider);
      } else {
        // All other cases (popup closed by user, cancelled, real errors):
        // auth state won't change, so clear signingIn manually.
        setSigningIn(false);
        if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
          setGoogleAuthError(err);
        }
      }
    });
  };

  const signUpEmail = async (email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const signInEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  const sendPasswordReset = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  // Complete profile for real Firebase Auth users → creates Firestore doc
  // The profile is created with no coach and no invite code; both are issued server-side
  // afterwards (P2 + P3, reports/production-audit-2026-09-28.md) — firestore.rules no longer
  // accepts either from the browser. RoleSelectPage has already checked the code, so a
  // failure here is a dropped connection, not a wrong code: the account exists either way
  // and the client can connect from Profile, the trainer's code is issued on next visit.
  const completeProfile = async (role, name, inviteCode) => {
    if (!firebaseUser) return;
    let profile = {
      id: firebaseUser.uid,
      name: name || firebaseUser.displayName || 'User',
      email: firebaseUser.email || '',
      role,
      avatar: firebaseUser.photoURL || null,
      joinDate: localToday(),
      ...(role === 'client'
        ? { trainerId: null, goals: '', age: '', height: '' }
        : { speciality: '' }
      ),
    };
    await setDoc(doc(db, 'users', profile.id), profile);

    try {
      if (role === 'client' && inviteCode) {
        const { data } = await httpsCallable(functions, 'connectWithInviteCode')({ code: normalizeInviteCode(inviteCode) });
        if (data && data.found) profile = { ...profile, trainerId: data.trainer.id };
      } else if (role === 'trainer') {
        const { data } = await httpsCallable(functions, 'ensureInviteCode')();
        if (data && data.code) profile = { ...profile, inviteCode: data.code };
      }
    } catch (err) {
      console.error('[completeProfile] follow-up call failed', err);
    }

    setCurrentUser(profile);
    return profile;
  };

  const logout = async () => {
    try { await signOut(auth); } catch { /* ignore */ }
    setCurrentUser(null);
    setFirebaseUser(null);
  };

  // Delete the current user's account: Firestore profile + bodyStats + Firebase Auth user.
  // Workout logs / messages remain as orphan history (rules disallow delete).
  // Returns { success } or throws on auth/recent-login required.
  const deleteAccount = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser || !currentUser) throw new Error('Not signed in');
    const uid = currentUser.id;

    // 1. Delete bodyStats entries subcollection (best-effort; only clients have entries)
    try {
      const snap = await getDocs(collection(db, 'bodyStats', uid, 'entries'));
      if (snap.size > 0) {
        const delBatch = writeBatch(db);
        snap.docs.forEach(d => delBatch.delete(d.ref));
        await delBatch.commit();
      }
    } catch { /* may not exist */ }

    // 2. Delete Firestore user profile
    await deleteDoc(doc(db, 'users', uid));

    // 3. Delete Firebase Auth account (may fail if login is too old → caller handles)
    await deleteUser(fbUser);

    // 4. Local cleanup
    setCurrentUser(null);
    setFirebaseUser(null);
  };

  // ========== Users / Clients ==========
  const getClients = (trainerId) => users.filter(u => u.role === 'client' && u.trainerId === trainerId);
  const getClient = (clientId) => users.find(u => u.id === clientId);

  const updateClient = async (clientId, updates) => {
    await updateDoc(doc(db, 'users', clientId), updates);
    // Optimistic local patch — the trainerId-scoped users listener can serve a
    // stale IndexedDB-cached snapshot instead of re-firing promptly (see listener
    // split comment above), so without this the trainer's own UI can keep
    // showing pre-write values (e.g. session counts) after a successful write.
    setUsers(prev => prev.map(u => u.id === clientId ? { ...u, ...updates } : u));
  };

  // A client who does not use the app, added by their coach (B35). Only the fields
  // firestore.rules accepts for this shape; credit is added afterwards like any client.
  const addManagedClient = async (name) => {
    const trimmed = (name || '').trim().slice(0, MANAGED_NAME_MAX);
    if (!trimmed) throw new Error('empty name');
    const id = managedClientId();
    // The signed-in uid — what the rule compares trainerId against — rather than the
    // profile, which arrives later by listener.
    const record = { id, name: trimmed, role: 'client', trainerId: firebaseUser.uid, managed: true, joinDate: localToday() };
    await setDoc(doc(db, 'users', id), record);
    // Same reason as updateClient's optimistic patch: the trainerId listener can lag.
    setUsers(prev => prev.some(u => u.id === id) ? prev : [...prev, record]);
    return record;
  };

  // A client with an account is detached (trainerId cleared) and keeps their account.
  // A client without the app has nothing to keep, so the server deletes the record and
  // what hangs off it (functions/accountDeletion.js) — the rules allow neither here.
  const removeClient = async (clientId) => {
    const client = users.find(u => u.id === clientId);
    if (client?.managed === true) {
      await httpsCallable(functions, 'removeManagedClient')({ clientId });
      setUsers(prev => prev.filter(u => u.id !== clientId));
      return;
    }
    await updateDoc(doc(db, 'users', clientId), { trainerId: null });
  };

  // ========== Credit Ledger ==========
  // Append-only top-up history (fetched on demand — no realtime listener needed).
  // Every top-up the trainer has ever recorded, across all their clients. Single-field
  // query on purpose (CLAUDE.md #34) — adding a second equality filter would need a
  // composite index that does not exist in production.
  const getTrainerCreditLedger = async (trainerId) => {
    const snap = await getDocs(query(collection(db, 'creditLedger'), where('trainerId', '==', trainerId)));
    return snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => b.date.localeCompare(a.date));
  };

  const getCreditLedger = async (clientId) => {
    const snap = await getDocs(query(collection(db, 'creditLedger'), where('clientId', '==', clientId)));
    return snap.docs.map(d => ({ ...d.data(), id: d.id })).sort((a, b) => b.date.localeCompare(a.date));
  };

  // Records a top-up: appends the ledger entry, adds the sessions, and clears the
  // renewal-reminder flags so the client's dashboard prompts can fire again next time.
  const addCreditLedgerEntry = async (clientId, { qty, rate }) => {
    await addDoc(collection(db, 'creditLedger'), {
      clientId,
      trainerId: currentUser.id,
      date: localToday(),
      qty,
      rate: rate ?? null,
      addedBy: currentUser.id,
    });
    const client = users.find(u => u.id === clientId);
    await updateClient(clientId, {
      totalSessions: (client?.totalSessions ?? 0) + qty,
      renewalPrompt3Shown: false,
      renewalPrompt1Shown: false,
      // A top-up is the answer the prompt was asking for, so any outstanding "remind me
      // later" is spent. The balance going back up usually silences it anyway; this covers
      // a small top-up that leaves the client still under the threshold.
      renewalPromptSnoozedUntil: null,
    });
  };

  // ========== Body Stats ==========
  const getBodyStats = (clientId) => {
    if (coachId && clientId !== coachId && !healthShared(clientId)) return [];
    if (fullHistory[clientId]?.bodyStats) return fullHistory[clientId].bodyStats;
    const s = coachId && clientId !== coachId ? summaryOf(clientId) : null;
    if (s) return s.latestBodyStat ? [{ ...s.latestBodyStat, id: `summary-${clientId}`, fromSummary: true }] : [];
    return bodyStatsMap[clientId] || [];
  };

  const addBodyStat = async (clientId, stat) => {
    const addedBy = currentUser?.role === 'trainer' ? 'coach' : 'self';
    const entry = { ...stat, date: stat.date || localToday(), addedBy };
    await addDoc(collection(db, 'bodyStats', clientId, 'entries'), entry);
  };

  const deleteBodyStat = async (clientId, entryId) => {
    await deleteDoc(doc(db, 'bodyStats', clientId, 'entries', entryId));
  };

  const updateBodyStat = async (clientId, entryId, updates) => {
    await updateDoc(doc(db, 'bodyStats', clientId, 'entries', entryId), updates);
  };

  // ========== Workout Plans ==========
  const getWorkoutPlans = (filter) => {
    return workoutPlans.filter(p => {
      if (filter.clientId && p.clientId !== filter.clientId) return false;
      if (filter.trainerId && p.trainerId !== filter.trainerId) return false;
      return true;
    });
  };

  const addWorkoutPlan = async (plan) => {
    const newPlan = { ...plan, id: newId('plan'), trainerId: currentUser?.id || plan.trainerId };
    await setDoc(doc(db, 'workoutPlans', newPlan.id), newPlan);
    return newPlan;
  };

  const updateWorkoutPlan = async (planId, updates) => {
    await updateDoc(doc(db, 'workoutPlans', planId), updates);
  };

  const deleteWorkoutPlan = async (planId) => {
    await deleteDoc(doc(db, 'workoutPlans', planId));
  };

  // ========== Workout Logs ==========
  const getWorkoutLogs = (clientId) => workoutLogs.filter(l => l.clientId === clientId);

  const addWorkoutLog = async (log) => {
    const isTrainerRole = currentUser?.role === 'trainer';
    const newLog = {
      ...log,
      id: newId('log'),
      clientId: log.clientId || currentUser?.id,
      trainerId: isTrainerRole ? currentUser.id : (currentUser?.trainerId || null),
      createdBy: currentUser?.id,
      logType: log.logType || (isTrainerRole ? 'pt_session' : 'self_training'),
    };
    await setDoc(doc(db, 'workoutLogs', newLog.id), newLog);
    return newLog;
  };

  const updateWorkoutLog = async (logId, updates) => {
    await updateDoc(doc(db, 'workoutLogs', logId), updates);
  };

  // ========== Schedule ==========
  // includeLastCompleted (B76 step 2): also the client's last completed session from their
  // summary, when it is older than the sessions loaded — for "last activity" only. It has
  // a date and a type but no time, so it never goes to the calendar.
  const getSchedule = (filter) => {
    const found = schedule.filter(s => {
      if (filter.trainerId && s.trainerId !== filter.trainerId) return false;
      if (filter.clientId && s.clientId !== filter.clientId) return false;
      if (filter.date && s.date !== filter.date) return false;
      return true;
    });
    const last = filter.includeLastCompleted && filter.clientId && !fullHistory[filter.clientId]?.schedule
      ? summaryOf(filter.clientId)?.lastSession : null;
    if (last && !found.some(s => s.id === last.id)) {
      found.push({ ...last, clientId: filter.clientId, trainerId: coachId, status: 'completed', fromSummary: true });
    }
    return found;
  };

  // Returns the trainer's full schedule (for clients to check real availability)
  const getTrainerBusySlots = () => trainerBusySlots;

  const addScheduleItem = async (item) => {
    const newItem = { ...item, id: newId('sched'), status: item.status || 'pending' };
    await setDoc(doc(db, 'schedule', newItem.id), newItem);
    return newItem;
  };

  // A coach cancelling or declining is marked so the server refunds it whatever the timing
  // and does not count it as one of the client's two free cancels (B77). Cleared when the
  // coach sets any other status, so a reopened session is the client's to cancel again.
  const updateScheduleItem = async (itemId, updates) => {
    const marked = currentUser?.role === 'trainer' && 'status' in updates
      ? { ...updates, cancelledBy: updates.status === 'cancelled' ? 'coach' : null }
      : updates;
    await updateDoc(doc(db, 'schedule', itemId), marked);
  };

  const deleteScheduleItem = async (itemId) => {
    await deleteDoc(doc(db, 'schedule', itemId));
  };

  // ========== Messages ==========
  const getMessages = (userId) => messages.filter(m => m.from === userId || m.to === userId);

  // Per-session sliding-window rate limiter: max 10 messages per 60 seconds
  const msgTimestampsRef = useRef([]);
  const MSG_RATE_LIMIT = 10;
  const MSG_RATE_WINDOW_MS = 60 * 1000;

  const sendMessage = async (from, to, text) => {
    const trimmed = (text || '').trim();
    if (!trimmed) throw new Error('Message cannot be empty');
    if (trimmed.length > 2000) throw new Error('Message too long (max 2,000 characters)');

    const now = Date.now();
    msgTimestampsRef.current = msgTimestampsRef.current.filter(t => now - t < MSG_RATE_WINDOW_MS);
    if (msgTimestampsRef.current.length >= MSG_RATE_LIMIT) {
      throw new Error('Too many messages — please wait a moment before sending again');
    }
    msgTimestampsRef.current.push(now);

    const msg = { id: newId('msg', now), from, to, text: trimmed, timestamp: new Date().toISOString(), read: false };
    await setDoc(doc(db, 'messages', msg.id), msg);
    return msg;
  };

  const getUnreadCount = (userId) => messages.filter(m => m.to === userId && !m.read).length;

  const markMessagesRead = async (userId, otherUserId) => {
    const toMark = messages.filter(m => m.to === userId && m.from === otherUserId && !m.read);
    if (toMark.length === 0) return;
    const batch = writeBatch(db);
    toMark.forEach(m => batch.update(doc(db, 'messages', m.id), { read: true }));
    await batch.commit();
  };

  // ========== Session Stats ==========
  const getSessionStats = (clientId) => {
    const client = users.find(u => u.id === clientId);
    const total = client?.totalSessions ?? null;
    const used = client?.sessionOffset ?? 0;
    const remaining = total !== null ? total - used : null;
    return { used, total, remaining };
  };

  // ========== Personal Records ==========
  const getPersonalRecords = (clientId) => {
    const logs = workoutLogs.filter(l => l.clientId === clientId);
    const library = getExercises();
    const prs = {};
    logs.forEach(log => {
      (log.entries || []).forEach(entry => {
        const id = canonicalExercise(library, entry.exerciseId)?.id || entry.exerciseId;
        const maxWeight = Math.max(...entry.sets.map(s => Number(s.weight) || 0));
        if (maxWeight > 0) {
          if (!prs[id] || maxWeight > prs[id].weight) {
            prs[id] = { weight: maxWeight, date: log.date, name: entry.name };
          }
        }
      });
    });
    return prs;
  };

  // ========== Invite Code ==========
  // A trainer's code is issued by the ensureInviteCode callable, which guarantees no other
  // trainer holds it (P3). Trainers can no longer write their own inviteCode.
  const getInviteCode = async (trainerId) => {
    const trainer = users.find(u => u.id === trainerId && u.role === 'trainer');
    if (!trainer) return null;
    if (trainer.inviteCode) return trainer.inviteCode;
    const { data } = await httpsCallable(functions, 'ensureInviteCode')();
    return (data && data.code) || null;
  };

  const findTrainerByCode = (code) => {
    const normalized = normalizeInviteCode(code);
    if (!normalized) return null;
    return users.find(u => u.role === 'trainer' && normalizeInviteCode(u.inviteCode) === normalized) || null;
  };

  // The in-memory `users` array only ever holds the signed-in user plus people already
  // related to them (own doc + own clients + own trainer). A client who hasn't connected
  // to anyone yet therefore has NO trainer doc in memory, so an in-memory-only lookup can
  // never succeed — the code has to be resolved elsewhere (CLAUDE.md #34).
  //
  // "Elsewhere" was a direct Firestore query until 2026-08-27. That required `users` to be
  // readable by every signed-in account, which meant every email address on the platform
  // was too. The query now lives in the resolveInviteCode callable, which runs on the Admin
  // SDK and returns only the coach's id and name — so the rule could close to the three
  // real relationships.
  const findTrainerByCodeRemote = async (code) => {
    const normalized = normalizeInviteCode(code);
    if (!normalized) return null;
    // A trainer already in memory needs no round trip — this is the returning-student path.
    const local = findTrainerByCode(normalized);
    if (local) return local;
    const resolve = httpsCallable(functions, 'resolveInviteCode');
    const { data } = await resolve({ code: normalized });
    return data && data.found ? data.trainer : null;
  };

  // Returns { success } or { success: false, error, reason }. `reason` distinguishes a
  // genuinely wrong code from a permission/network failure so the UI can say which —
  // showing "Invalid invite code" for a dropped connection sends the client hunting for
  // a typo that isn't there.
  const connectToTrainer = async (clientId, inviteCode) => {
    const normalized = normalizeInviteCode(inviteCode);
    if (!normalized) {
      return { success: false, reason: 'invalid', error: 'Enter your coach\'s invite code' };
    }

    // One server call checks the code and sets trainerId (P2): the browser may no longer
    // write a coach's uid onto its own profile.
    let trainer;
    try {
      const { data } = await httpsCallable(functions, 'connectWithInviteCode')({ code: normalized });
      trainer = data && data.found ? data.trainer : null;
    } catch (err) {
      console.error('[connectToTrainer] connect failed', err);
      return {
        success: false,
        // The Functions SDK prefixes its error codes ('functions/permission-denied'), so a
        // bare equality check would silently report every permission failure as a network one.
        reason: isTooManyTries(err) ? 'tries' : isPermissionError(err) ? 'permission' : 'network',
        error: 'Could not check that code right now. Check your connection and try again.',
      };
    }

    if (!trainer) {
      return { success: false, reason: 'invalid', error: 'Invalid invite code' };
    }

    // The self-doc listener refreshes `users`, but patch optimistically so the UI flips
    // to the connected state immediately instead of waiting for the snapshot round-trip.
    setUsers(prev => prev.map(u => (u.id === clientId ? { ...u, trainerId: trainer.id } : u)));
    setCurrentUser(prev => (prev && prev.id === clientId ? { ...prev, trainerId: trainer.id } : prev));
    return { success: true, trainer };
  };

  // ========== Payment Provider Connection (Phase 3) ==========
  // paymentConnections is trainer-owned, low-frequency-change data (only changes
  // when the trainer explicitly connects/disconnects) — a one-off fetch on
  // demand fits better here than a permanent onSnapshot listener, so this
  // doesn't need to touch markLoaded's fixed collection count.
  const getPaymentConnection = async (trainerId) => {
    const snap = await getDoc(doc(db, 'paymentConnections', trainerId));
    return snap.exists() ? snap.data() : null;
  };

  // Owner-only: the app's error reports, most recent first (functions/clientErrors.js).
  // firestore.rules lets only the owner read them; for anyone else this rejects.
  // A single-field orderBy, which Firestore indexes automatically (#34).
  const getClientErrors = async () => {
    const snap = await getDocs(query(collection(db, 'clientErrors'), orderBy('lastSeen', 'desc'), limit(20)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  };

  // Owner-only operating numbers. The owner check lives in the Cloud Function, not here —
  // a client-side role check on a page anyone can open is decoration, not access control.
  const getPlatformStats = async () => {
    const call = httpsCallable(functions, 'getPlatformStats');
    const result = await call();
    return result.data;
  };

  // The person's explicit language choice from the Profile card. Only an explicit choice is
  // written — the browser-derived default is never persisted, because a derived value on
  // the document would look like something they picked.
  const setLanguage = async (language) => {
    if (!currentUser) return;
    await updateDoc(doc(db, 'users', currentUser.id), { language });
    setCurrentUser(prev => (prev ? { ...prev, language } : prev));
    setUsers(prev => prev.map(u => (u.id === currentUser.id ? { ...u, language } : u)));
  };

  // A client's answer to sharing their health information — body stats and the training
  // profile — with their coach (B79, Grok #27). firestore.rules hides both from the coach on
  // 'no'; healthSharingAt records when it was given.
  const setHealthSharing = async (choice) => {
    if (!currentUser || !['yes', 'no'].includes(choice)) return;
    const update = { healthSharing: choice, healthSharingAt: new Date().toISOString() };
    await updateDoc(doc(db, 'users', currentUser.id), update);
    setCurrentUser(prev => (prev ? { ...prev, ...update } : prev));
    setUsers(prev => prev.map(u => (u.id === currentUser.id ? { ...u, ...update } : u)));
  };

  // Owner-only. Marks one of Ani's own test signups as not counting towards founding
  // places, or puts it back. The event itself is never edited or deleted.
  const setSignupExcluded = async (eventId, excluded) => {
    const call = httpsCallable(functions, 'setSignupExcluded');
    return (await call({ eventId, excluded })).data;
  };

  // Owner-only. Reads every user document, so it is behind the same server-side owner
  // check and is only ever called when Ani opens the audit on purpose.
  const getAccountAudit = async () => {
    const call = httpsCallable(functions, 'getAccountAudit');
    const result = await call();
    return result.data;
  };

  // Owner-only test-account cleanup. Preview and delete are separate calls on purpose —
  // nothing is removed without the owner seeing the exact list first.
  const previewTestAccountCleanup = async () => {
    const call = httpsCallable(functions, 'previewTestAccountCleanup');
    return (await call()).data;
  };

  const deleteTestAccounts = async (expectedCount) => {
    const call = httpsCallable(functions, 'deleteTestAccounts');
    return (await call({ expectedCount })).data;
  };

  // Owner-only. Answers what the client cannot: whether an address has an account, and
  // which sign-in providers it carries. See i18n/authMessages.js for why.
  const lookupAccountByEmail = async (email) => {
    const call = httpsCallable(functions, 'lookupAccountByEmail');
    return (await call({ email })).data;
  };

  const startGcConnect = async () => {
    const start = httpsCallable(functions, 'gcOAuthStart');
    const result = await start();
    return result.data.url;
  };

  const disconnectGc = async () => {
    const disconnect = httpsCallable(functions, 'gcDisconnect');
    await disconnect();
  };

  // B36: the trainer's own GoCardless account. The two values go to the server and on to
  // Secret Manager; the result says which GoCardless (live/sandbox) accepted the token.
  // B36: has GoCardless verified the trainer's own account since they connected it?
  const refreshGcConnection = async () => {
    const call = httpsCallable(functions, 'gcRefreshConnection');
    return (await call()).data;
  };

  const connectGcDirect = async ({ accessToken, webhookSecret }) => {
    const call = httpsCallable(functions, 'gcConnectDirect');
    return (await call({ accessToken, webhookSecret })).data;
  };

  // ========== Subscriptions (Phase 3 Step 3) ==========
  // Written only by Cloud Functions (firestore.rules: allow write: if false) — the
  // client asks, the server prices and records. One-off fetches rather than a
  // listener for the same reason as getPaymentConnection: it changes only when the
  // person acts, and a listener would move markLoaded's fixed collection count.
  // A single-field query (#34), newest first sorted in JS.
  const getSubscriptions = async ({ clientId }) => {
    const snap = await getDocs(query(collection(db, 'subscriptions'), where('clientId', '==', clientId)));
    return snap.docs.map(d => d.data()).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  };

  // Returns GoCardless's hosted page URL; the caller sends the browser there.
  const startSubscription = async (tier) => {
    const call = httpsCallable(functions, 'gcStartSubscription');
    return (await call({ tier })).data;
  };

  // "Check again" for a subscription GoCardless has not confirmed yet.
  const refreshSubscription = async (subscriptionId) => {
    const call = httpsCallable(functions, 'gcRefreshSubscription');
    return (await call({ subscriptionId })).data;
  };

  // B36: stop a monthly plan (the client's own, or a coach's client's). The server cancels
  // it at GoCardless first and only then marks it cancelled.
  const cancelSubscription = async (subscriptionId) => {
    const call = httpsCallable(functions, 'gcCancelSubscription');
    return (await call({ subscriptionId })).data;
  };

  // ========== Stripe (B49) — one processor for every country ==========
  // Whether ElitePro's own Stripe is set up, and in which mode. Nothing secret comes back.
  const getStripeStatus = async () => {
    const call = httpsCallable(functions, 'stripeStatus');
    return (await call()).data;
  };

  // Owner only (the server checks): the platform key + webhook secret go straight to
  // Secret Manager. Returns { environment }.
  const saveStripeKeys = async ({ secretKey, webhookSecret }) => {
    const call = httpsCallable(functions, 'stripeSaveKeys');
    return (await call({ secretKey, webhookSecret })).data;
  };

  // Coach: Stripe's own onboarding page for their account. Returns { url }.
  const startStripeConnect = async (country) => {
    const call = httpsCallable(functions, 'stripeConnectStart');
    return (await call({ country })).data;
  };

  const refreshStripeConnection = async () => {
    const call = httpsCallable(functions, 'stripeRefreshConnection');
    return (await call()).data;
  };

  // Client: Stripe's checkout page for a plan. Returns { subscriptionId, url }.
  const startStripeSubscription = async (tier) => {
    const call = httpsCallable(functions, 'stripeStartSubscription');
    return (await call({ tier })).data;
  };

  const refreshStripeSubscription = async (subscriptionId) => {
    const call = httpsCallable(functions, 'stripeRefreshSubscription');
    return (await call({ subscriptionId })).data;
  };

  // Coach: every plan of every client, for the "payment failed" list. Single-field query (#34).
  const getTrainerSubscriptions = async (trainerId) => {
    const snap = await getDocs(query(collection(db, 'subscriptions'), where('trainerId', '==', trainerId)));
    return snap.docs.map(d => d.data());
  };

  // ========== Public booking page (B38) ==========
  // Settings and the link are written server-side (savePublicBooking), which also reserves
  // the link so no other coach can hold it. The profile listener brings the result back.
  const savePublicBooking = async (settings) => {
    const { data } = await httpsCallable(functions, 'savePublicBooking')(settings);
    return data;
  };
  // Strangers' requests for a trial session, live. It used to be read once when the dashboard
  // opened, so a request sent while the app sat open (the usual case — an installed app keeps
  // its screen) never appeared until the coach happened to reload. Not one of the collections
  // `loading` waits for: the dashboard shows without it. Returns the unsubscribe.
  const subscribeTrialRequests = (onChange, onError) => onSnapshot(
    query(collection(db, 'trialRequests'), where('trainerId', '==', firebaseUser.uid)),
    snap => onChange(snap.docs.map(d => d.data()).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))),
    err => { console.error('[trialRequests] listener failed', err); if (onError) onError(err); },
  );
  // B40: group classes the coach puts on, live, and putting one on / cancelling it. Both
  // writes are server-side: they also block or free the coach's calendar.
  const subscribeGroupClasses = (onChange, onError) => onSnapshot(
    query(collection(db, 'groupClasses'), where('trainerId', '==', firebaseUser.uid)),
    snap => onChange(snap.docs.map(d => d.data()).sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))),
    err => { console.error('[groupClasses] listener failed', err); if (onError) onError(err); },
  );
  const saveGroupClass = async (input) => (await httpsCallable(functions, 'saveGroupClass')(input)).data;
  // Returns { tell: [{ name, contact }] } — the people to let know.
  const cancelGroupClass = async (classId) => (await httpsCallable(functions, 'cancelGroupClass')({ classId })).data;
  // 'confirm' adds them as a client without the app and books the trial session; 'decline'
  // deletes the request. Either way the request is gone afterwards.
  const respondTrialRequest = async (requestId, action) => {
    const { data } = await httpsCallable(functions, 'respondTrialRequest')({ requestId, action });
    return data;
  };
  // The two the public page calls — open to visitors who are not signed in.
  const getPublicBookingPage = async (slug) => {
    const { data } = await httpsCallable(functions, 'getPublicBookingPage')({ slug });
    return data;
  };
  const requestTrialSession = async (request) => {
    await httpsCallable(functions, 'requestTrialSession')(request);
  };

  // ========== Exercises ==========
  // Merges the current trainer's (or client's own trainer's) exerciseOverrides onto the
  // base list, so every page that lists exercises via getExercises() picks up the
  // customization automatically without per-page changes.
  const getExercises = () => {
    const base = exercises.length > 0 ? exercises : defaultExercises;
    if (exerciseOverrides.length === 0) return base;
    return base.map(ex => {
      const ov = exerciseOverrides.find(o => o.exerciseId === ex.id);
      if (!ov) return ex;
      return {
        ...ex,
        videoUrl: ov.videoMode === 'hidden' ? '' : ov.videoMode === 'custom' ? ov.videoUrl : ex.videoUrl,
        instructions: ov.instructionsMode === 'hidden' ? '' : ov.instructionsMode === 'custom' ? ov.instructions : ex.instructions,
      };
    });
  };

  // Raw override doc for one exercise (for pre-filling the customize form's mode toggles —
  // getExercises() above returns the merged display value, not the mode itself)
  const getExerciseOverride = (exerciseId) => exerciseOverrides.find(o => o.exerciseId === exerciseId) || null;

  // Trainer-only: layers personal video/instructions onto one of the 22 static seed
  // exercises (which have no backing exercises doc). Doc ID is deterministic so there's
  // always at most one override per (trainer, exercise) pair.
  const upsertExerciseOverride = async (exerciseId, updates) => {
    const trainerId = currentUser.id;
    const id = `${trainerId}_${exerciseId}`;
    await setDoc(doc(db, 'exerciseOverrides', id), { ...updates, id, trainerId, exerciseId }, { merge: true });
  };

  // "Reset to default" — removes the override doc entirely rather than writing back defaults
  const deleteExerciseOverride = async (exerciseId) => {
    await deleteDoc(doc(db, 'exerciseOverrides', `${currentUser.id}_${exerciseId}`));
  };

  const addExercise = async (exercise) => {
    const trainerId = currentUser?.role === 'trainer'
      ? currentUser.id
      : (currentUser?.trainerId || currentUser?.id);
    const id = exercise.id || newId('ex');
    const newEx = { ...exercise, id, trainerId };
    await setDoc(doc(db, 'exercises', id), newEx);
    return newEx;
  };

  const updateExercise = async (exerciseId, updates) => {
    await updateDoc(doc(db, 'exercises', exerciseId), updates);
  };

  const deleteExercise = async (exerciseId) => {
    await deleteDoc(doc(db, 'exercises', exerciseId));
  };

  // ========== Templates ==========
  // ========== Invoices ==========
  const getInvoices = (trainerId) => invoices.filter(inv => inv.trainerId === trainerId);
  const addInvoice = async (invoice) => {
    const id = newId('inv');
    await setDoc(doc(db, 'invoices', id), { ...invoice, id });
  };
  const updateInvoice = async (invoiceId, updates) => {
    await updateDoc(doc(db, 'invoices', invoiceId), updates);
  };
  const deleteInvoice = async (invoiceId) => {
    await deleteDoc(doc(db, 'invoices', invoiceId));
  };

  const getTemplates = () => templates;

  const saveAsTemplate = async (plan) => {
    const template = {
      id: newId('tmpl'),
      trainerId: currentUser.id,
      name: plan.name,
      day: plan.day,
      exercises: plan.exercises,
      createdAt: localToday(),
    };
    await setDoc(doc(db, 'templates', template.id), template);
    return template;
  };

  const deleteTemplate = async (templateId) => {
    await deleteDoc(doc(db, 'templates', templateId));
  };

  // ========== Badges (milestones/utils extracted to ./badgeUtils.js) ==========
  const checkAndAwardBadges = async (clientId) => {
    const client = users.find(u => u.id === clientId);
    if (!client) return [];
    const existing = client.badges || [];
    const sessionCount = workoutLogs.filter(l => l.clientId === clientId).length + 1;
    const toAdd = getNewBadges(existing, sessionCount);
    if (toAdd.length === 0) return [];
    await updateDoc(doc(db, 'users', clientId), { badges: [...existing, ...toAdd] });
    return toAdd;
  };

  // ========== Intake Forms ==========

  const saveIntakeForm = async (clientId, data) => {
    // Also used by TrainingProfilePage to let a client revisit/edit their
    // answers anytime (not just the one-time onboarding gate) — only
    // auto-logging a body-stat entry on the client's FIRST-ever completion
    // stops every later edit from adding a duplicate weight entry with the
    // same value.
    const isFirstCompletion = !users.find(u => u.id === clientId)?.intakeCompleted;
    const userUpdates = { intakeCompleted: true };
    if (!data.skipped && data.height) userUpdates.height = Number(data.height);

    await Promise.all([
      setDoc(doc(db, 'intakeForms', clientId), {
        ...data,
        clientId,
        completedAt: localToday(),
      }),
      updateDoc(doc(db, 'users', clientId), userUpdates),
    ]);

    if (isFirstCompletion && !data.skipped && data.weight) {
      await addDoc(collection(db, 'bodyStats', clientId, 'entries'), {
        id: newId('stat'),
        date: localToday(),
        weight: Number(data.weight),
        bodyFat: 0,
        chest: 0,
        waist: 0,
        hips: 0,
        arms: 0,
        legs: 0,
      });
    }
  };

  const getIntakeForm = async (clientId) => {
    if (coachId && clientId !== coachId && !healthShared(clientId)) return null;
    const snap = await getDoc(doc(db, 'intakeForms', clientId));
    return snap.exists() ? snap.data() : null;
  };

  // ========== Studios (operator only write) ==========
  const getStudios = () => studios;
  const addStudio = async (studio) => {
    const id = newId('studio');
    await setDoc(doc(db, 'studios', id), { ...studio, id, active: true, createdAt: localToday() });
  };
  const updateStudio = async (id, updates) => {
    await updateDoc(doc(db, 'studios', id), updates);
  };

  // ========== Studio Slots ==========
  const getAvailableSlots = ({ studioId, date } = {}) => {
    return studioSlots.filter(s =>
      (!studioId || s.studioId === studioId) &&
      (!date || s.date === date)
    );
  };
  const openStudioSlots = async (studioId, studioName, date, startHour, endHour, priceHKD) => {
    const existing = studioSlots.filter(s => s.studioId === studioId && s.date === date);
    const existingTimes = new Set(existing.map(s => s.startTime));
    const batch = writeBatch(db);
    let added = 0;
    for (let h = startHour; h < endHour; h++) {
      const startTime = `${String(h).padStart(2, '0')}:00`;
      if (existingTimes.has(startTime)) continue;
      const id = `slot-${Date.now()}-${h}`;
      const endTime = `${String(h + 1).padStart(2, '0')}:00`;
      batch.set(doc(db, 'studioSlots', id), {
        id, studioId, studioName, date, startTime, endTime,
        priceHKD: priceHKD || 0, status: 'available',
        trainerId: null, bookedAt: null,
        createdAt: localToday(),
      });
      added++;
    }
    if (added > 0) await batch.commit();
    return { added, skipped: endHour - startHour - added };
  };
  const bookStudioSlot = async (slotId, trainerId) => {
    await runTransaction(db, async tx => {
      const slotRef = doc(db, 'studioSlots', slotId);
      const snap = await tx.get(slotRef);
      if (!snap.exists()) throw new Error('Slot not found');
      if (snap.data().status !== 'available') throw new Error('Slot already booked');
      tx.update(slotRef, { status: 'booked', trainerId, bookedAt: localToday() });
    });
  };
  const cancelSlotBooking = async (slotId) => {
    await updateDoc(doc(db, 'studioSlots', slotId), { status: 'available', trainerId: null, bookedAt: null });
  };
  const getMyBookedSlots = () => {
    if (!currentUser) return [];
    return studioSlots.filter(s => s.trainerId === currentUser.id);
  };

  // ========== Trainer Applications (gym啦) ==========
  const submitGymApplication = async (application) => {
    await setDoc(doc(db, 'trainerApplications', currentUser.id), {
      ...application,
      id: currentUser.id,
      trainerName: currentUser.name,
      email: currentUser.email,
      status: 'pending',
      appliedAt: localToday(),
      reviewedAt: null,
      reviewNote: null,
    });
    await updateDoc(doc(db, 'users', currentUser.id), { gymlaStatus: 'pending' });
  };
  const getMyGymApplication = () => gymApplications.find(a => a.id === currentUser?.id) || null;
  const getGymApplications = () => gymApplications;
  const reviewGymApplication = async (id, status, note) => {
    await updateDoc(doc(db, 'trainerApplications', id), {
      status, reviewNote: note || null, reviewedAt: localToday(),
    });
    await updateDoc(doc(db, 'users', id), { gymlaStatus: status });
  };

  // Derived: Firebase auth user exists but no Firestore profile yet
  const needsProfile = firebaseUser && !loading && !users.find(u => u.id === firebaseUser?.uid);

  const value = {
    currentUser, logout, loading, dataError,
    firebaseUser, needsProfile, authReady: firebaseUser !== undefined && redirectChecked,
    signingIn,
    googleAuthError, clearGoogleAuthError: () => setGoogleAuthError(null),
    signInWithGoogle, signUpEmail, signInEmail, sendPasswordReset, completeProfile,
    deleteAccount,
    getClients, getClient, updateClient, addManagedClient, removeClient, getCreditLedger, getTrainerCreditLedger, addCreditLedgerEntry,
    getBodyStats, addBodyStat, updateBodyStat, deleteBodyStat,
    data: { users, workoutPlans, workoutLogs, schedule, messages, exercises, invoices },
    getWorkoutPlans, addWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan,
    getWorkoutLogs, addWorkoutLog, updateWorkoutLog,
    getSchedule, getTrainerBusySlots, refreshTrainerBusySlots, addScheduleItem, updateScheduleItem, deleteScheduleItem,
    scheduleSince, extendScheduleTo, watchClientHistory, historyComplete, historyStart,
    getMessages, sendMessage, getUnreadCount, markMessagesRead,
    getSessionStats,
    getPersonalRecords,
    getExercises, addExercise, updateExercise, deleteExercise, muscleGroups, equipmentTypes,
    getExerciseOverride, upsertExerciseOverride, deleteExerciseOverride,
    getInvoices, addInvoice, updateInvoice, deleteInvoice,
    getTemplates, saveAsTemplate, deleteTemplate,
    getInviteCode, connectToTrainer, findTrainerByCodeRemote,
    getPaymentConnection, startGcConnect, disconnectGc, connectGcDirect, refreshGcConnection, getClientErrors, getSubscriptions, startSubscription, refreshSubscription, cancelSubscription, getTrainerSubscriptions,
    getStripeStatus, saveStripeKeys, startStripeConnect, refreshStripeConnection, startStripeSubscription, refreshStripeSubscription, getPlatformStats, getAccountAudit, previewTestAccountCleanup, deleteTestAccounts, lookupAccountByEmail, setSignupExcluded,
    setLanguage,
    savePublicBooking, subscribeTrialRequests, respondTrialRequest, subscribeGroupClasses, saveGroupClass, cancelGroupClass, getPublicBookingPage, requestTrialSession,
    checkAndAwardBadges,
    saveIntakeForm, getIntakeForm, setHealthSharing, healthShared,
    getStudios, addStudio, updateStudio,
    getAvailableSlots, openStudioSlots, bookStudioSlot, cancelSlotBooking, getMyBookedSlots,
    submitGymApplication, getMyGymApplication, getGymApplications, reviewGymApplication,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext);
