import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db, auth } from '../firebase';
import {
  collection, doc, setDoc, updateDoc, deleteDoc,
  onSnapshot, writeBatch, getDocs,
} from 'firebase/firestore';
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { sampleTrainer, sampleClients, sampleBodyStats, sampleWorkoutPlans, sampleWorkoutLogs, sampleSchedule, sampleMessages } from '../data/sampleData';
import { exerciseLibrary as defaultExercises, muscleGroups, equipmentTypes } from '../data/exercises';

const AppContext = createContext();
const SESSION_KEY = 'elitepro_session';
const googleProvider = new GoogleAuthProvider();

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

  // Track which collections have loaded their first snapshot
  const loadedRef = useRef(new Set());
  const seedingRef = useRef(false);

  // Pending session restore (wait for users to load from Firestore)
  const [pendingSessionId, setPendingSessionId] = useState(() => {
    try { return localStorage.getItem(SESSION_KEY); } catch { return null; }
  });

  // Mark a collection as loaded; when all 7 are loaded, set loading=false
  const markLoaded = useCallback((name) => {
    loadedRef.current.add(name);
    if (loadedRef.current.size >= 7) {
      setLoading(false);
    }
  }, []);

  // --- Firebase Auth listener ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user || null);
    });
    return unsub;
  }, []);

  // --- Seed sample data into Firestore (first-time only) ---
  const seedData = useCallback(async () => {
    if (seedingRef.current) return;
    seedingRef.current = true;

    try {
      const batch = writeBatch(db);

      // Users
      const allUsers = [sampleTrainer, ...sampleClients];
      allUsers.forEach(u => batch.set(doc(db, 'users', u.id), u));

      // Body stats — one doc per client, entries stored as array
      Object.entries(sampleBodyStats).forEach(([clientId, entries]) => {
        batch.set(doc(db, 'bodyStats', clientId), { entries });
      });

      // Workout plans
      sampleWorkoutPlans.forEach(p => batch.set(doc(db, 'workoutPlans', p.id), p));

      // Workout logs
      sampleWorkoutLogs.forEach(l => batch.set(doc(db, 'workoutLogs', l.id), l));

      // Schedule
      sampleSchedule.forEach(s => batch.set(doc(db, 'schedule', s.id), s));

      // Messages
      sampleMessages.forEach(m => batch.set(doc(db, 'messages', m.id), m));

      // Exercises
      defaultExercises.forEach(e => batch.set(doc(db, 'exercises', e.id), e));

      await batch.commit();
    } catch (err) {
      console.error('Failed to seed data:', err);
    }
  }, []);

  // --- Set up real-time Firestore listeners ---
  useEffect(() => {
    const unsubs = [];

    // 1. Users
    unsubs.push(onSnapshot(collection(db, 'users'), (snap) => {
      if (snap.empty && !seedingRef.current) {
        seedData();
        return;
      }
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setUsers(list);
      markLoaded('users');
    }));

    // 2. Body stats
    unsubs.push(onSnapshot(collection(db, 'bodyStats'), (snap) => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data().entries || []; });
      setBodyStatsMap(map);
      markLoaded('bodyStats');
    }));

    // 3. Workout plans
    unsubs.push(onSnapshot(collection(db, 'workoutPlans'), (snap) => {
      setWorkoutPlans(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('workoutPlans');
    }));

    // 4. Workout logs
    unsubs.push(onSnapshot(collection(db, 'workoutLogs'), (snap) => {
      setWorkoutLogs(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('workoutLogs');
    }));

    // 5. Schedule
    unsubs.push(onSnapshot(collection(db, 'schedule'), (snap) => {
      setSchedule(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('schedule');
    }));

    // 6. Messages
    unsubs.push(onSnapshot(collection(db, 'messages'), (snap) => {
      setMessages(snap.docs.map(d => ({ ...d.data(), id: d.id })));
      markLoaded('messages');
    }));

    // 7. Exercises
    unsubs.push(onSnapshot(collection(db, 'exercises'), (snap) => {
      const list = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setExercises(list.length > 0 ? list : defaultExercises);
      markLoaded('exercises');
    }));

    return () => unsubs.forEach(fn => fn());
  }, [seedData, markLoaded]);

  // --- Restore session when users load ---
  useEffect(() => {
    if (currentUser || users.length === 0) return;
    // Try Firebase Auth user first
    if (firebaseUser) {
      const profile = users.find(u => u.id === firebaseUser.uid);
      if (profile) setCurrentUser(profile);
      return;
    }
    // Fallback: demo session from localStorage
    if (pendingSessionId) {
      const user = users.find(u => u.id === pendingSessionId);
      if (user) setCurrentUser(user);
      setPendingSessionId(null); // Clear after use to prevent re-login after logout
    }
  }, [users, pendingSessionId, currentUser, firebaseUser]);

  // --- Keep currentUser in sync when user data changes ---
  useEffect(() => {
    if (currentUser) {
      const updated = users.find(u => u.id === currentUser.id);
      if (updated && (updated.name !== currentUser.name || updated.email !== currentUser.email)) {
        setCurrentUser(updated);
      }
    }
  }, [users, currentUser]);

  // --- Save / clear session ---
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, currentUser.id);
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  // --- Backward-compatible data object ---
  const data = { users, bodyStats: bodyStatsMap, workoutPlans, workoutLogs, schedule, messages, exercises };

  // ========== Auth ==========
  // Demo login (email/password against Firestore users)
  const login = (email, password) => {
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return { success: true, user };
    }
    return { success: false, error: 'Invalid email or password' };
  };

  // Firebase Auth: Google Sign-In
  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  };

  // Firebase Auth: Email/Password Sign Up
  const signUpEmail = async (email, password) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  // Firebase Auth: Email/Password Sign In
  const signInEmail = async (email, password) => {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  // Complete profile for new Firebase Auth users → creates Firestore doc
  const completeProfile = async (role, name, trainerId) => {
    if (!firebaseUser) return;
    const profile = {
      id: firebaseUser.uid,
      name: name || firebaseUser.displayName || 'User',
      email: firebaseUser.email || '',
      role,
      avatar: firebaseUser.photoURL || null,
      joinDate: new Date().toISOString().split('T')[0],
      ...(role === 'client' ? { trainerId: trainerId || null, goals: '', age: '', height: '' } : { speciality: '' }),
    };
    await setDoc(doc(db, 'users', profile.id), profile);
    setCurrentUser(profile);
    return profile;
  };

  const logout = async () => {
    try { await signOut(auth); } catch { /* ignore */ }
    setCurrentUser(null);
    setFirebaseUser(null);
    setPendingSessionId(null);
  };

  // ========== Users / Clients ==========
  const getClients = (trainerId) => users.filter(u => u.role === 'client' && u.trainerId === trainerId);
  const getClient = (clientId) => users.find(u => u.id === clientId);

  const addClient = async (client) => {
    const newClient = { ...client, id: `client-${Date.now()}`, role: 'client', joinDate: new Date().toISOString().split('T')[0] };
    await setDoc(doc(db, 'users', newClient.id), newClient);
    return newClient;
  };

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
    const newPlan = { ...plan, id: `plan-${Date.now()}` };
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
    const newLog = { ...log, id: `log-${Date.now()}` };
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
    const newItem = { ...item, id: `sched-${Date.now()}`, status: 'pending' };
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

  // ========== Reset ==========
  const resetData = async () => {
    // Delete all documents in every collection
    const collections = ['users', 'bodyStats', 'workoutPlans', 'workoutLogs', 'schedule', 'messages', 'exercises'];
    for (const col of collections) {
      const snap = await getDocs(collection(db, col));
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    try { await signOut(auth); } catch { /* ignore */ }
    setCurrentUser(null);
    setFirebaseUser(null);
    localStorage.removeItem(SESSION_KEY);
    // Re-seed
    seedingRef.current = false;
    await seedData();
  };

  // Derived: Firebase auth user exists but no Firestore profile yet
  const needsProfile = firebaseUser && !loading && !users.find(u => u.id === firebaseUser?.uid);

  const value = {
    currentUser, login, logout, loading,
    firebaseUser, needsProfile, authReady: firebaseUser !== undefined,
    signInWithGoogle, signUpEmail, signInEmail, completeProfile,
    getClients, getClient, addClient, updateClient,
    getBodyStats, addBodyStat, deleteBodyStat,
    getWorkoutPlans, addWorkoutPlan, updateWorkoutPlan, deleteWorkoutPlan,
    getWorkoutLogs, addWorkoutLog,
    getSchedule, addScheduleItem, updateScheduleItem,
    getMessages, sendMessage, getUnreadCount, markMessagesRead,
    getPersonalRecords,
    getExercises, addExercise, updateExercise, deleteExercise, muscleGroups, equipmentTypes,
    resetData, data,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export const useApp = () => useContext(AppContext);
