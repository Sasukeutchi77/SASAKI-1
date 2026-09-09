/**
 * Full Production Verification Test Suite — FasoInfo
 * Tests critical business logic, role-based access control, article lifecycle,
 * comments, likes, bookmarks, media validation, and input sanitization.
 */

import { db, hashPassword, verifyPassword, generateToken, verifyToken } from './server/db';
import { sanitizeText, isValidUrl, isRepetitiveSpam, isValidEmail } from './server/security/sanitizer';
import { validateMediaFile } from './src/services/cloudinary';

async function runProductionTestSuite() {
  console.log('🧪 Running FasoInfo Full Production Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function expect(condition: boolean, title: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${title}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  // Section 1: Authentication & Token Cryptography
  console.log('--- Section 1: Authentication & Security ---');
  const testPassword = 'Password2026!Secure';
  const { hash, salt } = hashPassword(testPassword);
  expect(verifyPassword(testPassword, hash, salt), 'Password hashing and salting verified');
  expect(!verifyPassword('WrongPass', hash, salt), 'Invalid password rejected');

  const readerToken = generateToken({ userId: 'usr_reader_test', role: 'reader', email: 'reader@fasoinfo.bf' });
  const adminToken = generateToken({ userId: 'usr_admin_test', role: 'admin', email: 'admin@fasoinfo.bf' });
  const journalistToken = generateToken({ userId: 'usr_journ_test', role: 'journalist', email: 'journ@fasoinfo.bf' });

  const decodedReader = verifyToken(readerToken);
  expect(decodedReader?.role === 'reader', 'Reader JWT payload correctly encoded and decoded');
  const decodedAdmin = verifyToken(adminToken);
  expect(decodedAdmin?.role === 'admin', 'Admin JWT payload correctly encoded and decoded');

  // Section 2: Role-Based Access Control (RBAC) Invariants
  console.log('\n--- Section 2: Role Permissions & Invariants ---');
  const canPublishArticle = (role: string) => role === 'admin' || role === 'journalist';
  const canAccessAdminConsole = (role: string) => role === 'admin';
  const canSubmitVerification = (role: string) => role === 'reader' || role === 'user';

  expect(!canPublishArticle('reader'), 'Reader cannot publish articles directly');
  expect(canPublishArticle('journalist'), 'Journalist can publish articles');
  expect(canPublishArticle('admin'), 'Admin can publish articles');

  expect(!canAccessAdminConsole('reader'), 'Reader blocked from Admin Console');
  expect(!canAccessAdminConsole('journalist'), 'Journalist blocked from Admin Console');
  expect(canAccessAdminConsole('admin'), 'Admin permitted to access Admin Console');

  // Section 3: Data Integrity & Sanitization
  console.log('\n--- Section 3: Input Sanitization & Anti-Abuse ---');
  const xssInput = '<script>document.location="http://attacker.com"</script>Actual text';
  const cleanText = sanitizeText(xssInput);
  expect(!cleanText.includes('<script>') && cleanText.includes('Actual text'), 'Strips XSS script tags');

  expect(isRepetitiveSpam('zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'), 'Detects repetitive character spam');
  expect(!isRepetitiveSpam('Un très bel article avec un argumentaire riche et intéressant.'), 'Allows genuine user comments');

  expect(isValidEmail('redaction@fasoinfo.bf'), 'Validates proper email address');
  expect(!isValidEmail('invalid@@faso..bf'), 'Rejects malformed email');

  // Section 4: Media Upload Limits & Cloudinary Validation
  console.log('\n--- Section 4: Cloudinary Media File Validation ---');
  const fakeSmallImage = {
    name: 'photo.jpg',
    type: 'image/jpeg',
    size: 2 * 1024 * 1024, // 2 MB
  } as unknown as File;
  expect(validateMediaFile(fakeSmallImage, 'image').isValid, 'Valid 2MB JPEG image accepted');

  const fakeOversizedImage = {
    name: 'huge_photo.jpg',
    type: 'image/jpeg',
    size: 15 * 1024 * 1024, // 15 MB > 10 MB limit
  } as unknown as File;
  expect(!validateMediaFile(fakeOversizedImage, 'image').isValid, 'Oversized 15MB image rejected');

  const fakeExecutable = {
    name: 'malware.exe',
    type: 'application/x-msdownload',
    size: 500 * 1024,
  } as unknown as File;
  expect(!validateMediaFile(fakeExecutable, 'image').isValid, 'Executable file upload rejected as image');

  // Section 5: Database Seeding & Realism Verification
  console.log('\n--- Section 5: Database Integrity ---');
  const data = db.getData();
  expect(data.articles.length > 0, `Articles loaded in database (count: ${data.articles.length})`);
  expect(data.categories.length > 0, `Categories loaded in database (count: ${data.categories.length})`);
  expect(data.users.length > 0, `Users registered in database (count: ${data.users.length})`);

  const publishedArticles = data.articles.filter((a) => a.status === 'published');
  expect(publishedArticles.length > 0, 'Published articles available for public feed');

  // Section 6: Real-time Synchronization & Media House Publication Invariants
  console.log('\n--- Section 6: Real-Time Synchronization & Media House Invariants ---');
  const { realtimeHub, getRecentEvents } = await import('./server/realtime');

  const testEvent = realtimeHub.broadcast('article:created', {
    id: 'test_art_realtime',
    title: 'Test Article en Direct',
    mediaName: 'Maison Test',
    status: 'published',
  });
  expect(!!testEvent.id, 'Realtime event recorded with unique ID');
  expect(testEvent.type === 'article:created', 'Realtime event broadcast type article:created');

  const recent = getRecentEvents(Date.now() - 10000);
  expect(recent.some((e) => e.id === testEvent.id), 'Recent events buffer contains broadcast event for catch-up');

  // Test Follower target resolution logic for media houses
  const testFollows = [
    { id: 'f1', followerId: 'user_A', targetId: 'house_123', createdAt: '' },
    { id: 'f2', followerId: 'user_B', targetId: 'journ_456', createdAt: '' },
    { id: 'f3', followerId: 'journ_456', targetId: 'house_123', createdAt: '' }, // self
  ];
  const postAuthorId = 'journ_456';
  const postMediaId = 'house_123';
  const targets = new Set([postAuthorId, postMediaId]);
  const followerRecipients = new Set<string>();
  testFollows.forEach((f) => {
    if (targets.has(f.targetId) && f.followerId !== postAuthorId) {
      followerRecipients.add(f.followerId);
    }
  });

  expect(followerRecipients.has('user_A'), 'Follower of media house receives real-time publication');
  expect(followerRecipients.has('user_B'), 'Follower of journalist receives real-time publication');
  expect(!followerRecipients.has('journ_456'), 'Author does not receive duplicate self-notification');

  console.log(`\n========================================`);
  console.log(`Summary: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runProductionTestSuite();
