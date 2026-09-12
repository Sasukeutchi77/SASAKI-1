/**
 * Service Firebase optimisé pour React Native et Expo Go (Android).
 * Utilise l'authentification native avec persistance AsyncStorage et Firestore.
 * Aucune API web spécifique au navigateur (window, document, popup).
 */
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Extraction d'environnement Expo ou fallback configuration applet
const getEnv = (key: string, fallback: string = ''): string => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return fallback;
};

// Configuration Firebase Client (clés publiques pour l'application cliente)
const firebaseConfig = {
  apiKey: getEnv('EXPO_PUBLIC_FIREBASE_API_KEY', 'AIzaSyChyWpYNdaI-OGJd4SgPSOViQjPfnnI1II'),
  authDomain: getEnv('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN', 'gen-lang-client-0918024183.firebaseapp.com'),
  projectId: getEnv('EXPO_PUBLIC_FIREBASE_PROJECT_ID', 'gen-lang-client-0918024183'),
  storageBucket: getEnv('EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET', 'gen-lang-client-0918024183.firebasestorage.app'),
  messagingSenderId: getEnv('EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', '108176392504'),
  appId: getEnv('EXPO_PUBLIC_FIREBASE_APP_ID', '1:108176392504:web:98dcec6babaca0015341cd'),
};

const firestoreDatabaseId = getEnv(
  'EXPO_PUBLIC_FIREBASE_DATABASE_ID',
  'ai-studio-sasaki1-d54f04b6-c7ca-43c4-b242-bda2d7957a17'
);

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

    // Initialisation sécurisée de l'authentification avec persistance AsyncStorage si disponible
    const getRNPersistence = (FirebaseAuth as any).getReactNativePersistence;
    if (typeof (FirebaseAuth as any).initializeAuth === 'function' && typeof getRNPersistence === 'function') {
      try {
        auth = (FirebaseAuth as any).initializeAuth(app, {
          persistence: getRNPersistence(AsyncStorage),
        });
      } catch {
        auth = getAuth(app);
      }
    } else {
      auth = getAuth(app);
    }

    // Initialisation Firestore (supporte base nommée ou base par défaut)
    try {
      firestore = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
    } catch (e) {
      console.warn('[Firebase Mobile] Initialisation Firestore fallback standard:', e);
      firestore = getFirestore(app);
    }
  } catch (error) {
    console.warn('[Firebase Mobile] Initialisation différée:', error);
  }
}

export {
  app,
  auth,
  firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  onSnapshot,
};

// Traduction des erreurs Firebase en messages conviviaux en français
export function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Cette adresse email est déjà associée à un compte PURGE.';
    case 'auth/invalid-email':
      return 'L’adresse email saisie est invalide.';
    case 'auth/operation-not-allowed':
      return 'La méthode de connexion sélectionnée n’est pas activée.';
    case 'auth/weak-password':
      return 'Le mot de passe doit comporter au moins 6 caractères.';
    case 'auth/user-disabled':
      return 'Ce compte utilisateur a été suspendu.';
    case 'auth/user-not-found':
      return 'Aucun compte n’est associé à cette adresse email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Identifiants invalides (email ou mot de passe incorrect).';
    case 'auth/network-request-failed':
      return 'Erreur de réseau : vérifiez votre connexion Internet mobile.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives infructueuses. Veuillez patienter un instant.';
    default:
      return 'Une erreur d’authentification est survenue. Veuillez réessayer.';
  }
}

export async function loginWithFirebase(email: string, pass: string): Promise<FirebaseUser | null> {
  if (!auth) throw new Error('Firebase Auth n’est pas initialisé.');
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return credential.user;
}

export async function registerWithFirebase(email: string, pass: string): Promise<FirebaseUser | null> {
  if (!auth) throw new Error('Firebase Auth n’est pas initialisé.');
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  return credential.user;
}

export async function resetPasswordWithFirebase(email: string): Promise<void> {
  if (!auth) throw new Error('Firebase Auth n’est pas initialisé.');
  await sendPasswordResetEmail(auth, email.trim());
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
