import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, getDocs,
} from 'firebase/firestore';
import {
  onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult,
  GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import {
  sampleBodyStats, sampleWorkoutPlans, sampleWorkoutLogs,
  sampleSchedule, sampleMessages,
} from '../data/sampleData';
import { exerciseLibrary as defaultExercises, muscleGroups, equipmentTypes } from '../data/exercises';

const AppContext = createContext();
const googleProvider = new GoogleAuthProvider();

// Demo account emails — used to trigger auto-seed of sample data
const DEMO_COACH_EMAIL = 'coach@elitepro.com';

// Generate a short 6-char invite code
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function AppProvider({ children }) {
  // --- Individual collection states ---
  const [users, setUsers] = useState([]);
  const [bodyStatsMap, setBodyStatsMap] = useState({});
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [workoutLogs, setWorkoutLogs] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [messages, setMessages] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  // Firebase Auth state: undefined = checking, null = no user, object = authenticated
  const [firebaseUser, setFirebaseUser] = useState(undefined);

  const loadedRef = useRef(new Set());

  const markLoaded = useCallback((name) => {
    loadedRef.current.add(name);
    if (loadedRef.current.size >= 7) setLoading(false);
  }, []);

  // --- Firebase Auth listener + redirect result ---
  useEffect(() => {
    getRedirectResult(auth).catch(() => { /* no redirect pending */ });
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user || null);
      if (!user) setCurrentUser(null);
    });
    return unsub;
  }, []);

  // --- Set up real-time Firestore listeners (only when authed) ---
  useEffect(() => {
    if (!firebaseUser) {
      // Not authed: reset state and mark as non-loading
      setUsers([]); setBodyStatsMap({}); setWorkoutPlans([]);
      setWorkoutLogs([]); setSchedule([]); setMessages([]); setExercises([]);
      loadedRef.current = new Set();
      setLoading(false);
      return;
    }

    setLoading(true);
    loadedRef.current = new Set();
    const unsubs = [];

    unsubs.push(onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('users');
    }, () => markLoaded('users')));

    unsubs.push(onSnapshot(collection(db, 'bodyStats'), (snap) => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data().entries || []; });
      setBodyStatsMap(map);
      markLoaded('bodyStats');
    }, () => markLoaded('bodyStats')));

    unsubs.push(onSnapshot(collection(db, 'workoutPlans'), (snap) => {
      setWorkoutPlans(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('workoutPlans');
    }, () => markLoaded('workoutPlans')));

    unsubs.push(onSnapshot(collection(db, 'workoutLogs'), (snap) => {
      setWorkoutLogs(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('workoutLogs');
    }, () => markLoaded('workoutLogs')));

    unsubs.push(onSnapshot(collection(db, 'schedule'), (snap) => {
      setSchedule(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('schedule');
    }, () => markLoaded('schedule')));

    unsubs.push(onSnapshot(collection(db, 'messages'), (snap) => {
      setMessages(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('messages');
    }, () => markLoaded('messages')));

    unsubs.push(onSnapshot(collection(db, 'exercises'), (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setExercises(list.length > 0 ? list : defaultExercises);
      markLoaded('exercises');
    }, () => markLoaded('exercises')));

    return () => unsubs.forEach(fn => fn());
  }, [firebaseUser, markLoaded]);

  // --- Sync currentUser when users list or firebaseUser changes ---
  useEffect(() => {
    if (!firebaseUser) return;
    const profile = users.find(u => u.id === firebaseUser.uid);
    if (profile) setCurrentUser(profile);
  }, [users, firebaseUser]);

  // Backward-compatible data object
  const data = { users, bodyStats: bodyStatsMap, workoutPlans, workoutLogs, schedule, messages, exercises };

  // ========== Seeding demo data for the coach ==========
  // Creates ghost clients + plans/stats/logs/schedule/messages scoped to trainerUid
  const seedDemoDataForCoach = async (trainerUid) => {
    const batch = writeBatch(db);

    // Generate stable ghost client IDs tied to the trainer
    const c1 = `${trainerUid}-c1`;
    const c2 = `${trainerUid}-c2`;
    const c3 = `${trainerUid}-c3`;
    const idMap = { 'client-1': c1, 'client-2': c2, 'client-3': c3, 'trainer-1': trainerUid };

    // Ghost clients
    batch.set(doc(db, 'users', c1), {
      id: c1, name: 'David Chan', email: 'david@demo.local', role: 'client',
      trainerId: trainerUid, age: 28, height: 175,
      goals: 'Build muscle, improve strength',
      notes: 'Previous shoulder injury - avoid heavy overhead pressing',
      joinDate: '2026-01-15', isDemo: true,
    });
    batch.set(doc(db, 'users', c2), {
      id: c2, name: 'Sarah Wong', email: 'sarah@demo.local', role: 'client',
      trainerId: trainerUid, age: 32, height: 163,
      goals: 'Fat loss, toning', notes: 'Beginner - focus on form',
      joinDate: '2026-02-01', isDemo: true,
    });
    batch.set(doc(db, 'users', c3), {
      id: c3, name: 'Michael Lee', email: 'michael@demo.local', role: 'client',
      trainerId: trainerUid, age: 24, height: 180,
      goals: 'Powerlifting competition prep',
      notes: 'Advanced lifter, targets: S:200kg B:140kg D:240kg',
      joinDate: '2026-02-20', isDemo: true,
    });

    // Body stats — doc id = clientId
    Object.entries(sampleBodyStats).forEach(([origId, entries]) => {
      const cid = idMap[origId];
      if (cid) batch.set(doc(db, 'bodyStats', cid), { entries });
    });

    // Workout plans
    sampleWorkoutPlans.forEach((p, i) => {
      const newId = `${trainerUid}-plan-${i + 1}`;
      batch.set(doc(db, 'workoutPlans', newId), {
        ...p, id: newId,
        trainerId: trainerUid,
        clientId: idMap[p.clientId] || p.clientId,
      });
    });

    // Workout logs
    sampleWorkoutLogs.forEach((l, i) => {
      const newId = `${trainerUid}-log-${i + 1}`;
      batch.set(doc(db, 'workoutLogs', newId), {
        ...l, id: newId,
        clientId: idMap[l.clientId] || l.clientId,
      });
    });

    // Schedule
    sampleSchedule.forEach((s, i) => {
      const newId = `${trainerUid}-sched-${i + 1}`;
      batch.set(doc(db, 'schedule', newId), {
        ...s, id: newId,
        trainerId: trainerUid,
        clientId: idMap[s.clientId] || s.clientId,
      });
    });

    // Messages
    sampleMessages.forEach((m, i) => {
      const newId = `${trainerUid}-msg-${i + 1}`;
      batch.set(doc(db, 'messages', newId), {
        ...m, id: newId,
        from: idMap[m.from] || m.from,
        to: idMap[m.to] || m.to,
      });
    });

    await batch.commit();
  };

  // Seed global exercise library (idempotent — only if empty)
  const seedExercisesIfEmpty = async () => {
    try {
      const snap = await getDocs(collection(db, 'exercises'));
      if (!snap.empty) return;
      const batch = writeBatch(db);
      defaultExercises.forEach(e => batch.set(doc(db, 'exercises', e.id), e));
      await batch.commit();
    } catch (err) {
      console.warn('Exercise seed skipped:', err.message);
    }
  };

  // ========== Auth ==========

  // Firebase Auth: Google Sign-In (popup + redirect fallback)
  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (err) {
      if (err.code === 'auth/popup-blocked' ||
          err.code === 'auth/popup-closed-by-user' ||
          err.message?.includes('storage-partitioned') ||
          err.message?.includes('missing initial state')) {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw err;
    }
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
      // Step 1: create trainer profile so rules isTrainer() succeeds
      const profile = {
        id: fbUser.uid,
        name: 'Coach Alex',
        email: DEMO_COACH_EMAIL,
        role: 'trainer',
        speciality: 'Strength & Conditioning',
        avatar: null,
        joinDate: new Date().toISOString().split('T')[0],
        inviteCode: generateInviteCode(),
        isDemo: true,
      };
      await setDoc(doc(db, 'users', fbUser.uid), profile);
      // Step 2: seed ghost clients + plans + logs
      await seedDemoDataForCoach(fbUser.uid);
      // Step 3: seed exercise library if empty
      await seedExercisesIfEmpty();
    }
  };

  // Complete profile for real Firebase Auth users → creates Firestore doc
  const completeProfile = async (role, name, inviteCode) => {
    if (!firebaseUser) return;
    let trainerId = null;
    if (role === 'client' && inviteCode) {
      const trainer = findTrainerByCode(inviteCode);
      if (trainer) trainerId = trainer.id;
    }
    const profile = {
      id: firebaseUser.uid,
      name: name || firebaseUser.displayName || 'User',
      email: firebaseUser.email || '',
      role,
      avatar: firebaseUser.photoURL || null,
      joinDate: new Date().toISOString().split('T')[0],
      ...(role === 'client'
        ? { trainerId, goals: '', age: '', height: '' }
        : { speciality: '', inviteCode: generateInviteCode() }
      ),
    };
    await setDoc(doc(db, 'users', profile.id), profile);
    // Seed exercise library on first trainer sign-up
    if (role === 'trainer') await seedExercisesIfEmpty();
    setCurrentUser(profile);
    return profile;
  };

  const logout = async () => {
    try { await signOut(auth); } catch { /* ignore */ }
    setCurrentUser(null);
    setFirebaseUser(null);
  };

  // ========== Users / Clients ==========
  const getClients = (trainerId) => users.filter(u => u.role === 'client' && u.trainerId === trainerId);
  const getClient = (clientId) => users.find(u => u.id === clientId);

  const updateClient = async (clientId, updates) => {
    await updateDoc(doc(db, 'users', clientId), updates);
  };

  // ========== Body Stats ==========
  const getBodyStats = (clientId) => bodyStatsMap[clientId] || [];

  const addBodyStat = async (clientId, stat) => {
    const entry = { ...stat, date: stat.date || new Date().toISOString().split('T')[0] };
    const current = bodyStatsMap[clientId] || [];
    await setDoc(doc(db, 'bodyStats', clientId), { entries: [...current, entry] });
  };

  const deleteBodyStat = async (clientId, index) => {
    const current = bodyStatsMap[clientId] || [];
    const updated = current.filter((_, i) => i !== index);
    await setDoc(doc(db, 'bodyStats', clientId), { entries: updated });
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
    const newLog = { ...log, id: `log-${Date.now()}`, clientId: currentUser?.id || log.clientId };
    await setDoc(doc(db, 'workoutLogs', newLog.id), newLog);
    return newLog;
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

  const addScheduleItem = async (item) => {
    const newItem = { ...item, id: `sched-${Date.now()}`, status: item.status || 'pending' };
    await setDoc(doc(db, 'schedule', newItem.id), newItem);
    return newItem;
  };

  const updateScheduleItem = async (itemId, updates) => {
    await updateDoc(doc(db, 'schedule', itemId), updates);
  };

  // ========== Messages ==========
  const getMessages = (userId) => messages.filter(m => m.from === userId || m.to === userId);

  const sendMessage = async (from, to, text) => {
    const msg = { id: `msg-${Date.now()}`, from, to, text, timestamp: new Date().toISOString(), read: false };
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
    const newEx = { ...exercise, id: `ex-${Date.now()}` };
    await setDoc(doc(db, 'exercises', newEx.id), newEx);
    return newEx;
  };

  const updateExercise = async (exerciseId, updates) => {
    await updateDoc(doc(db, 'exercises', exerciseId), updates);
  };

  const deleteExercise = async (exerciseId) => {
    await deleteDoc(doc(db, 'exercises', exerciseId));
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
    workoutLogs.filter(l => l.id.startsWith(`${uid}-`)).forEach(l => {
      // Can't delete logs per rules; skip
    });
    schedule.filter(s => s.trainerId === uid).forEach(s => batch.delete(doc(db, 'schedule', s.id)));
    messages.filter(m => m.id.startsWith(`${uid}-`)).forEach(m => {
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
    currentUser, logout, loading,
    firebaseUser, needsProfile, authReady: firebaseUser !== undefined,
    signInWithGoogle, signUpEmail, signInEmail, sendPasswordReset, completeProfile,
    loginDemoCoach,
    getClients, getClient, updateClient,
    getBodyStats, addBodyStat, deleteBodyStat,
    getWorkoutPlans, addWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan,
    getWorkoutLogs, addWorkoutLog,
    getSchedule, addScheduleItem, updateScheduleItem,
    getMessages, sendMessage, getUnreadCount, markMessagesRead,
    getPersonalRecords,
    getExercises, addExercise, updateExercise, deleteExercise, muscleGroups, equipmentTypes,
    getInviteCode, findTrainerByCode, connectToTrainer,
    resetData, data,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
