import { hasAppAccount } from './managedClient';

// Whether a client connected to a coach has still to agree that the coach sees their health
// information — body stats and the training profile, injuries included (B79, Grok #27).
// Ani 2026-10-26: agreeing is part of training with a coach; not agreeing disconnects. So
// anything but 'yes' is asked: not answered yet, or a 'no' from before that rule. Asked once
// per coach — connecting to a different coach clears the answer (functions/inviteCodes.js).
// A client without the app is never asked.
export function needsHealthSharingAnswer(user) {
  return !!user && user.role === 'client' && !!user.trainerId && hasAppAccount(user) && user.healthSharing !== 'yes';
}
