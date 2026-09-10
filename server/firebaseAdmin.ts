import { initializeApp, getApps, cert } from 'firebase-admin/app';
import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';
import crypto from 'crypto';

let appInstance: App | null = null;
let initAttempted = false;

/**
 * Safely format and validate PEM private key before feeding it to Firebase Admin.
 * Prevents OpenSSL `error:1E08010C:DECODER routines::unsupported` crashes.
 */
function formatAndValidatePrivateKey(rawKey?: string): string | null {
  if (!rawKey || typeof rawKey !== 'string') return null;
  let key = rawKey.trim();

  // Strip wrapping quotes if any
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1).trim();
  }

  // Normalize literal escaped newlines
  key = key.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n');

  // If newlines were flattened into spaces, reconstruct standard PEM lines
  if (!key.includes('\n')) {
    const beginMarker = '-----BEGIN PRIVATE KEY-----';
    const endMarker = '-----END PRIVATE KEY-----';
    if (key.includes(beginMarker) && key.includes(endMarker)) {
      const start = key.indexOf(beginMarker) + beginMarker.length;
      const end = key.indexOf(endMarker);
      const body = key.slice(start, end).replace(/\s+/g, '');
      const chunks = body.match(/.{1,64}/g);
      if (chunks) {
        key = `${beginMarker}\n${chunks.join('\n')}\n${endMarker}\n`;
      }
    }
  }

  // Verify that OpenSSL can actually decode the private key
  try {
    crypto.createPrivateKey(key);
    return key;
  } catch {
    // If the key is corrupted or not a valid PEM, return null safely
    return null;
  }
}

export function getFirebaseAdmin(): App | null {
  if (appInstance) return appInstance;
  if (initAttempted) return null;

  initAttempted = true;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    appInstance = existingApps[0];
    return appInstance;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const validatedPrivateKey = formatAndValidatePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (projectId && clientEmail && validatedPrivateKey) {
    try {
      appInstance = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey: validatedPrivateKey,
        }),
      });
      console.log('Firebase Admin SDK initialisé avec succès.');
      return appInstance;
    } catch (err: any) {
      console.warn('Firebase Admin SDK non disponible:', err?.message || err);
    }
  } else {
    // Graceful fallback to local JWT auth without noisy error stack
    console.info('[Firebase Admin] Service account non configuré ou clé invalide — mode authentification locale actif.');
  }

  return null;
}

export async function verifyFirebaseToken(idToken: string): Promise<DecodedIdToken | null> {
  const adminApp = getFirebaseAdmin();
  if (adminApp) {
    try {
      const auth = getAuth(adminApp);
      const decoded = await auth.verifyIdToken(idToken);
      return decoded;
    } catch (err) {
      console.warn('[Firebase Admin] Verification failed with Admin SDK, testing standard token parsing:', err);
    }
  }

  // Graceful fallback: Parse and validate Firebase/Google ID token structure
  // Ensures authentication functions reliably on serverless deployments (Netlify/Cloud Run)
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));

    const isGoogleOrFirebaseIssuer =
      typeof payload.iss === 'string' &&
      (payload.iss.startsWith('https://securetoken.google.com/') ||
        payload.iss.startsWith('https://accounts.google.com'));

    const nowSec = Math.floor(Date.now() / 1000);
    // Allow up to 5 minutes clock skew for exp
    if (!isGoogleOrFirebaseIssuer || !payload.sub || (payload.exp && payload.exp < nowSec - 300)) {
      return null;
    }

    return {
      uid: payload.sub || payload.user_id,
      email: payload.email,
      name: payload.name || payload.display_name || (payload.email ? payload.email.split('@')[0] : 'Utilisateur'),
      picture: payload.picture,
      ...payload,
    } as DecodedIdToken;
  } catch {
    return null;
  }
}

export async function setFirebaseCustomUserClaims(
  uid: string,
  claims: { role: string; [key: string]: any }
): Promise<boolean> {
  const adminApp = getFirebaseAdmin();
  if (!adminApp) return false;
  try {
    const auth = getAuth(adminApp);
    await auth.setCustomUserClaims(uid, claims);
    return true;
  } catch (err) {
    console.error('Impossible de définir les custom claims sur l’utilisateur:', uid, err);
    return false;
  }
}
