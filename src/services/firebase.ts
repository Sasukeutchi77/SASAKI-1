import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
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
} from 'firebase/firestore';
import { User, UserRole } from '../types';

// Environment variables for Firebase Client SDK
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.apiKey !== '' &&
      firebaseConfig.projectId &&
      firebaseConfig.projectId !== ''
  );
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    firestore = getFirestore(app);
  } catch (error) {
    console.warn('Erreur lors de l’initialisation de Firebase SDK:', error);
  }
}

export { app, auth, firestore };

// Google Provider setup
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Helper for friendly French error messages
export function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Cette adresse email est déjà associée à un compte purge-info.';
    case 'auth/invalid-email':
      return 'L’adresse email saisie est invalide.';
    case 'auth/operation-not-allowed':
      return 'La méthode de connexion sélectionnée n’est pas activée.';
    case 'auth/weak-password':
      return 'Le mot de passe doit comporter au moins 6 caractères.';
    case 'auth/user-disabled':
      return 'Ce compte utilisateur a été suspendu par l’administration.';
    case 'auth/user-not-found':
      return 'Aucun compte n’est associé à cette adresse email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Identifiants invalides (email ou mot de passe incorrect).';
    case 'auth/popup-closed-by-user':
      return 'La fenêtre de connexion Google a été fermée avant la validation.';
    case 'auth/popup-blocked':
      return 'Le navigateur a bloqué l’ouverture de la fenêtre de connexion Google. Veuillez autoriser les popups.';
    case 'auth/account-exists-with-different-credential':
      return 'Un compte existe déjà avec cette adresse email en utilisant une méthode de connexion différente.';
    case 'auth/network-request-failed':
      return 'Erreur de communication réseau. Veuillez vérifier votre connexion internet.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives infructueuses. Veuillez patienter quelques instants avant de réessayer.';
    default:
      return 'Une erreur est survenue lors de l’authentification. Veuillez réessayer.';
  }
}

// 1. Create account with Email and Password
export async function registerWithFirebaseEmail(
  name: string,
  email: string,
  pass: string
): Promise<{ firebaseUser: FirebaseUser; idToken: string }> {
  if (!auth) {
    throw new Error('Firebase Auth n’est pas configuré avec des identifiants valides.');
  }

  const credential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  await updateProfile(credential.user, { displayName: name.trim() });
  const idToken = await credential.user.getIdToken();

  // Initialize or update user profile document in Firestore
  await syncFirestoreUserProfile(credential.user, { name });

  return { firebaseUser: credential.user, idToken };
}

// 2. Sign In with Email and Password
export async function loginWithFirebaseEmail(
  email: string,
  pass: string
): Promise<{ firebaseUser: FirebaseUser; idToken: string }> {
  if (!auth) {
    throw new Error('Firebase Auth n’est pas configuré.');
  }

  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const idToken = await credential.user.getIdToken();

  // Update lastLoginAt in Firestore
  await syncFirestoreUserProfile(credential.user);

  return { firebaseUser: credential.user, idToken };
}

// 3. Sign In with Google
export async function loginWithFirebaseGoogle(): Promise<{
  firebaseUser: FirebaseUser;
  idToken: string;
}> {
  if (!auth) {
    throw new Error('Firebase Auth n’est pas configuré.');
  }

  const credential = await signInWithPopup(auth, googleProvider);
  const idToken = await credential.user.getIdToken();

  // Create or sync Firestore profile
  await syncFirestoreUserProfile(credential.user);

  return { firebaseUser: credential.user, idToken };
}

// 4. Send Password Reset Email
export async function sendFirebasePasswordReset(email: string): Promise<void> {
  if (!auth) {
    throw new Error('Firebase Auth n’est pas configuré.');
  }
  await sendPasswordResetEmail(auth, email.trim());
}

// 5. Sign Out
export async function logoutFirebase(): Promise<void> {
  if (auth) {
    await signOut(auth);
  }
}

// 6. Get Current User ID Token
export async function getFirebaseIdToken(forceRefresh: boolean = false): Promise<string | null> {
  if (!auth || !auth.currentUser) return null;
  return auth.currentUser.getIdToken(forceRefresh);
}

// 7. Synchronize user profile into Firestore collection 'users'
export async function syncFirestoreUserProfile(
  fbUser: FirebaseUser,
  additionalData: Partial<User> = {}
): Promise<void> {
  if (!firestore) return;

  try {
    const userRef = doc(firestore, 'users', fbUser.uid);
    const snap = await getDoc(userRef);
    const now = new Date().toISOString();

    if (!snap.exists()) {
      // Create new profile
      // CRITICAL RULE: role is always 'user' by default. Never allow frontend to assign admin or journalist directly.
      const defaultUsername = (fbUser.email?.split('@')[0] || 'utilisateur')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');

      const initialData: Partial<User> = {
        id: fbUser.uid,
        uid: fbUser.uid,
        name: additionalData.name || fbUser.displayName || defaultUsername,
        username: defaultUsername,
        email: fbUser.email?.toLowerCase() || '',
        avatar:
          fbUser.photoURL ||
          `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
        role: 'user', // Default safe user role
        accountType: 'user',
        bio: 'Membre de la communauté purge-info',
        status: 'active',
        isVerified: false,
        verificationStatus: 'none',
        followersCount: 0,
        followingCount: 0,
        createdAt: now,
        lastLoginAt: now,
      };

      await setDoc(userRef, initialData, { merge: true });
    } else {
      // Update only safe allowed fields: lastLoginAt and name if provided
      const updatePayload: Record<string, any> = {
        lastLoginAt: now,
      };
      if (additionalData.name) {
        updatePayload.name = additionalData.name;
      }
      if (additionalData.username !== undefined) {
        updatePayload.username = additionalData.username;
      }
      if (additionalData.bio !== undefined) {
        updatePayload.bio = additionalData.bio;
      }
      if (additionalData.phone !== undefined) {
        updatePayload.phone = additionalData.phone;
      }
      if (additionalData.avatar !== undefined) {
        updatePayload.avatar = additionalData.avatar;
      }
      if (additionalData.coverImage !== undefined) {
        updatePayload.coverImage = additionalData.coverImage;
      }
      if (additionalData.mediaName !== undefined) {
        updatePayload.mediaName = additionalData.mediaName;
      }
      await updateDoc(userRef, updatePayload);
    }
  } catch (err) {
    console.warn('Could not sync Firestore document (rules or permissions):', err);
  }
}
