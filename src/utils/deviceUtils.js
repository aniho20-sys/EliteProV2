export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  window.navigator.standalone === true;

export const isMobileOrPwa = () => isIOS() || isStandalone();

// How Google sign-in runs. An iPhone home-screen app opens a popup as a separate window
// with no way back to the app, and the sign-in dies there ("missing initial state", Ani
// 2026-10-21) — so it goes by redirect, which stays in the app's own window. Everywhere
// else the popup keeps the page as it was.
export const googleSignInMethod = ({ ios, standalone }) => (ios && standalone ? 'redirect' : 'popup');
