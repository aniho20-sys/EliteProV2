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
      { exerciseId: 'bench-press', sets: 4, reps: '8-10', weights: [70, 75, 75, 70], notes: 'Controlled tempo' },
      { exerciseId: 'barbell-row', sets: 4, reps: '8-10', weights: [55, 60, 60, 55], notes: '' },
      { exerciseId: 'overhead-press', sets: 3, reps: '10-12', weights: [25, 30, 30], notes: 'Light weight due to shoulder' },
      { exerciseId: 'lat-pulldown', sets: 3, reps: '10-12', weights: [45, 50, 50], notes: '' },
      { exerciseId: 'barbell-curl', sets: 3, reps: '12', weights: [20, 25, 25], notes: '' },
      { exerciseId: 'tricep-pushdown', sets: 3, reps: '12', weights: [18, 20, 20], notes: '' },
    ],
  },
  {
    id: 'plan-2',
    name: 'Lower Body A',
    trainerId: 'trainer-1',
    clientId: 'client-1',
    day: 'Wednesday',
    exercises: [
      { exerciseId: 'squat', sets: 4, reps: '6-8', weights: [90, 100, 105, 100], notes: 'Focus on depth' },
      { exerciseId: 'romanian-deadlift', sets: 3, reps: '10-12', weights: [70, 80, 80], notes: '' },
      { exerciseId: 'leg-press', sets: 3, reps: '12-15', weights: [100, 120, 120], notes: '' },
      { exerciseId: 'leg-curl', sets: 3, reps: '12', weights: [35, 40, 40], notes: '' },
      { exerciseId: 'calf-raise', sets: 4, reps: '15-20', weights: [50, 60, 60, 55], notes: '' },
      { exerciseId: 'plank', sets: 3, reps: '60s', weights: [0, 0, 0], notes: '' },
    ],
  },
  {
    id: 'plan-3',
    name: 'Full Body - Fat Loss',
    trainerId: 'trainer-1',
    clientId: 'client-2',
    day: 'Tuesday',
    exercises: [
      { exerciseId: 'squat', sets: 3, reps: '12-15', weights: [14, 16, 16], notes: 'Goblet squat OK' },
      { exerciseId: 'push-up', sets: 3, reps: '10-12', weights: [0, 0, 0], notes: 'Knees if needed' },
      { exerciseId: 'lat-pulldown', sets: 3, reps: '12', weights: [30, 35, 35], notes: '' },
      { exerciseId: 'lunge', sets: 3, reps: '12 each', weights: [8, 10, 10], notes: '' },
      { exerciseId: 'plank', sets: 3, reps: '30-45s', weights: [0, 0, 0], notes: '' },
      { exerciseId: 'cable-crunch', sets: 3, reps: '15', weights: [15, 20, 20], notes: '' },
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
  { id: 'sched-1', trainerId: 'trainer-1', clientId: 'client-1', date: '2026-04-03', time: '09:00', duration: 60, type: 'PT Session', status: 'confirmed' },
  { id: 'sched-2', trainerId: 'trainer-1', clientId: 'client-2', date: '2026-04-03', time: '10:30', duration: 60, type: 'PT Session', status: 'confirmed' },
  { id: 'sched-3', trainerId: 'trainer-1', clientId: 'client-3', date: '2026-04-04', time: '14:00', duration: 90, type: 'Competition Prep', status: 'pending' },
  { id: 'sched-4', trainerId: 'trainer-1', clientId: 'client-1', date: '2026-04-07', time: '09:00', duration: 60, type: 'PT Session', status: 'confirmed' },
  { id: 'sched-5', trainerId: 'trainer-1', clientId: 'client-2', date: '2026-04-07', time: '10:30', duration: 60, type: 'PT Session', status: 'pending' },
];

export const sampleMessages = [
  { id: 'msg-1', from: 'client-1', to: 'trainer-1', text: 'Coach, 我今日膊頭有少少痛，聽日仲做唔做 overhead press?', timestamp: '2026-04-01T18:30:00', read: true },
  { id: 'msg-2', from: 'trainer-1', to: 'client-1', text: '如果痛嘅話就唔好做住，我會改成 lateral raise 同 face pull 代替。記住做完 warmup 先開始。', timestamp: '2026-04-01T18:45:00', read: true },
  { id: 'msg-3', from: 'client-2', to: 'trainer-1', text: 'Hi Coach! 今個禮拜飲食跟得好好，已經連續兩星期無食宵夜 💪', timestamp: '2026-04-01T20:00:00', read: false },
  { id: 'msg-4', from: 'client-3', to: 'trainer-1', text: '教練，比賽日期確認咗係5月15號，可以開始 peak 嗎？', timestamp: '2026-04-02T08:00:00', read: false },
];
