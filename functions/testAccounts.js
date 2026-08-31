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

// Domains that provably cannot belong to a real person. Nothing else is ever swept
// automatically — an address on a real domain is a judgement call, and judgement calls
// belong to Ani, not to a loop.
//
//   example.com  IANA-reserved for documentation (RFC 2606). Cannot receive mail.
//   test.local   .local is reserved for multicast DNS (RFC 6762). Never publicly
//                resolvable, so no mailbox can exist behind it.
//
// This started as one domain and missed most of the mess. The 2026-06 run left
// testtrainer<epoch>@example.com behind; an earlier one left trainer_<epoch>@test.local,
// and those survived the first sweep untouched because the list had a single entry in it.
// When adding to this list, the bar is "cannot route mail, by standard" — not "looks like
// a test account".
const DISPOSABLE_DOMAINS = ['@example.com', '@test.local'];

// Kept on purpose whatever else is true. The QA pair is on @elitepro.test, which is also a
// reserved domain, and CLAUDE.md keeps both permanently for multi-tenant testing — so if
// .test is ever added above, these two must still survive it.
const PROTECTED_EMAILS = [
  OWNER_EMAIL,
  'test-coach-b@elitepro.test',
  'test-student-b@elitepro.test',
];

// Accepts either an Auth user record or a Firestore profile — both carry `email`.
function isDeletableTestAccount(user) {
  const email = String((user && user.email) || '').trim().toLowerCase();
  if (!email) return false;                       // no address: no evidence, never touch it
  if (PROTECTED_EMAILS.includes(email)) return false;
  return DISPOSABLE_DOMAINS.some(d => email.endsWith(d));
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

module.exports = {
  isDeletableTestAccount,
  selectTestAccounts,
  OWNER_EMAIL,
  DISPOSABLE_DOMAINS,
  PROTECTED_EMAILS,
};
