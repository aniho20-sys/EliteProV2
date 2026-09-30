// The link a coach sends a client. App.jsx reads `?invite=` from the hash on startup, keeps
// the code for RoleSelectPage to pre-fill, and opens the sign-up form rather than the
// marketing page. One place, so every share button sends the same link.
export const APP_URL = 'https://elitepro-16718.web.app';

export function inviteUrl(code) {
  return `${APP_URL}/#/?invite=${code}`;
}

// Someone arriving to create an account — from the landing page's call to action, or from
// a coach's invite link — should land on "Create Account", not on "Sign In", where an
// email and password they have never registered fail with a confusing error.
export function opensAsSignUp(search, storage = sessionStorage) {
  if (new URLSearchParams(search || '').get('signup') === '1') return true;
  try { return !!storage.getItem('elitepro_invite_code'); } catch { return false; }
}
