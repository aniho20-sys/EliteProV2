// Owner-only callables gate on isOwnerToken. The bug it guards: until 2026-09-27 the check
// compared the token's email only, so an account that merely CLAIMED the owner's address —
// never proving it — would have passed. Pure function, no emulator needed.
const { isOwnerToken, findOwnerProfile, OWNER_EMAIL } = require('../ownerAuth');

describe('isOwnerToken', () => {
  test('the owner signed in with Google (verified Gmail) passes', () => {
    expect(isOwnerToken({ email: OWNER_EMAIL, email_verified: true })).toBe(true);
  });

  test('case in the address does not matter', () => {
    expect(isOwnerToken({ email: 'AniHo20@Gmail.com', email_verified: true })).toBe(true);
  });

  test("the owner's address, unverified, is refused", () => {
    expect(isOwnerToken({ email: OWNER_EMAIL, email_verified: false })).toBe(false);
    expect(isOwnerToken({ email: OWNER_EMAIL })).toBe(false);
  });

  test('anyone else is refused, verified or not', () => {
    expect(isOwnerToken({ email: 'someone@gmail.com', email_verified: true })).toBe(false);
  });

  test('a missing token or email is refused, not thrown', () => {
    expect(isOwnerToken(undefined)).toBe(false);
    expect(isOwnerToken({ email_verified: true })).toBe(false);
  });
});

// Audit 2026-10-23: owner alerts went to the first users document whose email field said
// the owner's address — a field any account writes for itself.
describe('findOwnerProfile', () => {
  const docs = {
    'users/aaa-impostor': { id: 'aaa-impostor', email: OWNER_EMAIL, fcmTokens: ['impostor-phone'] },
    'users/zzz-ani': { id: 'zzz-ani', email: OWNER_EMAIL, fcmTokens: ['ani-phone'] },
  };
  const db = {
    doc: (path) => ({ get: async () => ({ exists: path in docs, id: path.split('/')[1], data: () => docs[path] }) }),
    // Present so a return to "query by email" would pick the impostor (first by id) and fail.
    collection: () => ({ where: () => ({ limit: () => ({ get: async () => ({ empty: false, docs: [{ id: 'aaa-impostor', data: () => docs['users/aaa-impostor'] }] }) }) }) }),
  };
  const auth = (user) => ({ getUserByEmail: async (email) => {
    if (!user || email !== OWNER_EMAIL) throw Object.assign(new Error('not found'), { code: 'auth/user-not-found' });
    return user;
  } });

  test('the owner is the Auth account holding the address, not whoever wrote it on a profile', async () => {
    const owner = await findOwnerProfile({ db, auth: auth({ uid: 'zzz-ani', emailVerified: true }) });
    expect(owner.id).toBe('zzz-ani');
  });
  test('an unverified Auth account with the address is not the owner', async () => {
    expect(await findOwnerProfile({ db, auth: auth({ uid: 'zzz-ani', emailVerified: false }) })).toBeNull();
  });
  test('no Auth account with the address: nobody, not a guess', async () => {
    expect(await findOwnerProfile({ db, auth: auth(null) })).toBeNull();
  });
});
