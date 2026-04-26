import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: 'AIzaSyCRfch8PtuqVdBIwjBcGq7NS5NDjt8PeZI',
  authDomain: 'elitepro-16718.firebaseapp.com',
  projectId: 'elitepro-16718',
  storageBucket: 'elitepro-16718.firebasestorage.app',
  messagingSenderId: '167024537410',
  appId: '1:167024537410:web:5250575dd71a17ee0462db',
  measurementId: 'G-88P0LZEGC9',
};

const app = initializeApp(firebaseConfig);

// ── Firebase App Check ──────────────────────────────────────────────────────
// Prevents unauthorized clients from hitting Firebase APIs.
//
// Dev:  debug token mode — Firebase generates a UUID and logs it to console.
//       Copy that UUID → Firebase Console → App Check → Debug tokens.
//
// Prod: requires VITE_RECAPTCHA_SITE_KEY (reCAPTCHA v3 site key).
//       Set as GitHub secret + local .env.local before enabling enforcement.
//       Steps: see .env.example
// ────────────────────────────────────────────────────────────────────────────
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

if (import.meta.env.DEV) {
  // eslint-disable-next-line no-restricted-globals
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

try {
  if (RECAPTCHA_SITE_KEY || import.meta.env.DEV) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY ?? 'dev-debug-placeholder'),
      isTokenAutoRefreshEnabled: true,
    });
  }
} catch {
  // App Check init failure must not block Auth or Firestore
}

export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence so app works without internet
enableIndexedDbPersistence(db).catch(() => {
  // Multiple tabs open or browser doesn't support — ignore
});

export default app;
