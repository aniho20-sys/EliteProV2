import { db } from '../firebase';
import { writeBatch, doc, collection } from 'firebase/firestore';
import { sampleBodyStats, sampleWorkoutPlans, sampleWorkoutLogs, sampleSchedule, sampleMessages } from '../data/sampleData';

export async function seedDemoDataForCoach(trainerUid) {
  const batch = writeBatch(db);

  const c1 = `${trainerUid}-c1`;
  const c2 = `${trainerUid}-c2`;
  const c3 = `${trainerUid}-c3`;
  const idMap = { 'client-1': c1, 'client-2': c2, 'client-3': c3, 'trainer-1': trainerUid };

  batch.set(doc(db, 'users', c1), {
    id: c1, name: 'David Chan', email: 'david@demo.local', role: 'client',
    trainerId: trainerUid, age: 28, height: 175,
    goals: 'Build muscle, improve strength',
    notes: 'Previous shoulder injury - avoid heavy overhead pressing',
    joinDate: '2026-01-15', isDemo: true, totalSessions: 20,
  });
  batch.set(doc(db, 'users', c2), {
    id: c2, name: 'Sarah Wong', email: 'sarah@demo.local', role: 'client',
    trainerId: trainerUid, age: 32, height: 163,
    goals: 'Fat loss, toning', notes: 'Beginner - focus on form',
    joinDate: '2026-02-01', isDemo: true, totalSessions: 6,
  });
  batch.set(doc(db, 'users', c3), {
    id: c3, name: 'Michael Lee', email: 'michael@demo.local', role: 'client',
    trainerId: trainerUid, age: 24, height: 180,
    goals: 'Powerlifting competition prep',
    notes: 'Advanced lifter, targets: S:200kg B:140kg D:240kg',
    joinDate: '2026-02-20', isDemo: true, totalSessions: 15,
  });

  Object.entries(sampleBodyStats).forEach(([origId, entries]) => {
    const cid = idMap[origId];
    if (cid) entries.forEach(entry =>
      batch.set(doc(collection(db, 'bodyStats', cid, 'entries')), entry)
    );
  });

  sampleWorkoutPlans.forEach((p, i) => {
    const newId = `${trainerUid}-plan-${i + 1}`;
    batch.set(doc(db, 'workoutPlans', newId), { ...p, id: newId, trainerId: trainerUid, clientId: idMap[p.clientId] || p.clientId });
  });

  sampleWorkoutLogs.forEach((l, i) => {
    const newId = `${trainerUid}-log-${i + 1}`;
    batch.set(doc(db, 'workoutLogs', newId), { ...l, id: newId, clientId: idMap[l.clientId] || l.clientId, trainerId: trainerUid });
  });

  sampleSchedule.forEach((s, i) => {
    const newId = `${trainerUid}-sched-${i + 1}`;
    batch.set(doc(db, 'schedule', newId), { ...s, id: newId, trainerId: trainerUid, clientId: idMap[s.clientId] || s.clientId });
  });

  sampleMessages.forEach((m, i) => {
    const newId = `${trainerUid}-msg-${i + 1}`;
    batch.set(doc(db, 'messages', newId), { ...m, id: newId, from: idMap[m.from] || m.from, to: idMap[m.to] || m.to });
  });

  await batch.commit();
}
