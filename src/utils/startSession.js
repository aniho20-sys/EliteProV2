// "Start session" (Ani 2026-10-11): from a booked session on the coach's dashboard straight
// into logging that client's workout. Before, it was Client → Workout logs tab → Log session
// → pick a plan: four or five taps with the client waiting at the rack.
//
// The plan is picked for the coach only when there is nothing to choose — exactly one plan.
// With several, guessing today's would log the session into the wrong plan without anyone
// noticing (#35), so the log page opens on its plan picker instead: one more tap.
// A workout already half-logged for this client is never replaced: the log page restores
// it, and an auto-started plan would start over on top of it.

// The key WorkoutLogPage keeps a client's in-progress workout under.
export const logDraftKey = (clientId) => `elitepro_active_log_${clientId}`;

export function hasLogDraft(clientId) {
  try {
    const raw = localStorage.getItem(logDraftKey(clientId));
    return !!(raw && JSON.parse(raw).entries?.length);
  } catch {
    return false;
  }
}

// The navigation state WorkoutLogPage reads (location.state): who, and maybe which plan.
export function startSessionState(client, clientPlans, { hasDraft = false } = {}) {
  const state = { clientId: client.id, clientName: client.name };
  if (!hasDraft && clientPlans.length === 1) state.planId = clientPlans[0].id;
  return state;
}

// A session the coach can start: today's, not finished, cancelled or a blocked-out hour.
export const canStartSession = (session) =>
  !!session && !session.isBlocked && session.status !== 'completed' && session.status !== 'cancelled';
