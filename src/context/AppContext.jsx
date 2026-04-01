import { createContext, useContext, useState, useEffect } from 'react';
import { sampleTrainer, sampleClients, sampleBodyStats, sampleWorkoutPlans, sampleWorkoutLogs, sampleSchedule, sampleMessages } from '../data/sampleData';
import { exerciseLibrary as defaultExercises, muscleGroups, equipmentTypes } from '../data/exercises';

const AppContext = createContext();

const STORAGE_KEY = 'elitepro_data';

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return null;
}

function getInitialData() {
  const saved = loadData();
  if (saved) return saved;
  return {
    users: [sampleTrainer, ...sampleClients],
    bodyStats: sampleBodyStats,
    workoutPlans: sampleWorkoutPlans,
    workoutLogs: sampleWorkoutLogs,
    schedule: sampleSchedule,
    messages: sampleMessages,
    exercises: defaultExercises,
  };
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState(getInitialData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const login = (email, password) => {
    const user = data.users.find(u => u.email === email && u.password === password);
    if (user) {
      setCurrentUser(user);
      return { success: true, user };
    }
    return { success: false, error: 'Invalid email or password' };
  };

  const logout = () => setCurrentUser(null);

  const getClients = (trainerId) => data.users.filter(u => u.role === 'client' && u.trainerId === trainerId);

  const getClient = (clientId) => data.users.find(u => u.id === clientId);

  const addClient = (client) => {
    const newClient = { ...client, id: `client-${Date.now()}`, role: 'client', joinDate: new Date().toISOString().split('T')[0] };
    setData(prev => ({ ...prev, users: [...prev.users, newClient] }));
    return newClient;
  };

  const updateClient = (clientId, updates) => {
    setData(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === clientId ? { ...u, ...updates } : u),
    }));
  };

  const getBodyStats = (clientId) => data.bodyStats[clientId] || [];

  const addBodyStat = (clientId, stat) => {
    setData(prev => ({
      ...prev,
      bodyStats: {
        ...prev.bodyStats,
        [clientId]: [...(prev.bodyStats[clientId] || []), { ...stat, date: stat.date || new Date().toISOString().split('T')[0] }],
      },
    }));
  };

  const getWorkoutPlans = (filter) => {
    return data.workoutPlans.filter(p => {
      if (filter.clientId && p.clientId !== filter.clientId) return false;
      if (filter.trainerId && p.trainerId !== filter.trainerId) return false;
      return true;
    });
  };

  const addWorkoutPlan = (plan) => {
    const newPlan = { ...plan, id: `plan-${Date.now()}` };
    setData(prev => ({ ...prev, workoutPlans: [...prev.workoutPlans, newPlan] }));
    return newPlan;
  };

  const updateWorkoutPlan = (planId, updates) => {
    setData(prev => ({
      ...prev,
      workoutPlans: prev.workoutPlans.map(p => p.id === planId ? { ...p, ...updates } : p),
    }));
  };

  const deleteWorkoutPlan = (planId) => {
    setData(prev => ({
      ...prev,
      workoutPlans: prev.workoutPlans.filter(p => p.id !== planId),
    }));
  };

  const getWorkoutLogs = (clientId) => (data.workoutLogs || []).filter(l => l.clientId === clientId);

  const addWorkoutLog = (log) => {
    const newLog = { ...log, id: `log-${Date.now()}` };
    setData(prev => ({ ...prev, workoutLogs: [...(prev.workoutLogs || []), newLog] }));
    return newLog;
  };

  const getSchedule = (filter) => {
    return data.schedule.filter(s => {
      if (filter.trainerId && s.trainerId !== filter.trainerId) return false;
      if (filter.clientId && s.clientId !== filter.clientId) return false;
      if (filter.date && s.date !== filter.date) return false;
      return true;
    });
  };

  const addScheduleItem = (item) => {
    const newItem = { ...item, id: `sched-${Date.now()}`, status: 'pending' };
    setData(prev => ({ ...prev, schedule: [...prev.schedule, newItem] }));
    return newItem;
  };

  const updateScheduleItem = (itemId, updates) => {
    setData(prev => ({
      ...prev,
      schedule: prev.schedule.map(s => s.id === itemId ? { ...s, ...updates } : s),
    }));
  };

  const getMessages = (userId) => data.messages.filter(m => m.from === userId || m.to === userId);

  const sendMessage = (from, to, text) => {
    const msg = { id: `msg-${Date.now()}`, from, to, text, timestamp: new Date().toISOString(), read: false };
    setData(prev => ({ ...prev, messages: [...prev.messages, msg] }));
    return msg;
  };

  const getUnreadCount = (userId) => data.messages.filter(m => m.to === userId && !m.read).length;

  const markMessagesRead = (userId, otherUserId) => {
    setData(prev => ({
      ...prev,
      messages: prev.messages.map(m =>
        m.to === userId && m.from === otherUserId ? { ...m, read: true } : m
      ),
    }));
  };

  const getPersonalRecords = (clientId) => {
    const logs = (data.workoutLogs || []).filter(l => l.clientId === clientId);
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

  const getExercises = () => data.exercises || defaultExercises;

  const addExercise = (exercise) => {
    const newEx = { ...exercise, id: `ex-${Date.now()}` };
    setData(prev => ({ ...prev, exercises: [...(prev.exercises || defaultExercises), newEx] }));
    return newEx;
  };

  const updateExercise = (exerciseId, updates) => {
    setData(prev => ({
      ...prev,
      exercises: (prev.exercises || defaultExercises).map(e => e.id === exerciseId ? { ...e, ...updates } : e),
    }));
  };

  const deleteExercise = (exerciseId) => {
    setData(prev => ({
      ...prev,
      exercises: (prev.exercises || defaultExercises).filter(e => e.id !== exerciseId),
    }));
  };

  const resetData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setData(getInitialData());
    setCurrentUser(null);
  };

  const value = {
    currentUser, login, logout,
    getClients, getClient, addClient, updateClient,
    getBodyStats, addBodyStat,
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
