/** Firebase browser messaging only. Service-account credentials must never enter this bundle. */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

// ── Firebase client config ────────────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export interface FcmPayload {
  title: string;
  body: string;
  imageUrl?: string;
  data?: Record<string, string>;
}

export type FcmTarget =
  | { type: 'topic'; topic: string }
  | { type: 'token'; token: string };

export interface FcmResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ── JWT / OAuth2 helpers ──────────────────────────────────────────────────────

/** Sending is unavailable until an authorized, audited backend sender is deployed. */
export const sendFcmNotification = async (
  _target: FcmTarget,
  _payload: FcmPayload,
): Promise<FcmResult> => ({
  success: false,
  error: 'Notification delivery is unavailable: an authorized backend sender has not been configured.',
});

export const sendFestivalNotification = async (
  festivalId: string,
  festivalType: string,
  payload: FcmPayload,
): Promise<FcmResult> => {
  const typeTopic = festivalType.toLowerCase().replace(/\s+/g, '_');
  const data = {
    ...payload.data,
    festival_id: festivalId,
    festival_type: festivalType,
    screen: 'festival_detail',
    deep_link: payload.data?.deep_link ?? `/festivals/${festivalId}`,
  };

  const broadResult = await sendFcmNotification(
    { type: 'topic', topic: 'festivals' },
    { ...payload, data },
  );

  // Best-effort type-specific topic
  sendFcmNotification(
    { type: 'topic', topic: `festivals_${typeTopic}` },
    { ...payload, data },
  ).catch(() => {});

  return broadResult;
};

export const sendFestivalReminder = async (
  festivalId: string,
  payload: FcmPayload,
): Promise<FcmResult> => {
  return sendFcmNotification(
    { type: 'topic', topic: `festival_${festivalId}` },
    {
      ...payload,
      data: {
        ...payload.data,
        festival_id: festivalId,
        screen: 'festival_detail',
        deep_link: payload.data?.deep_link ?? `/festivals/${festivalId}`,
      },
    },
  );
};

// ── Browser token (admin test sends) ─────────────────────────────────────────

export const getAdminBrowserToken = async (): Promise<string | null> => {
  try {
    const supported = await isSupported();
    if (!supported) return null;

    const messaging = getMessaging(firebaseApp);
    const vapidKey  = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (!vapidKey) return null;

    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch {
    return null;
  }
};
