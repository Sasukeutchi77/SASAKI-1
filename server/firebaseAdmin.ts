import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

let appInstance: App | null = null;

export function getFirebaseAdmin(): App | null {
  if (appInstance) return appInstance;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    appInstance = existingApps[0];
    return appInstance;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (projectId && clientEmail && privateKey) {
    try {
      appInstance = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      console.log('Firebase Admin SDK initialisé avec succès.');
      return appInstance;
    } catch (err) {
      console.warn('Avertissement lors de l’initialisation de Firebase Admin SDK:', err);
    }
  }

  return null;
}

export async function verifyFirebaseToken(idToken: string): Promise<DecodedIdToken | null> {
  const adminApp = getFirebaseAdmin();
  if (!adminApp) return null;
  try {
    const auth = getAuth(adminApp);
    const decoded = await auth.verifyIdToken(idToken);
    return decoded;
  } catch (err) {
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
