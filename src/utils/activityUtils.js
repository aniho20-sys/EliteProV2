// A client's activity dates: any day they logged a workout OR had a completed session.
// Shared by "This Week" stats and the trainer-side active-clients summary so both agree
// on what counts as "the client did something".
export function getClientActivityDates(clientId, { getWorkoutLogs, getSchedule }) {
  const logDates = getWorkoutLogs(clientId).map(l => l.date);
  const sessionDates = getSchedule({ clientId }).filter(s => s.status === 'completed').map(s => s.date);
  return [...new Set([...logDates, ...sessionDates])];
}

// Most recent activity (log or completed session, whichever is later) as days-since + a label
// of what it was. Never compute "last active"/"inactive" from workoutLogs alone — a client who
// trains via booked sessions but rarely logs workouts is still active, not churning.
export function getLastActivity(clientId, { getWorkoutLogs, getSchedule, plans, today }) {
  const latestLog = getWorkoutLogs(clientId).sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const latestSession = getSchedule({ clientId })
    .filter(s => s.status === 'completed')
    .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
  const logMs = latestLog ? new Date(latestLog.date).getTime() : null;
  const sessionMs = latestSession ? new Date(latestSession.date).getTime() : null;
  const lastActivityMs = logMs !== null && sessionMs !== null ? Math.max(logMs, sessionMs) : (logMs ?? sessionMs);
  if (lastActivityMs === null) return { daysSince: null, label: null };
  const daysSince = Math.floor((new Date(today).getTime() - lastActivityMs) / 86400000);
  const fromSession = sessionMs !== null && sessionMs >= (logMs ?? -Infinity);
  const label = fromSession
    ? (latestSession.type || 'Session')
    : (plans?.find(p => p.id === latestLog.planId)?.name || latestLog.workoutName || 'Workout');
  return { daysSince, label };
}
