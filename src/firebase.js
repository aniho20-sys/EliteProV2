import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

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

// persistentLocalCache replaces deprecated enableIndexedDbPersistence
// persistentMultipleTabManager allows multiple browser tabs to share the cache
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
export const auth = getAuth(app);

export default app;
