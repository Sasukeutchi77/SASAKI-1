/**
 * Service Firebase adapté pour React Native et Expo Go.
 * N'utilise pas les API web du navigateur (window, document, popup).
 */
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';

const getEnv = (key: string): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

// Configuration Firebase via variables d'environnement Expo
const firebaseConfig = {
  apiKey: getEnv('EXPO_PUBLIC_FIREBASE_API_KEY'),
  authDomain: getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID'),
  storageBucket: getEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('EXPO_PUBLIC_FIREBASE_APP_ID'),
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
  } catch (error) {
    console.warn('[Firebase Mobile] Initialisation différée:', error);
  }
}

export { app, auth };

export async function loginWithFirebase(email: string, pass: string): Promise<FirebaseUser | null> {
  if (!auth) return null;
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return credential.user;
}

export async function registerWithFirebase(email: string, pass: string): Promise<FirebaseUser | null> {
  if (!auth) return null;
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  return credential.user;
}

export async function logoutFirebase(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}
