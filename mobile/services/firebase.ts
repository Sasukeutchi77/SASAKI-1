/**
 * Service Firebase optimisé pour React Native et Expo Go (Android).
 * Utilise l'authentification native avec persistance AsyncStorage et Firestore.
 * Communication directe avec Cloud Firestore et Firebase Auth sans barrière de proxy web.
 */
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
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
  limit as fsLimit,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Article, Category, Comment, Notification, AccountType, UserRole, VerificationRequest } from '../types';

export const MASTER_ADMIN_EMAILS = [
  'naruto455t@gmail.com',
  'itachi45t@gmail.com',
  'nami45tt@gmail.com',
  'minato45tt@gmail.com',
  'lordequipe@gmail.com',
];

export function isMasterAdmin(email?: string): boolean {
  if (!email) return false;
  return MASTER_ADMIN_EMAILS.includes(email.toLowerCase().trim());
}

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
  getDocs,
  onSnapshot,
};

// Traduction des erreurs Firebase en messages clairs et compréhensibles en français
export function mapFirebaseError(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Cette adresse email est déjà associée à un compte PURGE. Veuillez vous connecter.';
    case 'auth/invalid-email':
      return 'L’adresse email saisie est invalide (ex: citoyen@purge.info).';
    case 'auth/operation-not-allowed':
      return 'La méthode de connexion sélectionnée n’est pas activée.';
    case 'auth/weak-password':
      return 'Le mot de passe doit comporter au moins 6 caractères.';
    case 'auth/user-disabled':
      return 'Ce compte utilisateur a été suspendu par la rédaction.';
    case 'auth/user-not-found':
      return 'Aucun compte n’est associé à cette adresse email. Veuillez créer un compte.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Identifiants incorrects (email ou mot de passe invalide).';
    case 'auth/network-request-failed':
      return 'Connexion réseau impossible. Vérifiez votre accès Internet mobile.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives infructueuses. Veuillez patienter un instant.';
    default:
      return 'Une erreur d’authentification est survenue. Veuillez réessayer.';
  }
}

/**
 * Construit un objet User complet à partir d'un FirebaseUser et de données optionnelles
 */
function buildUserFromFirebase(fbUser: FirebaseUser, extra: Partial<User> = {}): User {
  const isAdmin = isMasterAdmin(fbUser.email || extra.email);
  // Règle stricte de sécurité PURGE : aucun utilisateur ne peut s'auto-attribuer le rôle de Journaliste à l'inscription.
  // L'accréditation Journaliste doit être demandée puis validée par un administrateur.
  let role: UserRole = 'citoyen';
  let accountType: AccountType = 'citoyen';
  let isVerified = false;
  let verificationStatus: 'none' | 'pending' | 'approved' | 'rejected' = extra.verificationStatus || 'none';

  if (isAdmin) {
    role = 'admin';
    accountType = 'admin' as any;
    isVerified = true;
    verificationStatus = 'approved';
  } else if (extra.role === 'journalist' || extra.role === 'journaliste' || extra.accountType === 'journalist' || extra.accountType === 'journaliste') {
    // Si l'administrateur a déjà approuvé la demande
    if (extra.verificationStatus === 'approved' || extra.isVerified) {
      role = 'journalist';
      accountType = 'journalist';
      isVerified = true;
      verificationStatus = 'approved';
    } else {
      role = 'citoyen';
      accountType = 'citoyen';
      verificationStatus = extra.verificationStatus || 'pending';
    }
  }

  return {
    id: fbUser.uid,
    uid: fbUser.uid,
    name: extra.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'Citoyen PURGE',
    username: extra.username || (fbUser.displayName || 'citoyen').toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.floor(100 + Math.random() * 900),
    email: fbUser.email || extra.email || '',
    role,
    accountType,
    avatar: extra.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(fbUser.uid)}`,
    bio: extra.bio || (isAdmin ? 'Administrateur de la plateforme PURGE' : 'Citoyen observateur sur la plateforme factuelle PURGE.'),
    isVerified,
    verificationStatus,
    status: 'active',
    articlesCount: extra.articlesCount || 0,
    followersCount: extra.followersCount || 0,
    followingCount: extra.followingCount || 0,
    createdAt: extra.createdAt || new Date().toISOString(),
  };
}

/**
 * Récupère le profil utilisateur depuis Firestore (`cloud_users` ou `users`)
 */
export async function fetchUserProfileFromFirestore(uid: string): Promise<User | null> {
  if (!firestore) return null;

  try {
    // 1. Essayer cloud_users
    const cloudRef = doc(firestore, 'cloud_users', uid);
    const cloudSnap = await getDoc(cloudRef);
    if (cloudSnap.exists()) {
      return cloudSnap.data() as User;
    }

    // 2. Essayer users
    const userRef = doc(firestore, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return userSnap.data() as User;
    }
  } catch (err) {
    console.warn('[Firebase Mobile] fetchUserProfileFromFirestore warning:', err);
  }
  return null;
}

/**
 * Enregistre le profil utilisateur dans Firestore
 */
export async function saveUserProfileToFirestore(user: User): Promise<void> {
  if (!firestore) return;

  try {
    const cloudRef = doc(firestore, 'cloud_users', user.id);
    await setDoc(cloudRef, user, { merge: true });

    const userRef = doc(firestore, 'users', user.id);
    await setDoc(userRef, user, { merge: true });
  } catch (err) {
    console.warn('[Firebase Mobile] saveUserProfileToFirestore warning:', err);
  }
}

/**
 * Connexion par email/mot de passe avec synchronisation profil Firestore
 */
export async function loginWithFirebaseEmailAndProfile(
  email: string,
  pass: string
): Promise<{ user: User; token: string }> {
  if (!auth) throw new Error('Firebase Auth n’est pas configuré sur ce téléphone.');

  try {
    const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const token = await credential.user.getIdToken();

    let userProfile = await fetchUserProfileFromFirestore(credential.user.uid);
    if (!userProfile) {
      userProfile = buildUserFromFirebase(credential.user);
      await saveUserProfileToFirestore(userProfile);
    } else if (isMasterAdmin(credential.user.email || '')) {
      // S'assurer que le master admin a les pleins pouvoirs
      userProfile.role = 'admin';
      userProfile.isVerified = true;
      userProfile.verificationStatus = 'approved';
    }

    return { user: userProfile, token };
  } catch (err: any) {
    const friendly = mapFirebaseError(err.code || '');
    throw new Error(friendly);
  }
}

/**
 * Inscription par email/mot de passe avec création immédiate du profil Firestore.
 * Tout utilisateur est créé en tant que Citoyen. L'accès journaliste nécessite
 * une demande d'accréditation ultérieure validée par les administrateurs.
 */
export async function registerWithFirebaseEmailAndProfile(params: {
  name: string;
  email: string;
  pass: string;
}): Promise<{ user: User; token: string }> {
  if (!auth) throw new Error('Firebase Auth n’est pas configuré sur ce téléphone.');

  try {
    const credential = await createUserWithEmailAndPassword(auth, params.email.trim(), params.pass);
    await updateProfile(credential.user, { displayName: params.name.trim() });
    const token = await credential.user.getIdToken();

    // Règle PURGE : Inscription citoyenne par défaut.
    const isAdmin = isMasterAdmin(params.email);
    const newUser = buildUserFromFirebase(credential.user, {
      name: params.name.trim(),
      email: params.email.trim(),
      role: isAdmin ? 'admin' : 'citoyen',
      accountType: isAdmin ? ('admin' as any) : 'citoyen',
      isVerified: isAdmin,
      verificationStatus: isAdmin ? 'approved' : 'none',
    });

    await saveUserProfileToFirestore(newUser);
    return { user: newUser, token };
  } catch (err: any) {
    const friendly = mapFirebaseError(err.code || '');
    throw new Error(friendly);
  }
}

/**
 * Soumettre une demande d'accréditation journaliste dans Firestore
 */
export async function submitVerificationRequestToFirestore(requestData: {
  userId: string;
  userName: string;
  userEmail: string;
  mediaName?: string;
  pressCardNumber?: string;
  motivation: string;
  documentUrl?: string;
}): Promise<VerificationRequest> {
  if (!firestore) throw new Error('Firestore n’est pas initialisé.');

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const newRequest: VerificationRequest = {
    id: requestId,
    userId: requestData.userId,
    userName: requestData.userName,
    userEmail: requestData.userEmail,
    mediaName: requestData.mediaName || 'Média Indépendant',
    pressCardNumber: requestData.pressCardNumber || 'Non renseigné',
    motivation: requestData.motivation,
    documentUrl: requestData.documentUrl,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  // 1. Sauvegarder dans cloud_verification_requests
  const reqRef = doc(firestore, 'cloud_verification_requests', requestId);
  await setDoc(reqRef, newRequest);

  // 2. Mettre à jour le statut dans le profil utilisateur Firestore
  try {
    const userRef = doc(firestore, 'users', requestData.userId);
    await setDoc(userRef, { verificationStatus: 'pending', updatedAt: new Date().toISOString() }, { merge: true });
    
    const cloudUserRef = doc(firestore, 'cloud_users', requestData.userId);
    await setDoc(cloudUserRef, { verificationStatus: 'pending', updatedAt: new Date().toISOString() }, { merge: true });
  } catch (updateErr) {
    console.warn('[Firebase] Warning updating user verificationStatus:', updateErr);
  }

  return newRequest;
}

/**
 * Récupère les demandes d'accréditation depuis Firestore (pour l'administration)
 */
export async function fetchVerificationRequestsFromFirestore(statusFilter?: string): Promise<VerificationRequest[]> {
  if (!firestore) return [];

  try {
    const colRef = collection(firestore, 'cloud_verification_requests');
    let q = query(colRef);
    if (statusFilter && statusFilter !== 'all') {
      q = query(colRef, where('status', '==', statusFilter));
    }
    const snap = await getDocs(q);
    const list: VerificationRequest[] = [];
    snap.forEach((d) => list.push(d.data() as VerificationRequest));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return list;
  } catch (err) {
    console.warn('[Firebase] Erreur chargement demandes accréditation:', err);
    return [];
  }
}

/**
 * Valide ou refuse une demande d'accréditation journaliste (Réservé aux Administrateurs)
 */
export async function reviewVerificationRequestInFirestore(
  requestId: string,
  decision: 'approved' | 'rejected',
  adminNotes?: string
): Promise<void> {
  if (!firestore) throw new Error('Firestore non initialisé.');

  const reqRef = doc(firestore, 'cloud_verification_requests', requestId);
  const reqSnap = await getDoc(reqRef);
  if (!reqSnap.exists()) {
    throw new Error('Demande d’accréditation introuvable.');
  }

  const reqData = reqSnap.data() as VerificationRequest;
  const now = new Date().toISOString();

  // Mettre à jour la demande
  await setDoc(
    reqRef,
    {
      status: decision,
      adminNotes: adminNotes || (decision === 'approved' ? 'Accréditation validée par la Rédaction en Chef' : 'Demande rejetée'),
      reviewedAt: now,
    },
    { merge: true }
  );

  // Mettre à jour l'utilisateur cible
  const targetUserId = reqData.userId;
  const targetUpdates: Partial<User> = {
    verificationStatus: decision,
    isVerified: decision === 'approved',
    role: decision === 'approved' ? 'journalist' : 'citoyen',
    accountType: decision === 'approved' ? 'journalist' : 'citoyen',
    mediaName: decision === 'approved' ? (reqData.mediaName || 'Média Agréé') : undefined,
    updatedAt: now,
  };

  try {
    const userRef = doc(firestore, 'users', targetUserId);
    await setDoc(userRef, targetUpdates, { merge: true });

    const cloudUserRef = doc(firestore, 'cloud_users', targetUserId);
    await setDoc(cloudUserRef, targetUpdates, { merge: true });
  } catch (err) {
    console.warn('[Firebase] Erreur mise à jour utilisateur promu:', err);
  }
}

/**
 * Récupère les articles directement depuis Cloud Firestore
 */
export async function fetchArticlesFromCloud(options: {
  categoryId?: string;
  limitCount?: number;
} = {}): Promise<Article[]> {
  if (!firestore) return [];

  try {
    const colRef = collection(firestore, 'cloud_articles');
    let q;
    if (options.categoryId) {
      q = query(colRef, where('categoryId', '==', options.categoryId), fsLimit(options.limitCount || 25));
    } else {
      q = query(colRef, fsLimit(options.limitCount || 25));
    }

    const snap = await getDocs(q);
    const articles: Article[] = [];
    snap.forEach((d) => {
      articles.push(d.data() as Article);
    });

    // Tri par date décroissante
    articles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return articles;
  } catch (err) {
    console.warn('[Firebase Mobile] Erreur chargement cloud_articles:', err);
    return [];
  }
}

/**
 * Récupère les catégories directement depuis Cloud Firestore
 */
export async function fetchCategoriesFromCloud(): Promise<Category[]> {
  if (!firestore) return [];

  try {
    const colRef = collection(firestore, 'cloud_categories');
    const snap = await getDocs(colRef);
    const list: Category[] = [];
    snap.forEach((d) => {
      list.push(d.data() as Category);
    });
    list.sort((a, b) => (a.order || 99) - (b.order || 99));
    return list;
  } catch (err) {
    console.warn('[Firebase Mobile] Erreur chargement cloud_categories:', err);
    return [];
  }
}

/**
 * Récupère les commentaires d'un article depuis Firestore
 */
export async function fetchCommentsFromCloud(articleId: string): Promise<Comment[]> {
  if (!firestore) return [];

  try {
    const colRef = collection(firestore, 'cloud_comments');
    const q = query(colRef, where('articleId', '==', articleId));
    const snap = await getDocs(q);
    const comments: Comment[] = [];
    snap.forEach((d) => comments.push(d.data() as Comment));
    comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    return comments;
  } catch (err) {
    console.warn('[Firebase Mobile] Erreur chargement cloud_comments:', err);
    return [];
  }
}

/**
 * Ajoute un commentaire dans Firestore
 */
export async function addCommentToCloud(
  articleId: string,
  content: string,
  currentUser: User
): Promise<Comment | null> {
  if (!firestore) return null;

  try {
    const newComment: Comment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      articleId,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorAvatar: currentUser.avatar,
      authorRole: currentUser.role,
      authorIsVerified: currentUser.isVerified,
      content: content.trim(),
      likesCount: 0,
      createdAt: new Date().toISOString(),
    };

    const docRef = doc(firestore, 'cloud_comments', newComment.id);
    await setDoc(docRef, newComment);
    return newComment;
  } catch (err) {
    console.warn('[Firebase Mobile] Erreur ajout commentaire cloud:', err);
    return null;
  }
}

/**
 * Récupère les notifications d'un utilisateur depuis Firestore
 */
export async function fetchNotificationsFromCloud(userId: string): Promise<Notification[]> {
  if (!firestore) return [];

  try {
    const colRef = collection(firestore, 'cloud_notifications');
    const q = query(colRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    const notifs: Notification[] = [];
    snap.forEach((d) => notifs.push(d.data() as Notification));
    notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return notifs;
  } catch (err) {
    console.warn('[Firebase Mobile] Erreur fetchNotificationsFromCloud:', err);
    return [];
  }
}

export async function resetPasswordWithFirebase(email: string): Promise<void> {
  if (!auth) throw new Error('Firebase Auth n’est pas initialisé.');
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (err: any) {
    throw new Error(mapFirebaseError(err.code || ''));
  }
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
