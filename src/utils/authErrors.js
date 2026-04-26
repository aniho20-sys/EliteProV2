const AUTH_ERRORS = {
  'auth/user-not-found': 'No account found with this email.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/invalid-credential': 'Invalid email or password.',
  'auth/invalid-login-credentials': 'Invalid email or password.',
  'auth/email-already-in-use': 'This email is already registered. Try signing in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
  'auth/network-request-failed': 'Network error. Please check your connection and try again.',
  'auth/requires-recent-login': 'For security, please sign out and sign in again before doing this.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  'auth/unauthorized-domain': 'This domain is not authorised for sign-in. Please contact support.',
  'auth/internal-error': 'An internal error occurred. Please try again.',
  'auth/popup-blocked': 'Redirecting to Google sign-in…',
  'auth/popup-closed-by-user': null,
  'auth/cancelled-popup-request': null,
  'auth/web-storage-unsupported': 'Your browser blocks required storage. Try disabling private mode or use a different browser.',
};

export function friendlyAuthError(err, fallback = 'Something went wrong. Please try again.') {
  const mapped = AUTH_ERRORS[err?.code];
  if (mapped === null) return null; // intentionally silent
  if (mapped) return mapped;
  // Show the raw error code for unrecognised errors so we can diagnose
  const code = err?.code ? ` (${err.code})` : '';
  return `${fallback}${code}`;
}
