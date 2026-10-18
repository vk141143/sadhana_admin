/**
 * Firebase Service — FCM v1 push notifications for the Sanathana app.
 *
 * Uses FCM HTTP v1 API with a short-lived OAuth2 Bearer token minted from
 * the service account private key (JWT → Google token endpoint).
 *
 * Topic convention (mobile app must subscribe on startup):
 *   "festivals"          → all festival notifications
 *   "festivals_{type}"   → e.g. festivals_ekadashi, festivals_purnima
 *   "festival_{id}"      → bookmarked festival reminders
 */

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

const PROJECT_ID  = import.meta.env.VITE_FIREBASE_PROJECT_ID as string;
const FCM_V1_URL  = `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`;
const TOKEN_URL   = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE   = 'https://www.googleapis.com/auth/firebase.messaging';

// ── Types ─────────────────────────────────────────────────────────────────────

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

/** Base64url-encode a string (no padding). */
const b64url = (str: string): string =>
  btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** Sign data with the service account RSA private key using WebCrypto. */
const rsaSign = async (data: string, pemKey: string): Promise<string> => {
  const pem = pemKey
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    der.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(data),
  );

  return b64url(String.fromCharCode(...new Uint8Array(sig)));
};

/** Mint a short-lived OAuth2 access token from the service account credentials. */
const getAccessToken = async (): Promise<string> => {
  const clientEmail = import.meta.env.VITE_FIREBASE_SA_CLIENT_EMAIL as string;
  const privateKey  = (import.meta.env.VITE_FIREBASE_SA_PRIVATE_KEY as string)
    .replace(/\\n/g, '\n');

  if (!clientEmail || !privateKey) {
    throw new Error('Service account env vars not set (VITE_FIREBASE_SA_CLIENT_EMAIL / VITE_FIREBASE_SA_PRIVATE_KEY)');
  }

  const now = Math.floor(Date.now() / 1000);
  const header  = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({
    iss: clientEmail,
    sub: clientEmail,
    aud: TOKEN_URL,
    scope: FCM_SCOPE,
    iat: now,
    exp: now + 3600,
  }));

  const signature = await rsaSign(`${header}.${payload}`, privateKey);
  const jwt = `${header}.${payload}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OAuth2 token error: ${err}`);
  }

  const json = await res.json();
  return json.access_token as string;
};

// ── FCM v1 sender ─────────────────────────────────────────────────────────────

export const sendFcmNotification = async (
  target: FcmTarget,
  payload: FcmPayload,
): Promise<FcmResult> => {
  try {
    const accessToken = await getAccessToken();

    const notification: Record<string, string> = { title: payload.title, body: payload.body };
    if (payload.imageUrl) notification.image = payload.imageUrl;

    const message: Record<string, any> = {
      notification,
      data: payload.data ?? {},
    };

    if (target.type === 'topic') {
      message.topic = target.topic;
    } else {
      message.token = target.token;
    }

    const res = await fetch(FCM_V1_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ message }),
    });

    const json = await res.json();

    if (!res.ok) {
      return { success: false, error: json.error?.message ?? `HTTP ${res.status}` };
    }

    return { success: true, messageId: json.name };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

// ── Festival helpers ──────────────────────────────────────────────────────────

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
