// Load test only (scripts/load-test/README.md): src/firebase.js, pointed at the local
// emulators. vite.config.js swaps this in for src/firebase.js; nothing here can reach
// elitepro-16718 — every service is connected to 127.0.0.1, and the browser in
// measure.py refuses any other host as well (CLAUDE.md #38).
import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const app = initializeApp({
  apiKey: 'demo-key',
  authDomain: '127.0.0.1',
  projectId: 'elitepro-16718',
  appId: '1:0:web:loadtest',
});

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
connectFirestoreEmulator(db, '127.0.0.1', 8080);
export const auth = getAuth(app);
connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
export const functions = getFunctions(app);
connectFunctionsEmulator(functions, '127.0.0.1', 5001);

// ?as=<uid> signs that seeded account in (password in seed.cjs).
const as = new URLSearchParams(location.search).get('as');
if (as) {
  auth.authStateReady().then(() => {
    if (!auth.currentUser) signInWithEmailAndPassword(auth, `${as}@loadtest.invalid`, 'loadtest-only');
  });
}

export default app;
