import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../firebase';
import {
  collection, doc, addDoc, getDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, getDocs, query, where, or, orderBy, runTransaction,
} from 'firebase/firestore';
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult,
  GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut, deleteUser,
} from 'firebase/auth';
import { exerciseLibrary as defaultExercises, muscleGroups, equipmentTypes } from '../data/exercises';
import { localToday } from '../utils/dateUtils';
import { canonicalExercise } from '../utils/exerciseUtils';
import { getNewBadges } from './badgeUtils';

const AppContext = createContext();
const googleProvider = new GoogleAuthProvider();

// Generate a short 6-char invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1
  const arr = new Uint8Array(6);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => chars[n % chars.length]).join('');
}

export function AppProvider({ children }) {
  // --- Individual collection states ---
  const [users, setUsers] = useState([]);
  const [bodyStatsMap, setBodyStatsMap] = useState({});
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [trainerSchedule, setTrainerSchedule] = useState([]);
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
      setWorkoutLogs([]); setSchedule([]); setTrainerSchedule([]); setMessages([]); setExercises([]); setExerciseOverrides([]); setTemplates([]);
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

    // Auto-retry on transient Firestore errors (network hiccup, WebSocket drop).
    // Silently re-subscribes up to 2 times before showing the error banner.
    const onErr = (name) => () => {
      markLoaded(name);
      if (retryCountRef.current < 2) {
        retryCountRef.current += 1;
        setTimeout(() => setListenerEpoch(e => e + 1), 2000);
      } else {
        setDataError('Failed to load data. Check your connection and refresh.');
      }
    };

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
          // Keep own doc only; replace every client doc with the fresh snapshot
          const ownDoc = prev.filter(u => u.id === uid);
          return [...ownDoc, ...clientDocs];
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

    unsubs.push(onSnapshot(query(collection(db, 'workoutLogs'), or(where('clientId', '==', uid), where('trainerId', '==', uid))), (snap) => {
      setWorkoutLogs(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('workoutLogs');
    }, onErr('workoutLogs')));

    unsubs.push(onSnapshot(query(collection(db, 'schedule'), or(where('trainerId', '==', uid), where('clientId', '==', uid))), (snap) => {
      setSchedule(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('schedule');
    }, onErr('schedule')));

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
  }, [firebaseUser, markLoaded, listenerEpoch]);

  // --- Exercises: role-aware listener (trainer sees own; client sees trainer's) ---
  useEffect(() => {
    if (!currentUser?.id) return;
    const targetTrainerId = currentUser.role === 'trainer' ? currentUser.id : currentUser.trainerId;
    if (!targetTrainerId) return; // getExercises() falls back to defaultExercises while exercises is empty
    const unsub = onSnapshot(
      query(collection(db, 'exercises'), where('trainerId', '==', targetTrainerId)),
      (snap) => setExercises([...snap.docs.map(d => ({ ...d.data(), id: d.id })), ...defaultExercises]),
      () => setExercises(defaultExercises),
    );
    return () => unsub();
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

  // --- Trainer schedule for clients: load trainer's full schedule so clients see real availability ---
  useEffect(() => {
    if (!currentUser?.id || currentUser.role !== 'client' || !currentUser.trainerId) return;
    const unsub = onSnapshot(
      query(collection(db, 'schedule'), where('trainerId', '==', currentUser.trainerId)),
      (snap) => setTrainerSchedule(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      () => {},
    );
    return () => unsub();
  }, [currentUser?.id, currentUser?.trainerId, currentUser?.role]);

  // --- Body Stats: per-client subcollection listeners (reactive on users list) ---
  useEffect(() => {
    if (!currentUser?.id) return;
    const clientIds = currentUser.role === 'trainer'
      ? users.filter(u => u.trainerId === currentUser.id).map(u => u.id)
      : [currentUser.id];
    if (clientIds.length === 0) return;
    const unsubs = clientIds.map(cid =>
      onSnapshot(
        query(collection(db, 'bodyStats', cid, 'entries'), orderBy('date', 'asc')),
        (snap) => setBodyStatsMap(prev => ({ ...prev, [cid]: snap.docs.map(d => ({ ...d.data(), id: d.id })) })),
        () => {},
      )
    );
    return () => unsubs.forEach(u => u());
  }, [currentUser?.id, currentUser?.role, currentUser?.trainerId, users]);

  // --- Sync currentUser when users list or firebaseUser changes ---
  useEffect(() => {
    if (!firebaseUser) return;
    const profile = users.find(u => u.id === firebaseUser.uid);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (profile) setCurrentUser(profile);
  }, [users, firebaseUser]);

// ========== Auth ==========

  // Firebase Auth: Google Sign-In
  // Always attempt popup first on all platforms (desktop, mobile, PWA).
  // On iOS PWA, signInWithRedirect opens Google in external Safari; when Google
  // redirects back to the app URL, iOS opens it in Safari rather than the PWA,
  // so getRedirectResult in the PWA never fires — the user appears stuck at LoginPage.
  // Popup keeps the OAuth flow within the original browsing context and avoids this.
  const signInWithGoogle = () => {
    setSigningIn(true);
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
  const completeProfile = async (role, name, inviteCode) => {
    if (!firebaseUser) return;
    let trainerId = null;
    if (role === 'client' && inviteCode) {
      // Try in-memory first, fall back to Firestore query (users may not be loaded yet)
      let trainer = findTrainerByCode(inviteCode);
      if (!trainer) {
        const snap = await getDocs(collection(db, 'users'));
        const allUsers = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        trainer = allUsers.find(u => u.role === 'trainer' && u.inviteCode === inviteCode.toUpperCase()) || null;
      }
      if (trainer) trainerId = trainer.id;
    }
    const profile = {
      id: firebaseUser.uid,
      name: name || firebaseUser.displayName || 'User',
      email: firebaseUser.email || '',
      role,
      avatar: firebaseUser.photoURL || null,
      joinDate: localToday(),
      ...(role === 'client'
        ? { trainerId, goals: '', age: '', height: '' }
        : { speciality: '', inviteCode: generateInviteCode() }
      ),
    };
    await setDoc(doc(db, 'users', profile.id), profile);
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

  // Removes client from trainer's roster by clearing trainerId.
  // Cannot delete user docs per Firestore rules — orphan instead.
  const removeClient = async (clientId) => {
    await updateDoc(doc(db, 'users', clientId), { trainerId: null });
  };

  // ========== Credit Ledger ==========
  // Append-only top-up history (fetched on demand — no realtime listener needed).
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
    });
  };

  // ========== Body Stats ==========
  const getBodyStats = (clientId) => bodyStatsMap[clientId] || [];

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
    const newPlan = { ...plan, id: `plan-${Date.now()}`, trainerId: currentUser?.id || plan.trainerId };
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
      id: `log-${Date.now()}`,
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
  const getSchedule = (filter) => {
    return schedule.filter(s => {
      if (filter.trainerId && s.trainerId !== filter.trainerId) return false;
      if (filter.clientId && s.clientId !== filter.clientId) return false;
      if (filter.date && s.date !== filter.date) return false;
      return true;
    });
  };

  // Returns the trainer's full schedule (for clients to check real availability)
  const getTrainerSchedule = () => trainerSchedule;

  const addScheduleItem = async (item) => {
    const newItem = { ...item, id: `sched-${Date.now()}`, status: item.status || 'pending' };
    await setDoc(doc(db, 'schedule', newItem.id), newItem);
    return newItem;
  };

  const updateScheduleItem = async (itemId, updates) => {
    await updateDoc(doc(db, 'schedule', itemId), updates);
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

    const msg = { id: `msg-${now}`, from, to, text: trimmed, timestamp: new Date().toISOString(), read: false };
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
  const getInviteCode = async (trainerId) => {
    const trainer = users.find(u => u.id === trainerId && u.role === 'trainer');
    if (!trainer) return null;
    if (trainer.inviteCode) return trainer.inviteCode;
    const code = generateInviteCode();
    await updateDoc(doc(db, 'users', trainerId), { inviteCode: code });
    return code;
  };

  const findTrainerByCode = (code) => {
    if (!code) return null;
    return users.find(u => u.role === 'trainer' && u.inviteCode === code.toUpperCase()) || null;
  };

  const connectToTrainer = async (clientId, inviteCode) => {
    const trainer = findTrainerByCode(inviteCode);
    if (!trainer) return { success: false, error: 'Invalid invite code' };
    await updateDoc(doc(db, 'users', clientId), { trainerId: trainer.id });
    return { success: true, trainer };
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
    const id = exercise.id || `ex-${Date.now()}`;
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
    const id = `inv-${Date.now()}`;
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
      id: `tmpl-${Date.now()}`,
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

    if (!data.skipped && data.weight) {
      await addDoc(collection(db, 'bodyStats', clientId, 'entries'), {
        id: `stat-${Date.now()}`,
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
    const snap = await getDoc(doc(db, 'intakeForms', clientId));
    return snap.exists() ? snap.data() : null;
  };

  // ========== Studios (operator only write) ==========
  const getStudios = () => studios;
  const addStudio = async (studio) => {
    const id = `studio-${Date.now()}`;
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
    getClients, getClient, updateClient, removeClient, getCreditLedger, addCreditLedgerEntry,
    getBodyStats, addBodyStat, updateBodyStat, deleteBodyStat,
    data: { users, workoutPlans, workoutLogs, schedule, messages, exercises, invoices },
    getWorkoutPlans, addWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan,
    getWorkoutLogs, addWorkoutLog, updateWorkoutLog,
    getSchedule, getTrainerSchedule, addScheduleItem, updateScheduleItem, deleteScheduleItem,
    getMessages, sendMessage, getUnreadCount, markMessagesRead,
    getSessionStats,
    getPersonalRecords,
    getExercises, addExercise, updateExercise, deleteExercise, muscleGroups, equipmentTypes,
    getExerciseOverride, upsertExerciseOverride, deleteExerciseOverride,
    getInvoices, addInvoice, updateInvoice, deleteInvoice,
    getTemplates, saveAsTemplate, deleteTemplate,
    getInviteCode, connectToTrainer,
    checkAndAwardBadges,
    saveIntakeForm, getIntakeForm,
    getStudios, addStudio, updateStudio,
    getAvailableSlots, openStudioSlots, bookStudioSlot, cancelSlotBooking, getMyBookedSlots,
    submitGymApplication, getMyGymApplication, getGymApplications, reviewGymApplication,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext);
