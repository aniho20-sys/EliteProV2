// Sample data for demo purposes
export const sampleTrainer = {
  id: 'trainer-1',
  name: 'Coach Alex',
  email: 'coach@elitepro.com',
  password: 'demo123',
  role: 'trainer',
  speciality: 'Strength & Conditioning',
  avatar: null,
};

export const sampleClients = [
  {
    id: 'client-1',
    name: 'David Chan',
    email: 'david@example.com',
    password: 'demo123',
    role: 'client',
    trainerId: 'trainer-1',
    age: 28,
    height: 175,
    goals: 'Build muscle, improve strength',
    notes: 'Previous shoulder injury - avoid heavy overhead pressing',
    joinDate: '2026-01-15',
  },
  {
    id: 'client-2',
    name: 'Sarah Wong',
    email: 'sarah@example.com',
    password: 'demo123',
    role: 'client',
    trainerId: 'trainer-1',
    age: 32,
    height: 163,
    goals: 'Fat loss, toning',
    notes: 'Beginner - focus on form',
    joinDate: '2026-02-01',
  },
  {
    id: 'client-3',
    name: 'Michael Lee',
    email: 'michael@example.com',
    password: 'demo123',
    role: 'client',
    trainerId: 'trainer-1',
    age: 24,
    height: 180,
    goals: 'Powerlifting competition prep',
    notes: 'Advanced lifter, targets: S:200kg B:140kg D:240kg',
    joinDate: '2026-02-20',
  },
];

export const sampleBodyStats = {
  'client-1': [
    { date: '2026-01-15', weight: 72, bodyFat: 18, chest: 95, waist: 82, hips: 94, arms: 34, legs: 55 },
    { date: '2026-02-01', weight: 73.5, bodyFat: 17.2, chest: 96, waist: 81, hips: 94, arms: 34.5, legs: 55.5 },
    { date: '2026-02-15', weight: 74, bodyFat: 16.5, chest: 97, waist: 80.5, hips: 93.5, arms: 35, legs: 56 },
    { date: '2026-03-01', weight: 74.5, bodyFat: 16, chest: 98, waist: 80, hips: 93, arms: 35.5, legs: 56.5 },
    { date: '2026-03-15', weight: 75, bodyFat: 15.5, chest: 99, waist: 79.5, hips: 92.5, arms: 36, legs: 57 },
  ],
  'client-2': [
    { date: '2026-02-01', weight: 65, bodyFat: 28, chest: 88, waist: 74, hips: 102, arms: 27, legs: 52 },
    { date: '2026-02-15', weight: 64, bodyFat: 27, chest: 87, waist: 73, hips: 101, arms: 27, legs: 52 },
    { date: '2026-03-01', weight: 63, bodyFat: 25.5, chest: 87, waist: 71.5, hips: 99.5, arms: 27, legs: 51.5 },
    { date: '2026-03-15', weight: 62, bodyFat: 24, chest: 86.5, waist: 70, hips: 98, arms: 27.5, legs: 51 },
  ],
  'client-3': [
    { date: '2026-02-20', weight: 95, bodyFat: 14, chest: 112, waist: 88, hips: 100, arms: 40, legs: 65 },
    { date: '2026-03-05', weight: 96, bodyFat: 13.5, chest: 113, waist: 88, hips: 101, arms: 40.5, legs: 65.5 },
    { date: '2026-03-20', weight: 97, bodyFat: 13, chest: 114, waist: 87.5, hips: 101.5, arms: 41, legs: 66 },
  ],
};

export const sampleWorkoutPlans = [
  {
    id: 'plan-1',
    name: 'Upper Body A',
    trainerId: 'trainer-1',
    clientId: 'client-1',
    day: 'Monday',
    exercises: [
      { exerciseId: 'bench-press', sets: [{ weight: 70, reps: '10' }, { weight: 75, reps: '9' }, { weight: 75, reps: '8' }, { weight: 70, reps: '10' }], notes: 'Controlled tempo' },
      { exerciseId: 'barbell-row', sets: [{ weight: 55, reps: '10' }, { weight: 60, reps: '10' }, { weight: 60, reps: '8' }, { weight: 55, reps: '10' }], notes: '' },
      { exerciseId: 'overhead-press', sets: [{ weight: 25, reps: '12' }, { weight: 30, reps: '10' }, { weight: 30, reps: '10' }], notes: 'Light weight due to shoulder' },
      { exerciseId: 'lat-pulldown', sets: [{ weight: 45, reps: '12' }, { weight: 50, reps: '10' }, { weight: 50, reps: '10' }], notes: '' },
      { exerciseId: 'barbell-curl', sets: [{ weight: 20, reps: '12' }, { weight: 25, reps: '12' }, { weight: 25, reps: '10' }], notes: '' },
      { exerciseId: 'tricep-pushdown', sets: [{ weight: 18, reps: '12' }, { weight: 20, reps: '12' }, { weight: 20, reps: '10' }], notes: '' },
    ],
  },
  {
    id: 'plan-2',
    name: 'Lower Body A',
    trainerId: 'trainer-1',
    clientId: 'client-1',
    day: 'Wednesday',
    exercises: [
      { exerciseId: 'squat', sets: [{ weight: 90, reps: '8' }, { weight: 100, reps: '7' }, { weight: 105, reps: '6' }, { weight: 100, reps: '8' }], notes: 'Focus on depth' },
      { exerciseId: 'romanian-deadlift', sets: [{ weight: 70, reps: '12' }, { weight: 80, reps: '10' }, { weight: 80, reps: '10' }], notes: '' },
      { exerciseId: 'leg-press', sets: [{ weight: 100, reps: '15' }, { weight: 120, reps: '12' }, { weight: 120, reps: '12' }], notes: '' },
      { exerciseId: 'leg-curl', sets: [{ weight: 35, reps: '12' }, { weight: 40, reps: '12' }, { weight: 40, reps: '10' }], notes: '' },
      { exerciseId: 'calf-raise', sets: [{ weight: 50, reps: '20' }, { weight: 60, reps: '18' }, { weight: 60, reps: '15' }, { weight: 55, reps: '15' }], notes: '' },
      { exerciseId: 'plank', sets: [{ weight: 0, reps: '60s' }, { weight: 0, reps: '60s' }, { weight: 0, reps: '45s' }], notes: '' },
    ],
  },
  {
    id: 'plan-3',
    name: 'Full Body - Fat Loss',
    trainerId: 'trainer-1',
    clientId: 'client-2',
    day: 'Tuesday',
    exercises: [
      { exerciseId: 'squat', sets: [{ weight: 14, reps: '15' }, { weight: 16, reps: '12' }, { weight: 16, reps: '12' }], notes: 'Goblet squat OK' },
      { exerciseId: 'push-up', sets: [{ weight: 0, reps: '12' }, { weight: 0, reps: '10' }, { weight: 0, reps: '10' }], notes: 'Knees if needed' },
      { exerciseId: 'lat-pulldown', sets: [{ weight: 30, reps: '12' }, { weight: 35, reps: '12' }, { weight: 35, reps: '10' }], notes: '' },
      { exerciseId: 'lunge', sets: [{ weight: 8, reps: '12 each' }, { weight: 10, reps: '12 each' }, { weight: 10, reps: '10 each' }], notes: '' },
      { exerciseId: 'plank', sets: [{ weight: 0, reps: '45s' }, { weight: 0, reps: '30s' }, { weight: 0, reps: '30s' }], notes: '' },
      { exerciseId: 'cable-crunch', sets: [{ weight: 15, reps: '15' }, { weight: 20, reps: '15' }, { weight: 20, reps: '12' }], notes: '' },
    ],
  },
];

export const sampleWorkoutLogs = [
  {
    id: 'log-1',
    clientId: 'client-1',
    planId: 'plan-1',
    date: '2026-03-30',
    completed: true,
    entries: [
      { exerciseId: 'bench-press', sets: [{ weight: 70, reps: 10 }, { weight: 75, reps: 9 }, { weight: 75, reps: 8 }, { weight: 70, reps: 10 }] },
      { exerciseId: 'barbell-row', sets: [{ weight: 60, reps: 10 }, { weight: 65, reps: 9 }, { weight: 65, reps: 8 }, { weight: 60, reps: 10 }] },
      { exerciseId: 'overhead-press', sets: [{ weight: 30, reps: 12 }, { weight: 30, reps: 11 }, { weight: 30, reps: 10 }] },
    ],
    rpe: 7,
    notes: 'Felt good today, bench PR attempt next week',
  },
  {
    id: 'log-2',
    clientId: 'client-1',
    planId: 'plan-2',
    date: '2026-04-01',
    completed: true,
    entries: [
      { exerciseId: 'squat', sets: [{ weight: 100, reps: 8 }, { weight: 105, reps: 7 }, { weight: 105, reps: 6 }, { weight: 100, reps: 8 }] },
      { exerciseId: 'romanian-deadlift', sets: [{ weight: 80, reps: 12 }, { weight: 80, reps: 11 }, { weight: 80, reps: 10 }] },
    ],
    rpe: 8,
    notes: 'Legs were tired, good session overall',
  },
];

export const sampleSchedule = [
  { id: 'sched-1', trainerId: 'trainer-1', clientId: 'client-1', date: '2026-03-10', time: '09:00', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 'sched-2', trainerId: 'trainer-1', clientId: 'client-2', date: '2026-03-10', time: '10:30', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 'sched-3', trainerId: 'trainer-1', clientId: 'client-1', date: '2026-03-17', time: '09:00', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 'sched-4', trainerId: 'trainer-1', clientId: 'client-2', date: '2026-03-17', time: '10:30', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 'sched-5', trainerId: 'trainer-1', clientId: 'client-3', date: '2026-03-20', time: '14:00', duration: 60, type: 'Competition Prep', status: 'completed' },
  { id: 'sched-6', trainerId: 'trainer-1', clientId: 'client-1', date: '2026-03-24', time: '09:00', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 'sched-7', trainerId: 'trainer-1', clientId: 'client-3', date: '2026-03-27', time: '14:00', duration: 60, type: 'Competition Prep', status: 'completed' },
  { id: 'sched-8', trainerId: 'trainer-1', clientId: 'client-1', date: '2026-03-31', time: '09:00', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 'sched-9', trainerId: 'trainer-1', clientId: 'client-2', date: '2026-03-31', time: '10:30', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 'sched-10', trainerId: 'trainer-1', clientId: 'client-3', date: '2026-04-03', time: '14:00', duration: 60, type: 'Competition Prep', status: 'completed' },
  { id: 'sched-11', trainerId: 'trainer-1', clientId: 'client-1', date: '2026-04-07', time: '09:00', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 'sched-12', trainerId: 'trainer-1', clientId: 'client-2', date: '2026-04-07', time: '10:30', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 'sched-13', trainerId: 'trainer-1', clientId: 'client-1', date: '2026-04-14', time: '09:00', duration: 60, type: 'PT Session', status: 'completed' },
  { id: 'sched-14', trainerId: 'trainer-1', clientId: 'client-3', date: '2026-04-14', time: '14:00', duration: 60, type: 'Competition Prep', status: 'completed' },
  { id: 'sched-15', trainerId: 'trainer-1', clientId: 'client-1', date: '2026-04-21', time: '09:00', duration: 60, type: 'PT Session', status: 'confirmed' },
  { id: 'sched-16', trainerId: 'trainer-1', clientId: 'client-2', date: '2026-04-21', time: '10:30', duration: 60, type: 'PT Session', status: 'pending' },
  { id: 'sched-17', trainerId: 'trainer-1', clientId: 'client-3', date: '2026-04-24', time: '14:00', duration: 60, type: 'Competition Prep', status: 'pending' },
];

export const sampleMessages = [
  { id: 'msg-1', from: 'client-1', to: 'trainer-1', text: 'Coach, 我今日膊頭有少少痛，聽日仲做唔做 overhead press?', timestamp: '2026-04-01T18:30:00', read: true },
  { id: 'msg-2', from: 'trainer-1', to: 'client-1', text: '如果痛嘅話就唔好做住，我會改成 lateral raise 同 face pull 代替。記住做完 warmup 先開始。', timestamp: '2026-04-01T18:45:00', read: true },
  { id: 'msg-3', from: 'client-2', to: 'trainer-1', text: 'Hi Coach! 今個禮拜飲食跟得好好，已經連續兩星期無食宵夜 💪', timestamp: '2026-04-01T20:00:00', read: false },
  { id: 'msg-4', from: 'client-3', to: 'trainer-1', text: '教練，比賽日期確認咗係5月15號，可以開始 peak 嗎？', timestamp: '2026-04-02T08:00:00', read: false },
];
