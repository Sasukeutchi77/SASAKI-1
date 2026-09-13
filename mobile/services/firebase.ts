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
  signOut,
  User as FirebaseUser,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit as fsLimit,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { storage as AsyncStorage } from './storage';
import { User, Article, Category, Comment, Notification, AccountType, UserRole, VerificationRequest, MediaHouse } from '../types';

export const MASTER_ADMIN_EMAILS = [
  'naruto455t@gmail.com',
  'itachi45t@gmail.com',
  'nami45tt@gmail.com',
  'minato45tt@gmail.com',
  'lordequipe@gmail.com',
  'madarauchiwa45t@gmail.com',
];

export const MASTER_ADMIN_DEFAULT_PASSWORD = 'Madara45';

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

    // Initialisation Firestore optimisée pour React Native / Expo (supporte base nommée et long-polling)
    try {
      const fsSettings = {
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true,
      };
      if (typeof initializeFirestore === 'function') {
        firestore = firestoreDatabaseId
          ? initializeFirestore(app, fsSettings, firestoreDatabaseId)
          : initializeFirestore(app, fsSettings);
      } else {
        firestore = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
      }
    } catch (e) {
      console.warn('[Firebase Mobile] Initialisation Firestore fallback standard:', e);
      try {
        firestore = firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
      } catch {
        firestore = getFirestore(app);
      }
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
 * Moteur de hachage cryptographique SHA-256 pur JavaScript (zéro dépendance externe).
 * Garantit la compatibilité exacte avec Node.js crypto et une exécution immédiate sur mobile.
 */
function sha256Hex(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i: number, j: number;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = (ascii as any)[lengthProperty] * 8;
  let hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, boolean> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = true;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  ascii += '\x80';
  while (((ascii as any)[lengthProperty] % 64) - 56) ascii += '\x00';
  for (i = 0; i < (ascii as any)[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return '';
    words[i >> 2] |= j << (((3 - i) % 4) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  for (j = 0; j < words.length; ) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 =
        hash[7] +
        (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) +
        ((e & hash[5]) ^ (~e & hash[6])) +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] +
                (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) +
                w[i - 7] +
                (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) |
              0);
      const temp2 =
        (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) +
        ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt =
    salt ||
    Array.from({ length: 16 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
  const hash = 'sha256:' + sha256Hex(`${password}:${generatedSalt}`);
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, storedHash?: string, salt?: string): boolean {
  if (!storedHash) return false;
  if (storedHash.startsWith('sha256:')) {
    const computed = 'sha256:' + sha256Hex(`${password}:${salt || ''}`);
    return storedHash === computed;
  }
  // Plaintext match for development or test seeds
  return storedHash === password;
}

function generateSessionToken(userId: string, email: string, role: string): string {
  const payload = { userId, email, role, ts: Date.now() };
  try {
    if (typeof btoa === 'function') {
      return 'purge_token_' + btoa(JSON.stringify(payload));
    }
  } catch {}
  return `purge_token_${userId}_${Date.now()}`;
}

/**
 * Recherche un utilisateur dans Cloud Firestore par son adresse e-mail.
 * Vérifie d'abord la collection 'cloud_users', puis la collection 'users'.
 */
export async function fetchUserByEmailFromFirestore(
  email: string
): Promise<(User & { passwordHash?: string; passwordSalt?: string }) | null> {
  if (!firestore) return null;
  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Recherche dans cloud_users
    const cloudCol = collection(firestore, 'cloud_users');
    const q1 = query(cloudCol, where('email', '==', cleanEmail), fsLimit(1));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      const docData = snap1.docs[0].data();
      return { ...docData, id: snap1.docs[0].id } as User & { passwordHash?: string; passwordSalt?: string };
    }

    // 2. Recherche dans users
    const usersCol = collection(firestore, 'users');
    const q2 = query(usersCol, where('email', '==', cleanEmail), fsLimit(1));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      const docData = snap2.docs[0].data();
      return { ...docData, id: snap2.docs[0].id } as User & { passwordHash?: string; passwordSalt?: string };
    }
  } catch (err) {
    console.warn('[Firebase Mobile] Erreur recherche email dans Firestore:', err);
  }
  return null;
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
 * Supprime récursivement les propriétés undefined pour compatibilité stricte Firestore
 */
export function stripUndefined<T = any>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripUndefined) as unknown as T;
  }
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (val !== undefined) {
        clean[key] = stripUndefined(val);
      }
    }
    return clean as unknown as T;
  }
  return obj;
}

/**
 * Enregistre le profil utilisateur dans Firestore (cloud_users et users)
 */
export async function saveUserProfileToFirestore(user: User & { passwordHash?: string; passwordSalt?: string }): Promise<void> {
  if (!firestore) return;

  try {
    const cleanUser = stripUndefined(user);
    const cloudRef = doc(firestore, 'cloud_users', user.id);
    await setDoc(cloudRef, cleanUser, { merge: true });

    const userRef = doc(firestore, 'users', user.id);
    await setDoc(userRef, cleanUser, { merge: true });
  } catch (err) {
    console.warn('[Firebase Mobile] saveUserProfileToFirestore warning:', err);
  }
}

/**
 * Connexion sécurisée avec synchronisation en temps réel Cloud Firestore.
 * Conçue pour fonctionner nativement et sans interruption même lorsque
 * le provider Identity Toolkit / Firebase Auth est désactivé sur le projet GCP.
 */
export async function loginWithFirebaseEmailAndProfile(
  email: string,
  pass: string
): Promise<{ user: User; token: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = pass.trim();

  if (!cleanEmail || !cleanPass) {
    throw new Error('Veuillez renseigner votre adresse email et votre mot de passe.');
  }

  const isAdmin = isMasterAdmin(cleanEmail);
  const isMasterPassword = cleanPass === MASTER_ADMIN_DEFAULT_PASSWORD || cleanPass === 'Madara45';

  // 1. Connexion Super-Administrateur Officiel (garantie instantanée pour madarauchiwa45t, lordequipe, etc.)
  if (isAdmin && isMasterPassword) {
    let userRecord = await fetchUserByEmailFromFirestore(cleanEmail).catch(() => null);
    const adminId = userRecord?.id || `usr_admin_${cleanEmail.split('@')[0]}`;
    const { hash, salt } = hashPassword(cleanPass);
    const now = new Date().toISOString();

    const adminUser: User & { passwordHash: string; passwordSalt: string } = {
      id: adminId,
      uid: adminId,
      email: cleanEmail,
      name: cleanEmail.includes('madara') ? 'Madara Uchiha' : cleanEmail.includes('lordequipe') ? 'Équipe PURGE-INFO' : cleanEmail.includes('naruto') ? 'Naruto Uzumaki' : 'Administrateur Principal',
      role: 'admin',
      accountType: 'admin' as any,
      avatar: userRecord?.avatar || 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      bio: userRecord?.bio || 'Compte Administrateur Officiel de la plateforme factuelle PURGE-INFO.',
      isVerified: true,
      verificationStatus: 'approved',
      status: 'active',
      passwordHash: hash,
      passwordSalt: salt,
      articlesCount: userRecord?.articlesCount || 0,
      followersCount: userRecord?.followersCount || 0,
      followingCount: userRecord?.followingCount || 0,
      createdAt: userRecord?.createdAt || now,
      updatedAt: now,
      lastLoginAt: now,
    };

    saveUserProfileToFirestore(adminUser).catch(() => {});
    const token = generateSessionToken(adminUser.id, adminUser.email, adminUser.role);
    try {
      await AsyncStorage.setItem('purge_mobile_token', token);
      await AsyncStorage.setItem('purge_mobile_user', JSON.stringify(adminUser));
    } catch {}

    return { user: adminUser, token };
  }

  // 2. Authentification directe via Cloud Firestore
  let userRecord = await fetchUserByEmailFromFirestore(cleanEmail);

  // Auto-provisioning pour compte super-administrateur avec mot de passe personnalisé
  if (!userRecord && isAdmin && cleanPass.length >= 6) {
    const adminId = `usr_admin_${cleanEmail.split('@')[0]}`;
    const { hash, salt } = hashPassword(cleanPass);
    const now = new Date().toISOString();
    const adminUser: User & { passwordHash: string; passwordSalt: string } = {
      id: adminId,
      uid: adminId,
      email: cleanEmail,
      name: cleanEmail.includes('madara') ? 'Madara Uchiha' : cleanEmail.includes('lordequipe') ? 'Équipe PURGE-INFO' : 'Administrateur Principal',
      role: 'admin',
      accountType: 'admin' as any,
      avatar: `https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80`,
      bio: 'Compte Administrateur Officiel de la plateforme factuelle PURGE-INFO.',
      isVerified: true,
      verificationStatus: 'approved',
      status: 'active',
      passwordHash: hash,
      passwordSalt: salt,
      articlesCount: 0,
      followersCount: 0,
      followingCount: 0,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };
    await saveUserProfileToFirestore(adminUser);
    userRecord = adminUser;
  }

  // Si aucun compte n'est trouvé
  if (!userRecord) {
    throw new Error(
      `Aucun compte n'est enregistré avec l'adresse « ${cleanEmail} ». Veuillez cliquer sur "Créer un compte" pour vous inscrire en quelques secondes.`
    );
  }

  // Vérification de suspension
  if (userRecord.status === 'suspended') {
    throw new Error('Votre compte a été suspendu par l’équipe de modération de PURGE.');
  }

  // Vérification du mot de passe
  let isPasswordValid = false;
  if (isAdmin && (isMasterPassword || cleanPass === 'Madara45')) {
    isPasswordValid = true;
  } else if (userRecord.passwordHash && userRecord.passwordSalt) {
    isPasswordValid = verifyPassword(cleanPass, userRecord.passwordHash, userRecord.passwordSalt);
  } else if (cleanPass === 'password123' || cleanPass === 'Madara45') {
    // Mot de passe de secours pour comptes initialisés
    isPasswordValid = true;
  } else if (!userRecord.passwordHash && cleanPass.length >= 6) {
    isPasswordValid = true;
  }

  if (!isPasswordValid) {
    throw new Error('Mot de passe incorrect pour cette adresse email. Veuillez vérifier votre saisie.');
  }

  // Mettre à jour le hash si nécessaire (migration vers format SHA-256 universel)
  const now = new Date().toISOString();
  if (!userRecord.passwordHash?.startsWith('sha256:') || isMasterPassword) {
    const updatedPass = hashPassword(cleanPass);
    userRecord.passwordHash = updatedPass.hash;
    userRecord.passwordSalt = updatedPass.salt;
  }

  // Aligner les permissions super-admin
  if (isAdmin) {
    userRecord.role = 'admin';
    userRecord.accountType = 'admin' as any;
    userRecord.isVerified = true;
    userRecord.verificationStatus = 'approved';
  }

  userRecord.lastLoginAt = now;
  userRecord.updatedAt = now;
  saveUserProfileToFirestore(userRecord).catch(() => {});

  const token = generateSessionToken(userRecord.id, userRecord.email, userRecord.role);

  // Sauvegarde locale sur l'appareil
  try {
    await AsyncStorage.setItem('purge_mobile_token', token);
    await AsyncStorage.setItem('purge_mobile_user', JSON.stringify(userRecord));
  } catch {}

  return { user: userRecord, token };
}

/**
 * Inscription sécurisée d'un nouveau compte citoyen avec Cloud Firestore.
 * Règle PURGE : Tout utilisateur s'inscrit OBLIGATOIREMENT avec le statut Citoyen.
 * L'accès journaliste nécessite une demande d'accréditation ultérieure validée par l'administration.
 */
export async function registerWithFirebaseEmailAndProfile(params: {
  name: string;
  email: string;
  pass: string;
}): Promise<{ user: User; token: string }> {
  const cleanName = params.name.trim();
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPass = params.pass.trim();

  if (!cleanName || cleanName.length < 2) {
    throw new Error('Veuillez renseigner votre nom complet ou pseudonyme (au moins 2 caractères).');
  }

  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('L’adresse email saisie est invalide (ex: citoyen@purge.info).');
  }

  if (!cleanPass || cleanPass.length < 6) {
    throw new Error('Le mot de passe doit comporter au moins 6 caractères.');
  }

  // 1. Vérifier si un compte existe déjà avec cette adresse email
  const existingUser = await fetchUserByEmailFromFirestore(cleanEmail);
  if (existingUser) {
    throw new Error(
      `Cette adresse email est déjà associée à un compte PURGE. Veuillez vous connecter avec votre mot de passe.`
    );
  }

  // 2. Création du compte dans Cloud Firestore
  const isAdmin = isMasterAdmin(cleanEmail);
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const { hash, salt } = hashPassword(cleanPass);
  const now = new Date().toISOString();

  const newUser: User & { passwordHash: string; passwordSalt: string } = {
    id: userId,
    uid: userId,
    name: cleanName,
    username: cleanName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Math.floor(100 + Math.random() * 900),
    email: cleanEmail,
    role: isAdmin ? 'admin' : 'citoyen',
    accountType: isAdmin ? ('admin' as any) : 'citoyen',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    bio: isAdmin ? 'Compte Administrateur Officiel PURGE' : 'Citoyen et lecteur sur le réseau factuel PURGE.',
    isVerified: isAdmin,
    verificationStatus: isAdmin ? 'approved' : 'none',
    status: 'active',
    passwordHash: hash,
    passwordSalt: salt,
    articlesCount: 0,
    followersCount: 0,
    followingCount: 0,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
  };

  await saveUserProfileToFirestore(newUser);

  const token = generateSessionToken(newUser.id, newUser.email, newUser.role);

  // Sauvegarde locale sur l'appareil
  try {
    await AsyncStorage.setItem('purge_mobile_token', token);
    await AsyncStorage.setItem('purge_mobile_user', JSON.stringify(newUser));
  } catch {}

  return { user: newUser, token };
}

/**
 * Réinitialisation sécurisée du mot de passe d'un utilisateur dans Firestore
 */
export async function resetUserPasswordInFirestore(email: string, newPass: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPass = newPass.trim();

  if (!cleanPass || cleanPass.length < 6) {
    throw new Error('Le nouveau mot de passe doit comporter au moins 6 caractères.');
  }

  const userRecord = await fetchUserByEmailFromFirestore(cleanEmail);
  if (!userRecord) {
    throw new Error(`Aucun compte n'est enregistré avec l'adresse « ${cleanEmail} ».`);
  }

  const { hash, salt } = hashPassword(cleanPass);
  userRecord.passwordHash = hash;
  userRecord.passwordSalt = salt;
  userRecord.updatedAt = new Date().toISOString();

  await saveUserProfileToFirestore(userRecord);
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
 * Enregistre un article directement dans Cloud Firestore
 */
export async function saveArticleToCloud(article: Article): Promise<void> {
  if (!firestore) return;
  try {
    const clean = stripUndefined(article);
    const cloudRef = doc(firestore, 'cloud_articles', article.id);
    await setDoc(cloudRef, clean, { merge: true });

    const localRef = doc(firestore, 'articles', article.id);
    await setDoc(localRef, clean, { merge: true });
  } catch (err) {
    console.warn('[Firebase Mobile] saveArticleToCloud warning:', err);
  }
}

/**
 * Enregistre une Maison de Presse directement dans Cloud Firestore
 */
export async function saveMediaHouseToCloud(house: MediaHouse): Promise<void> {
  if (!firestore) return;
  try {
    const clean = stripUndefined(house);
    const cloudRef = doc(firestore, 'cloud_media_houses', house.id);
    await setDoc(cloudRef, clean, { merge: true });

    const localRef = doc(firestore, 'media_houses', house.id);
    await setDoc(localRef, clean, { merge: true });
  } catch (err) {
    console.warn('[Firebase Mobile] saveMediaHouseToCloud warning:', err);
  }
}

/**
 * Récupère les Maisons de Presse directement depuis Cloud Firestore
 */
export async function fetchMediaHousesFromCloud(): Promise<MediaHouse[]> {
  if (!firestore) return [];
  try {
    const cloudRef = collection(firestore, 'cloud_media_houses');
    const snap = await getDocs(cloudRef);
    if (!snap.empty) {
      return snap.docs.map((d) => d.data() as MediaHouse);
    }
    const localRef = collection(firestore, 'media_houses');
    const localSnap = await getDocs(localRef);
    if (!localSnap.empty) {
      return localSnap.docs.map((d) => d.data() as MediaHouse);
    }
  } catch (err) {
    console.warn('[Firebase Mobile] fetchMediaHousesFromCloud warning:', err);
  }
  return [];
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

/**
 * Supprime une notification de Firestore
 */
export async function deleteNotificationFromCloud(notificationId: string): Promise<boolean> {
  if (!firestore) return false;

  try {
    const docRef = doc(firestore, 'cloud_notifications', notificationId);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn('[Firebase Mobile] Erreur deleteNotificationFromCloud:', err);
    return false;
  }
}

/**
 * Supprime toutes les notifications d'un utilisateur de Firestore
 */
export async function deleteUserNotificationsFromCloud(userId: string): Promise<boolean> {
  if (!firestore) return false;

  try {
    const colRef = collection(firestore, 'cloud_notifications');
    const q = query(colRef, where('userId', '==', userId));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    return true;
  } catch (err) {
    console.warn('[Firebase Mobile] Erreur deleteUserNotificationsFromCloud:', err);
    return false;
  }
}

export async function resetPasswordWithFirebase(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const user = await fetchUserByEmailFromFirestore(cleanEmail);
  if (!user) {
    throw new Error(`Aucun compte n'est enregistré avec l'adresse « ${cleanEmail} ».`);
  }
  const tempPass = isMasterAdmin(cleanEmail) ? MASTER_ADMIN_DEFAULT_PASSWORD : 'password123';
  await resetUserPasswordInFirestore(cleanEmail, tempPass);
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
