import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../firebase';
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, getDocs, query, where, or, orderBy,
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
import { seedDemoDataForCoach } from './demoSeed';
import { getNewBadges } from './badgeUtils';

const AppContext = createContext();
const googleProvider = new GoogleAuthProvider();

// Demo account emails — used to trigger auto-seed of sample data
const DEMO_COACH_EMAIL = 'coach@elitepro.com';

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
  const [templates, setTemplates] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataError, setDataError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  // Firebase Auth state: undefined = checking, null = no user, object = authenticated
  const [firebaseUser, setFirebaseUser] = useState(undefined);
  const [googleAuthError, setGoogleAuthError] = useState(null);
  // Redirect result must be checked before declaring auth ready, to prevent
  // a flash of the login page when returning from Google OAuth redirect.
  const [redirectChecked, setRedirectChecked] = useState(false);

  const loadedRef = useRef(new Set());

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
      setWorkoutLogs([]); setSchedule([]); setTrainerSchedule([]); setMessages([]); setExercises([]); setTemplates([]);
      loadedRef.current = new Set();
      setLoading(false);
      return;
    }

    setLoading(true);
    setDataError(null);
    loadedRef.current = new Set();
    const unsubs = [];
    const uid = firebaseUser.uid;

    const onErr = (name) => () => { setDataError('Failed to load data. Check your connection and refresh.'); markLoaded(name); };

    unsubs.push(onSnapshot(
      query(collection(db, 'users'), or(where('id', '==', uid), where('trainerId', '==', uid))),
      (snap) => { setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id }))); markLoaded('users'); },
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
  }, [firebaseUser, markLoaded]);

  // --- Exercises: role-aware listener (trainer sees own; client sees trainer's) ---
  useEffect(() => {
    if (!currentUser) return;
    const targetTrainerId = currentUser.role === 'trainer' ? currentUser.id : currentUser.trainerId;
    if (!targetTrainerId) { setExercises(defaultExercises); return; }
    const unsub = onSnapshot(
      query(collection(db, 'exercises'), where('trainerId', '==', targetTrainerId)),
      (snap) => setExercises([...snap.docs.map(d => ({ ...d.data(), id: d.id })), ...defaultExercises]),
      () => setExercises(defaultExercises),
    );
    return () => unsub();
  }, [currentUser?.id]);

  // --- Templates: trainer-only reusable plan blueprints ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'trainer') return;
    const unsub = onSnapshot(
      query(collection(db, 'templates'), where('trainerId', '==', currentUser.id)),
      (snap) => setTemplates(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      () => {},
    );
    return () => unsub();
  }, [currentUser?.id, currentUser?.role]);

  // --- Trainer profile for clients: load trainer doc so ProfilePage can show trainer name/inviteCode ---
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'client' || !currentUser.trainerId) return;
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
    if (!currentUser || currentUser.role !== 'client' || !currentUser.trainerId) return;
    const unsub = onSnapshot(
      query(collection(db, 'schedule'), where('trainerId', '==', currentUser.trainerId)),
      (snap) => setTrainerSchedule(snap.docs.map(d => ({ ...d.data(), id: d.id }))),
      () => {},
    );
    return () => unsub();
  }, [currentUser?.id, currentUser?.trainerId]);

  // --- Body Stats: per-client subcollection listeners (reactive on users list) ---
  useEffect(() => {
    if (!currentUser) return;
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

  // seedDemoDataForCoach extracted to ./demoSeed.js

// ========== Auth ==========

  // Firebase Auth: Google Sign-In
  // Always attempt popup first on all platforms (desktop, mobile, PWA).
  // On iOS PWA, signInWithRedirect opens Google in external Safari; when Google
  // redirects back to the app URL, iOS opens it in Safari rather than the PWA,
  // so getRedirectResult in the PWA never fires — the user appears stuck at LoginPage.
  // Popup keeps the OAuth flow within the original browsing context and avoids this.
  const signInWithGoogle = () => {
    return signInWithPopup(auth, googleProvider).catch((err) => {
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/internal-error') {
        // Popup blocked by browser — fall back to redirect as last resort.
        signInWithRedirect(auth, googleProvider);
      } else if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setGoogleAuthError(err);
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

  // Demo login: uses Firebase Auth under the hood.
  // If the demo Auth account doesn't exist yet, sign-up and auto-seed.
  const loginDemoCoach = async () => {
    let firstTime = false;
    try {
      await signInEmail(DEMO_COACH_EMAIL, 'demo123');
    } catch (err) {
      if (err.code === 'auth/user-not-found' ||
          err.code === 'auth/invalid-credential' ||
          err.code === 'auth/invalid-login-credentials') {
        await signUpEmail(DEMO_COACH_EMAIL, 'demo123');
        firstTime = true;
      } else {
        throw err;
      }
    }
    if (firstTime) {
      const fbUser = auth.currentUser;
      if (!fbUser) throw new Error('Demo signup failed — no current user');
      const profile = {
        id: fbUser.uid,
        name: 'Coach Alex',
        email: DEMO_COACH_EMAIL,
        role: 'trainer',
        speciality: 'Strength & Conditioning',
        avatar: null,
        joinDate: localToday(),
        inviteCode: generateInviteCode(),
        isDemo: true,
      };
      await setDoc(doc(db, 'users', fbUser.uid), profile);
      try {
        await seedDemoDataForCoach(fbUser.uid);
      } catch (err) {
        console.warn('Demo seed partial failure:', err.message);
      }
    }
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

    // 2. If trainer, orphan ghost clients (clear trainerId so they're not "owned")
    if (currentUser.role === 'trainer') {
      const ghosts = users.filter(u => u.isDemo && u.trainerId === uid);
      for (const g of ghosts) {
        try { await updateDoc(doc(db, 'users', g.id), { trainerId: null }); } catch { /* ignore */ }
      }
    }

    // 3. Delete Firestore user profile
    await deleteDoc(doc(db, 'users', uid));

    // 4. Delete Firebase Auth account (may fail if login is too old → caller handles)
    await deleteUser(fbUser);

    // 5. Local cleanup
    setCurrentUser(null);
    setFirebaseUser(null);
  };

  // ========== Users / Clients ==========
  const getClients = (trainerId) => users.filter(u => u.role === 'client' && u.trainerId === trainerId);
  const getClient = (clientId) => users.find(u => u.id === clientId);

  const updateClient = async (clientId, updates) => {
    await updateDoc(doc(db, 'users', clientId), updates);
  };

  // Removes client from trainer's roster by clearing trainerId.
  // Cannot delete user docs per Firestore rules — orphan instead.
  const removeClient = async (clientId) => {
    await updateDoc(doc(db, 'users', clientId), { trainerId: null });
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
    const prs = {};
    logs.forEach(log => {
      (log.entries || []).forEach(entry => {
        const maxWeight = Math.max(...entry.sets.map(s => Number(s.weight) || 0));
        if (maxWeight > 0) {
          if (!prs[entry.exerciseId] || maxWeight > prs[entry.exerciseId].weight) {
            prs[entry.exerciseId] = { weight: maxWeight, date: log.date };
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
  const getExercises = () => exercises.length > 0 ? exercises : defaultExercises;

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
  const getBadges = (clientId) => (users.find(u => u.id === clientId)?.badges || []);

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

  // ========== Reset (demo only) ==========
  // Wipes only the current user's demo-scoped data, then re-seeds
  const resetData = async () => {
    if (!currentUser?.isDemo || currentUser.role !== 'trainer') {
      throw new Error('Reset is only available for demo accounts');
    }
    const uid = currentUser.id;
    const batch = writeBatch(db);
    // Delete ghost clients (users whose trainerId == uid and isDemo)
    users.filter(u => u.isDemo && u.trainerId === uid).forEach(u => {
      // Rules disallow user delete — we'll orphan them by clearing trainerId instead
      batch.update(doc(db, 'users', u.id), { trainerId: null });
    });
    // Delete plans/logs/schedule/messages created for this trainer
    workoutPlans.filter(p => p.trainerId === uid).forEach(p => batch.delete(doc(db, 'workoutPlans', p.id)));
    workoutLogs.filter(l => l.id.startsWith(`${uid}-`)).forEach(() => {
      // Can't delete logs per rules; skip
    });
    schedule.filter(s => s.trainerId === uid).forEach(s => batch.delete(doc(db, 'schedule', s.id)));
    messages.filter(m => m.id.startsWith(`${uid}-`)).forEach(() => {
      // Can't delete messages per rules; skip
    });
    try {
      await batch.commit();
    } catch (err) {
      console.warn('Partial reset:', err.message);
    }
    // Re-seed
    await seedDemoDataForCoach(uid);
  };

  // Derived: Firebase auth user exists but no Firestore profile yet
  const needsProfile = firebaseUser && !loading && !users.find(u => u.id === firebaseUser?.uid);

  const value = {
    currentUser, logout, loading, dataError,
    firebaseUser, needsProfile, authReady: firebaseUser !== undefined && redirectChecked,
    googleAuthError, clearGoogleAuthError: () => setGoogleAuthError(null),
    signInWithGoogle, signUpEmail, signInEmail, sendPasswordReset, completeProfile,
    loginDemoCoach, deleteAccount,
    getClients, getClient, updateClient, removeClient,
    getBodyStats, addBodyStat, updateBodyStat, deleteBodyStat,
    getWorkoutPlans, addWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan,
    getWorkoutLogs, addWorkoutLog, updateWorkoutLog,
    getSchedule, getTrainerSchedule, addScheduleItem, updateScheduleItem, deleteScheduleItem,
    getMessages, sendMessage, getUnreadCount, markMessagesRead,
    getSessionStats,
    getPersonalRecords,
    getExercises, addExercise, updateExercise, deleteExercise, muscleGroups, equipmentTypes,
    getInvoices, addInvoice, updateInvoice, deleteInvoice,
    getTemplates, saveAsTemplate, deleteTemplate,
    getInviteCode, findTrainerByCode, connectToTrainer,
    getBadges, checkAndAwardBadges,
    resetData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => useContext(AppContext);
