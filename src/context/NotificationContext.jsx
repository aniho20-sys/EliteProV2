import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import app from '../firebase';
import { useApp } from './AppContext';
import { useToast } from './ToastContext';

// VAPID Key — set VITE_VAPID_KEY in GitHub Secrets (Firebase Console → Project Settings → Cloud Messaging → Web Push certificates)
const VAPID_KEY = import.meta.env.VITE_VAPID_KEY || 'BF620v_ocN6QLjXAdubM36xUxnS1K1EfiUKOZO0WSdlnjBAaoJI4h0r_Pdj0KhM9dHUvm7d4WIUFhJtmSaIMjl4';

const NotificationContext = createContext();
// eslint-disable-next-line react-refresh/only-export-components
export const useNotifications = () => useContext(NotificationContext);

export function NotificationProvider({ children }) {
  const { currentUser } = useApp();
  const toast = useToast();
  const toastRef = useRef(toast);
  useEffect(() => { toastRef.current = toast; });

  const [permission, setPermission] = useState('default');
  const [supported, setSupported] = useState(false);
  const [token, setToken] = useState(null);

  // Check browser support on mount
  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      isSupported().then(yes => {
        setSupported(yes);
        if (yes) setPermission(Notification.permission);
      }).catch(() => {});
    }
  }, []);

  const setupMessaging = useCallback(async (userId) => {
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/firebase-cloud-messaging-push-scope',
    });
    const messaging = getMessaging(app);
    const fcmToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!fcmToken) throw new Error('FCM token empty — VAPID key may be incorrect');
    if (userId) {
      await updateDoc(doc(db, 'users', userId), {
        fcmTokens: arrayUnion(fcmToken),
      });
      setToken(fcmToken);
    }
  }, []);

  // Auto-register token if permission already granted
  useEffect(() => {
    if (!supported || permission !== 'granted' || !currentUser || !VAPID_KEY) return;
    setupMessaging(currentUser.id).catch(err => console.error('FCM auto-setup failed:', err));
  }, [supported, permission, currentUser, setupMessaging]);

  // Request notification permission
  const requestPermission = useCallback(async (userId) => {
    if (!supported) {
      toastRef.current('Push notifications not supported on this browser', 'error');
      return null;
    }
    if (!VAPID_KEY) {
      toastRef.current('Push notifications not yet configured', 'error');
      return null;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        try {
          await setupMessaging(userId);
          toastRef.current('Notifications enabled!');
        } catch (err) {
          console.error('FCM token setup failed:', err);
          const detail = err?.message || err?.code || 'unknown';
          toastRef.current(`Token failed: ${detail}`, 'error');
        }
        return token;
      } else if (result === 'denied') {
        toastRef.current('Notifications blocked. Check browser settings to enable.', 'error');
      }
      return null;
    } catch (err) {
      console.error('Permission request failed:', err);
      toastRef.current('Failed to enable notifications', 'error');
      return null;
    }
  }, [supported, token, setupMessaging]);

  // Listen for foreground messages → show toast + browser notification
  useEffect(() => {
    if (!supported || permission !== 'granted' || !VAPID_KEY) return;

    let unsubscribe;
    isSupported().then(yes => {
      if (!yes) return;
      const messaging = getMessaging(app);
      unsubscribe = onMessage(messaging, (payload) => {
        const { title, body } = payload.notification || {};
        toastRef.current(body || title || 'New notification', 'info');

        // Always show native OS notification (even when app is in foreground)
        if (Notification.permission === 'granted') {
          new Notification(title || 'ElitePro', {
            body: body || '',
            icon: '/favicon.svg',
            tag: payload.data?.type || 'default',
          });
        }
      });
    });

    return () => { if (unsubscribe) unsubscribe(); };
  }, [supported, permission]);

  return (
    <NotificationContext.Provider value={{ permission, supported, token, requestPermission }}>
      {children}
    </NotificationContext.Provider>
  );
}
