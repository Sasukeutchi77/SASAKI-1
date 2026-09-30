import { initFirestore, CLOUD_COLLECTIONS } from '../server/firestoreService';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

async function clearMockArticles() {
  console.log('[Script] Starting clearance of seeded mock articles...');

  // 1. Clean Cloud Firestore
  const db = initFirestore();
  if (db) {
    try {
      console.log('[Script] Connecting to Cloud Firestore...');
      const articlesSnap = await getDocs(collection(db, CLOUD_COLLECTIONS.articles));
      console.log(`[Script] Found ${articlesSnap.size} articles in Cloud Firestore.`);
      
      for (const articleDoc of articlesSnap.docs) {
        console.log(`[Script] Deleting article from Firestore: ${articleDoc.id} - ${articleDoc.data().title}`);
        await deleteDoc(doc(db, CLOUD_COLLECTIONS.articles, articleDoc.id));
      }

      // Also clean comments linked to old articles
      const commentsSnap = await getDocs(collection(db, CLOUD_COLLECTIONS.comments));
      console.log(`[Script] Found ${commentsSnap.size} comments in Cloud Firestore.`);
      for (const commentDoc of commentsSnap.docs) {
        console.log(`[Script] Deleting orphan comment from Firestore: ${commentDoc.id}`);
        await deleteDoc(doc(db, CLOUD_COLLECTIONS.comments, commentDoc.id));
      }

      console.log('[Script] Cloud Firestore articles and comments cleared successfully.');
    } catch (err) {
      console.error('[Script] Error clearing Cloud Firestore:', err);
    }
  } else {
    console.warn('[Script] Cloud Firestore not configured.');
  }

  // 2. Clean local db.json files
  const pathsToClean = [
    path.join(process.cwd(), 'data', 'db.json'),
    path.join('/tmp', 'purge_info_data', 'db.json'),
  ];

  for (const dbPath of pathsToClean) {
    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf-8');
        const data = JSON.parse(raw);
        const articleCountBefore = data.articles?.length || 0;
        data.articles = [];
        data.comments = [];
        data.likes = (data.likes || []).filter((l: any) => false);
        data.bookmarks = (data.bookmarks || []).filter((b: any) => false);
        data.views = (data.views || []).filter((v: any) => false);

        // Reset article counts on users and categories
        if (Array.isArray(data.users)) {
          data.users.forEach((u: any) => {
            u.articlesCount = 0;
          });
        }
        if (Array.isArray(data.categories)) {
          data.categories.forEach((c: any) => {
            c.articleCount = 0;
          });
        }
        if (Array.isArray(data.mediaHouses)) {
          data.mediaHouses.forEach((m: any) => {
            m.articlesCount = 0;
          });
        }

        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`[Script] Cleared ${articleCountBefore} articles from ${dbPath}.`);
      } catch (e) {
        console.warn(`[Script] Could not clean ${dbPath}:`, e);
      }
    }
  }

  console.log('[Script] Finished clearing mock articles! Ready for real human publications.');
}

clearMockArticles()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
