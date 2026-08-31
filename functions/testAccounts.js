/* global module */
// Which accounts count as disposable test accounts, and which real ones sit downstream
// of them.
//
// Split out from index.js so it can be tested without an emulator: the bug this file
// exists to prevent was not in the deleting, it was in deciding WHAT to delete. The
// original version derived the list from Firestore profiles alone, so an account that
// existed as a login with no profile — a signup abandoned at the role screen, or a script
// that created logins and never wrote documents — was invisible to it. On 2026-08-31 the
// cleanup reported everything gone while the Firebase Auth user list was still full of
// testtrainer…@example.com.
//
// Firebase Auth is therefore the primary register here, and Firestore is folded in only to
// catch profiles whose Auth record has already been removed.

const OWNER_EMAIL = 'aniho20@gmail.com';
const TEST_EMAIL_DOMAIN = '@example.com';

// Accepts either an Auth user record or a Firestore profile — both carry `email`.
function isDeletableTestAccount(user) {
  const email = String((user && user.email) || '').trim().toLowerCase();
  if (!email) return false;                // no address: never touch it
  if (email === OWNER_EMAIL) return false; // belt and braces; Ani is not @example.com
  return email.endsWith(TEST_EMAIL_DOMAIN);
}

// authUsers: Firebase Auth records ({ uid, email }).
// profiles:  Firestore user documents ({ id, email, role, trainerId }).
function selectTestAccounts(authUsers, profiles) {
  const byId = new Map((profiles || []).map(p => [p.id, p]));
  const doomedIds = new Set();
  const doomed = [];

  const add = (id, email, profile) => {
    if (doomedIds.has(id)) return;
    doomedIds.add(id);
    doomed.push({
      id,
      email: email || (profile && profile.email) || '',
      name: (profile && profile.name) || '',
      role: (profile && profile.role) || '',
      hasProfile: !!profile,
    });
  };

  for (const u of authUsers || []) {
    if (isDeletableTestAccount(u)) add(u.uid, u.email, byId.get(u.uid));
  }
  for (const p of byId.values()) {
    if (isDeletableTestAccount(p)) add(p.id, p.email, p);
  }

  // A real client attached to one of these test trainers must not be swept up with it.
  // Detaching is reversible; deleting is not.
  const strandedClients = [...byId.values()].filter(u =>
    u.role === 'client' && !doomedIds.has(u.id) && u.trainerId && doomedIds.has(u.trainerId));

  return { doomed, strandedClients };
}

module.exports = { isDeletableTestAccount, selectTestAccounts, OWNER_EMAIL, TEST_EMAIL_DOMAIN };
