// Clients a coach added themselves, who do not use the app (B35). Their record is the
// coach's: they have no account, so nothing that reaches a client through the app —
// messages, reminders, push notifications, the training-profile form — can reach them.
// Every screen asks this one question rather than reading the flag itself.

export function hasAppAccount(client) {
  return !!client && client.managed !== true;
}

// 'managed-<ms>-<4 chars>' — the only ids firestore.rules lets a coach create. Date.now()
// like the app's other ids (#4), plus a short suffix so two coaches adding a client in the
// same millisecond cannot collide.
export function managedClientId(now = Date.now(), random = Math.random) {
  const suffix = Math.floor(random() * 36 ** 4).toString(36).padStart(4, '0');
  return `managed-${now}-${suffix}`;
}

export const MANAGED_NAME_MAX = 80;
