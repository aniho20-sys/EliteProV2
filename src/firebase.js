import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyCRfch8PtuqVdBIwjBcGq7NS5NDjt8PeZI',
  authDomain: 'elitepro-16718.web.app',
  projectId: 'elitepro-16718',
  storageBucket: 'elitepro-16718.firebasestorage.app',
  messagingSenderId: '167024537410',
  appId: '1:167024537410:web:5250575dd71a17ee0462db',
  measurementId: 'G-88P0LZEGC9',
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence so app works without internet
enableIndexedDbPersistence(db).catch(() => {
  // Multiple tabs open or browser doesn't support — ignore
});

export default app;
