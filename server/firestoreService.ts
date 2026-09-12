import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  Firestore,
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import type { DatabaseSchema, UserWithPassword } from './db';

// Helper to remove undefined values since Firestore rejects undefined
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return (obj.map((item) => (item === undefined ? null : sanitizeForFirestore(item))) as unknown) as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      clean[key] = sanitizeForFirestore(value);
    }
  }
  return clean as T;
}

let firebaseApp: FirebaseApp | null = null;
let firestoreDb: Firestore | null = null;
let isConfigured = false;

// Load Firebase configuration
function getFirebaseConfig(): { config: any; databaseId?: string } | null {
  try {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed.projectId && parsed.apiKey) {
        return {
          config: parsed,
          databaseId: parsed.firestoreDatabaseId || undefined,
        };
      }
    }
  } catch (err) {
    console.warn('[FirestoreService] Could not read firebase-applet-config.json:', err);
  }

  // Fallback to environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  if (projectId && apiKey) {
    return {
      config: {
        projectId,
        apiKey,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET,
        appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID,
      },
      databaseId: process.env.FIREBASE_DATABASE_ID || undefined,
    };
  }

  return null;
}

export function initFirestore(): Firestore | null {
  if (firestoreDb) return firestoreDb;

  const confData = getFirebaseConfig();
  if (!confData) {
    console.warn('[FirestoreService] No Firebase credentials found. Cloud persistence cannot be initialized.');
    return null;
  }

  try {
    firebaseApp = getApps().length > 0 ? getApp() : initializeApp(confData.config);
    firestoreDb = confData.databaseId ? getFirestore(firebaseApp, confData.databaseId) : getFirestore(firebaseApp);
    isConfigured = true;
    console.log('[FirestoreService] Successfully connected to Cloud Firestore (Database:', confData.databaseId || 'default', ')');
    return firestoreDb;
  } catch (err) {
    console.error('[FirestoreService] Failed to initialize Cloud Firestore client:', err);
    return null;
  }
}

export const CLOUD_COLLECTIONS = {
  users: 'cloud_users',
  categories: 'cloud_categories',
  articles: 'cloud_articles',
  comments: 'cloud_comments',
  likes: 'cloud_likes',
  commentLikes: 'cloud_comment_likes',
  bookmarks: 'cloud_bookmarks',
  follows: 'cloud_follows',
  notifications: 'cloud_notifications',
  verificationRequests: 'cloud_verification_requests',
  reports: 'cloud_reports',
  views: 'cloud_views',
  mediaHouses: 'cloud_media_houses',
  adminLogs: 'cloud_admin_logs',
  mediaRecords: 'cloud_media_records',
} as const;

/**
 * Loads the complete database state from Cloud Firestore.
 * Returns null if the cloud collections are empty (requiring initial seeding).
 */
export async function loadStateFromCloud(): Promise<DatabaseSchema | null> {
  const db = initFirestore();
  if (!db) return null;

  try {
    // Check if cloud_meta or cloud_users exists to determine if cloud is initialized
    const metaDoc = await getDoc(doc(db, 'cloud_meta', 'state'));
    const usersSnap = await getDocs(collection(db, CLOUD_COLLECTIONS.users));

    if (!metaDoc.exists() && usersSnap.empty) {
      console.log('[FirestoreService] Cloud Firestore is empty. Initial migration required.');
      return null;
    }

    console.log('[FirestoreService] Loading existing records from Cloud Firestore...');

    const [
      users,
      categories,
      articles,
      comments,
      likes,
      commentLikes,
      bookmarks,
      follows,
      notifications,
      verificationRequests,
      reports,
      views,
      mediaHouses,
      adminLogs,
      mediaRecords,
    ] = await Promise.all([
      getDocs(collection(db, CLOUD_COLLECTIONS.users)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.categories)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.articles)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.comments)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.likes)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.commentLikes)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.bookmarks)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.follows)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.notifications)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.verificationRequests)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.reports)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.views)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.mediaHouses)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.adminLogs)).then((s) => s.docs.map((d) => d.data())),
      getDocs(collection(db, CLOUD_COLLECTIONS.mediaRecords)).then((s) => s.docs.map((d) => d.data())),
    ]);

    console.log(
      `[FirestoreService] Loaded from Cloud: ${users.length} users, ${articles.length} articles, ${mediaHouses.length} houses.`
    );

    return {
      users: users as any,
      categories: categories as any,
      articles: articles as any,
      comments: comments as any,
      likes: likes as any,
      commentLikes: commentLikes as any,
      bookmarks: bookmarks as any,
      follows: follows as any,
      notifications: notifications as any,
      verificationRequests: verificationRequests as any,
      reports: reports as any,
      views: views as any,
      mediaHouses: mediaHouses as any,
      adminLogs: adminLogs as any,
      mediaRecords: mediaRecords as any,
    };
  } catch (err) {
    console.error('[FirestoreService] Error reading collections from Cloud Firestore:', err);
    return null;
  }
}

/**
 * Seeds initial data into Cloud Firestore.
 */
export async function seedStateToCloud(initialData: DatabaseSchema): Promise<void> {
  const db = initFirestore();
  if (!db) return;

  console.log('[FirestoreService] Migrating initial schema and users to Cloud Firestore...');

  try {
    const collectionsToSeed: { name: string; items: any[] }[] = [
      { name: CLOUD_COLLECTIONS.users, items: initialData.users },
      { name: CLOUD_COLLECTIONS.categories, items: initialData.categories },
      { name: CLOUD_COLLECTIONS.articles, items: initialData.articles },
      { name: CLOUD_COLLECTIONS.comments, items: initialData.comments },
      { name: CLOUD_COLLECTIONS.likes, items: initialData.likes },
      { name: CLOUD_COLLECTIONS.commentLikes, items: initialData.commentLikes },
      { name: CLOUD_COLLECTIONS.bookmarks, items: initialData.bookmarks },
      { name: CLOUD_COLLECTIONS.follows, items: initialData.follows },
      { name: CLOUD_COLLECTIONS.notifications, items: initialData.notifications },
      { name: CLOUD_COLLECTIONS.verificationRequests, items: initialData.verificationRequests },
      { name: CLOUD_COLLECTIONS.reports, items: initialData.reports },
      { name: CLOUD_COLLECTIONS.views, items: initialData.views },
      { name: CLOUD_COLLECTIONS.mediaHouses, items: initialData.mediaHouses },
      { name: CLOUD_COLLECTIONS.adminLogs, items: initialData.adminLogs },
      { name: CLOUD_COLLECTIONS.mediaRecords, items: initialData.mediaRecords },
    ];

    for (const col of collectionsToSeed) {
      if (!col.items || col.items.length === 0) continue;

      // Commit in chunks of 300 to respect Firestore batch limits
      const chunkSize = 300;
      for (let i = 0; i < col.items.length; i += chunkSize) {
        const chunk = col.items.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const item of chunk) {
          if (!item.id) continue;
          const ref = doc(db, col.name, String(item.id));
          batch.set(ref, sanitizeForFirestore(item), { merge: true });
        }
        await batch.commit();
      }
    }

    // Set meta doc
    await setDoc(doc(db, 'cloud_meta', 'state'), {
      initialized: true,
      lastUpdatedAt: new Date().toISOString(),
      platform: 'PURGE-INFO-CLOUD',
      version: '1.0.0',
    });

    console.log('[FirestoreService] Successfully seeded all data into Cloud Firestore.');
  } catch (err) {
    console.error('[FirestoreService] Error seeding Cloud Firestore:', err);
  }
}

/**
 * Persist an individual document directly into Cloud Firestore immediately.
 */
export async function persistDocToCloud(collectionName: string, id: string, data: any): Promise<void> {
  const db = initFirestore();
  if (!db || !id) return;

  try {
    const ref = doc(db, collectionName, String(id));
    await setDoc(ref, sanitizeForFirestore(data), { merge: true });
  } catch (err) {
    console.error(`[FirestoreService] Error saving doc ${id} to ${collectionName}:`, err);
  }
}

/**
 * Delete an individual document directly from Cloud Firestore.
 */
export async function deleteDocFromCloud(collectionName: string, id: string): Promise<void> {
  const db = initFirestore();
  if (!db || !id) return;

  try {
    const ref = doc(db, collectionName, String(id));
    await deleteDoc(ref);
  } catch (err) {
    console.error(`[FirestoreService] Error deleting doc ${id} from ${collectionName}:`, err);
  }
}

let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Asynchronously synchronizes in-memory database to Cloud Firestore with debouncing
 * to ensure all changes (likes, views, bulk modifications) are guaranteed saved to the cloud.
 */
export function queueCloudSync(data: DatabaseSchema): void {
  if (syncTimeout) {
    clearTimeout(syncTimeout);
  }

  syncTimeout = setTimeout(async () => {
    syncTimeout = null;
    const db = initFirestore();
    if (!db) return;

    try {
      // Sync users, articles, comments, mediaHouses, bookmarks, likes, follows, notifications
      const collectionsToSync: { name: string; items: any[] }[] = [
        { name: CLOUD_COLLECTIONS.users, items: data.users },
        { name: CLOUD_COLLECTIONS.articles, items: data.articles },
        { name: CLOUD_COLLECTIONS.mediaHouses, items: data.mediaHouses },
        { name: CLOUD_COLLECTIONS.comments, items: data.comments },
        { name: CLOUD_COLLECTIONS.categories, items: data.categories },
        { name: CLOUD_COLLECTIONS.likes, items: data.likes },
        { name: CLOUD_COLLECTIONS.commentLikes, items: data.commentLikes },
        { name: CLOUD_COLLECTIONS.bookmarks, items: data.bookmarks },
        { name: CLOUD_COLLECTIONS.follows, items: data.follows },
        { name: CLOUD_COLLECTIONS.notifications, items: data.notifications },
        { name: CLOUD_COLLECTIONS.verificationRequests, items: data.verificationRequests },
        { name: CLOUD_COLLECTIONS.reports, items: data.reports },
        { name: CLOUD_COLLECTIONS.views, items: data.views },
        { name: CLOUD_COLLECTIONS.adminLogs, items: data.adminLogs },
        { name: CLOUD_COLLECTIONS.mediaRecords, items: data.mediaRecords },
      ];

      for (const col of collectionsToSync) {
        if (!col.items || col.items.length === 0) continue;

        const chunkSize = 250;
        for (let i = 0; i < col.items.length; i += chunkSize) {
          const chunk = col.items.slice(i, i + chunkSize);
          const batch = writeBatch(db);
          for (const item of chunk) {
            if (!item.id) continue;
            const ref = doc(db, col.name, String(item.id));
            batch.set(ref, sanitizeForFirestore(item), { merge: true });
          }
          await batch.commit();
        }
      }

      await setDoc(
        doc(db, 'cloud_meta', 'state'),
        {
          lastUpdatedAt: new Date().toISOString(),
          usersCount: data.users.length,
          articlesCount: data.articles.length,
        },
        { merge: true }
      );
    } catch (err) {
      console.error('[FirestoreService] Background cloud sync error:', err);
    }
  }, 1000); // 1 second debounce
}

function normalizeCloudUserData(data: any): UserWithPassword {
  const isJournalist = data.role === 'journaliste' || data.role === 'journalist' || data.isJournalist === true;
  const isCitizen = data.role === 'citoyen' || data.role === 'user' || data.role === 'reader';
  const role = data.role === 'admin' ? 'admin' : isJournalist ? 'journalist' : 'user';

  return {
    ...data,
    role,
    accountType: isJournalist ? 'journalist' : 'user',
    isVerified: Boolean(data.role === 'admin' || isJournalist || data.isVerified),
    verificationStatus: data.verificationStatus || (isJournalist ? 'approved' : 'none'),
  } as UserWithPassword;
}

/**
 * Searches for a user in Cloud Firestore by email.
 * Guarantees that even if local cache doesn't have the user yet, Cloud Firestore is queried.
 */
export async function findUserByEmailInCloud(email: string): Promise<UserWithPassword | null> {
  const db = initFirestore();
  if (!db || !email) return null;

  try {
    const cleanEmail = email.trim().toLowerCase();
    // Check cloud_users first
    const q1 = query(collection(db, CLOUD_COLLECTIONS.users), where('email', '==', cleanEmail));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return normalizeCloudUserData(snap1.docs[0].data());
    }

    // Check users collection fallback
    const q2 = query(collection(db, 'users'), where('email', '==', cleanEmail));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      return normalizeCloudUserData(snap2.docs[0].data());
    }
  } catch (err) {
    console.warn('[FirestoreService] Error querying user by email in cloud:', err);
  }
  return null;
}

/**
 * Fetches an individual user document by ID directly from Cloud Firestore.
 */
export async function fetchUserByIdFromCloud(id: string): Promise<UserWithPassword | null> {
  const db = initFirestore();
  if (!db || !id) return null;

  try {
    // Check cloud_users first
    const snap1 = await getDoc(doc(db, CLOUD_COLLECTIONS.users, String(id)));
    if (snap1.exists()) {
      return normalizeCloudUserData(snap1.data());
    }

    // Check users collection fallback
    const snap2 = await getDoc(doc(db, 'users', String(id)));
    if (snap2.exists()) {
      return normalizeCloudUserData(snap2.data());
    }
  } catch (err) {
    console.warn(`[FirestoreService] Error fetching user ${id} from cloud:`, err);
  }
  return null;
}
