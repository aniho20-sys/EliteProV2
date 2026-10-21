import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyCRfch8PtuqVdBIwjBcGq7NS5NDjt8PeZI',
  // The app's own domain, not firebaseapp.com (Ani 2026-10-21): Google sign-in finishes on
  // <authDomain>/__/auth/handler, and on an iPhone home-screen app a different domain's
  // page cannot read what the sign-in started with ("missing initial state"). Hosting
  // serves the handler here, and Google already accepts this return address.
  authDomain: 'elitepro-16718.web.app',
  projectId: 'elitepro-16718',
  storageBucket: 'elitepro-16718.firebasestorage.app',
  messagingSenderId: '167024537410',
  appId: '1:167024537410:web:5250575dd71a17ee0462db',
  measurementId: 'G-88P0LZEGC9',
};

const app = initializeApp(firebaseConfig);

// persistentLocalCache replaces deprecated enableIndexedDbPersistence
// persistentMultipleTabManager allows multiple browser tabs to share the cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const auth = getAuth(app);
export const functions = getFunctions(app);

export default app;
