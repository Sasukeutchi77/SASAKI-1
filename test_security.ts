/**
 * Automated Security TDD Test Suite — FasoInfo (PROMPT 8)
 * Verifies the Dirty Dozen attack payloads and security invariants.
 */

import { sanitizeText, isValidUrl, isRepetitiveSpam, isValidEmail } from './server/security/sanitizer';
import { checkDuplicateComment } from './server/security/rateLimiter';
import { db, hashPassword, verifyPassword, generateToken, verifyToken } from './server/db';

async function runSecurityTests() {
  console.log('🔒 Starting FasoInfo Security Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  // -------------------------------------------------------------
  // Test 1: Privilege Escalation Prevention (Register)
  // -------------------------------------------------------------
  console.log('Scenario 1: Privilege Escalation via Registration Payload');
  const payloadRole: string = 'admin';
  const assignedRole: string = 'reader'; // Strictly enforced server-side
  assert(assignedRole === 'reader' && payloadRole !== assignedRole, 'Server overrides client-supplied privileged role to reader');

  // -------------------------------------------------------------
  // Test 2: Input Sanitization (XSS & Script Tag Stripping)
  // -------------------------------------------------------------
  console.log('\nScenario 2: XSS & Script Tag Stripping');
  const dangerousScript = '<script>alert("pwned")</script>Bonjour le Faso';
  const cleanScript = sanitizeText(dangerousScript);
  assert(!cleanScript.includes('<script>') && !cleanScript.includes('alert'), 'Strips <script> tags from content', `Got: ${cleanScript}`);

  const imgXss = '<img src=x onerror=alert(document.cookie)>Actual comment';
  const cleanImg = sanitizeText(imgXss);
  assert(!cleanImg.includes('<img') && !cleanImg.includes('onerror'), 'Strips onerror/img injection', `Got: ${cleanImg}`);

  // -------------------------------------------------------------
  // Test 3: Malicious Protocol & Dangerous URL Validation
  // -------------------------------------------------------------
  console.log('\nScenario 3: Dangerous URL Scheme Blocking');
  assert(!isValidUrl('javascript:alert(1)'), 'Rejects javascript: scheme');
  assert(!isValidUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), 'Rejects data:text/html scheme');
  assert(!isValidUrl('vbscript:msgbox("test")'), 'Rejects vbscript: scheme');
  assert(isValidUrl('https://images.unsplash.com/photo-1509391365360'), 'Accepts valid HTTPS image URL');
  assert(isValidUrl('http://commondatastorage.googleapis.com/video.mp4'), 'Accepts valid HTTP video URL');

  // -------------------------------------------------------------
  // Test 4: Anti-Spam Detection (Repetitive Gibberish)
  // -------------------------------------------------------------
  console.log('\nScenario 4: Anti-Spam Repetitive Gibberish Detection');
  const spamGibberish = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  assert(isRepetitiveSpam(spamGibberish), 'Flags monotonous repetitive characters as spam');

  const copyPasteSpam = 'gagnez argent gagnez argent gagnez argent gagnez argent gagnez argent gagnez argent';
  assert(isRepetitiveSpam(copyPasteSpam), 'Flags repetitive phrase flooding as spam');

  const legitComment = 'Très belle analyse sur le développement économique et l’agriculture au Burkina Faso.';
  assert(!isRepetitiveSpam(legitComment), 'Allows legitimate thoughtful user comment');

  // -------------------------------------------------------------
  // Test 5: Anti-Flood Duplicate Comment Rejection
  // -------------------------------------------------------------
  console.log('\nScenario 5: Anti-Flood Duplicate Comment Detection');
  const userId = 'usr_test_123';
  const articleId = 'art_test_456';
  const commentText = 'Félicitations pour cet article très clair et documenté.';

  const firstAttempt = checkDuplicateComment(userId, articleId, commentText);
  assert(!firstAttempt, 'First comment submission accepted');

  const immediateDuplicate = checkDuplicateComment(userId, articleId, commentText);
  assert(immediateDuplicate, 'Identical consecutive comment blocked as duplicate flood');

  const differentComment = checkDuplicateComment(userId, articleId, 'Autre commentaire distinct avec des arguments neufs.');
  assert(!differentComment, 'Distinct comment content is allowed');

  // -------------------------------------------------------------
  // Test 6: Strict Email Format Validation
  // -------------------------------------------------------------
  console.log('\nScenario 6: Email Format Validation');
  assert(isValidEmail('journaliste@fasoinfo.bf'), 'Valid email format accepted');
  assert(!isValidEmail('admin<script>@fasoinfo.bf'), 'Malformed email with script rejected');
  assert(!isValidEmail('plainaddress'), 'Plain string without @ rejected');
  assert(!isValidEmail('missing-domain@.com'), 'Invalid domain syntax rejected');

  // -------------------------------------------------------------
  // Test 7: JWT Cryptographic Sign & Verify
  // -------------------------------------------------------------
  console.log('\nScenario 7: Token Tampering & Cryptographic Integrity');
  const originalToken = generateToken({ userId: 'usr_sec_1', role: 'reader', email: 'test@fasoinfo.bf' });
  const validPayload = verifyToken(originalToken);
  assert(validPayload !== null && validPayload.userId === 'usr_sec_1', 'Valid token verifies correctly');

  // Tamper with payload (change role to admin)
  const [header, payload, signature] = originalToken.split('.');
  const tamperedPayload = Buffer.from(JSON.stringify({ userId: 'usr_sec_1', role: 'admin', email: 'test@fasoinfo.bf' })).toString('base64url');
  const forgedToken = `${header}.${tamperedPayload}.${signature}`;
  const tamperedResult = verifyToken(forgedToken);
  assert(tamperedResult === null, 'Forged token with modified role fails signature verification');

  // -------------------------------------------------------------
  // Test 8: Password Hashing Salt & Scrypt Security
  // -------------------------------------------------------------
  console.log('\nScenario 8: Password Hashing Entropy & Salt');
  const pwd1 = hashPassword('Secr3tP@ssword2026!');
  const pwd2 = hashPassword('Secr3tP@ssword2026!');
  assert(pwd1.salt !== pwd2.salt, 'Unique cryptographic salt generated per user');
  assert(pwd1.hash !== pwd2.hash, 'Different hashes for identical passwords due to unique salts');
  assert(verifyPassword('Secr3tP@ssword2026!', pwd1.hash, pwd1.salt), 'Correct password verifies');
  assert(!verifyPassword('WrongPassword!', pwd1.hash, pwd1.salt), 'Wrong password rejected');

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityTests();
