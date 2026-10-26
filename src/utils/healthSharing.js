import { hasAppAccount } from './managedClient';

// Whether a client has still to answer if their coach may see their health information —
// body stats and the training profile, injuries included (B79, Grok #27, Ani 2026-10-26).
// Asked once per coach: connecting to a different coach clears the answer on the server
// (functions/inviteCodes.js). A client without the app is never asked.
export function needsHealthSharingAnswer(user) {
  return !!user && user.role === 'client' && !!user.trainerId && hasAppAccount(user) && !user.healthSharing;
}
