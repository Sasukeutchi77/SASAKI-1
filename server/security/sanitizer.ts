/**
 * purge-info Security Sanitizer & Input Validator
 * Protects against XSS, script injection, malicious protocols, and text abuse.
 */

// Escape HTML entities to prevent stored XSS
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Strip HTML tags completely, including script and style contents
export function stripHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  // Remove script and style tags along with their inner code
  let clean = str.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  // Remove all other HTML tags
  clean = clean.replace(/<[^>]*>?/gm, '');
  return clean.trim();
}

// Clean and sanitize general text input
export function sanitizeText(
  input: string,
  options: {
    maxLength?: number;
    allowNewlines?: boolean;
    escapeEntities?: boolean;
    maxConsecutiveRepeats?: number;
  } = {}
): string {
  if (!input || typeof input !== 'string') return '';

  const {
    maxLength,
    allowNewlines = true,
    escapeEntities = false,
    maxConsecutiveRepeats = 5,
  } = options;

  let text = input.trim();

  // Strip null bytes and control characters (except newline/tab if allowed)
  if (allowNewlines) {
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  } else {
    text = text.replace(/[\x00-\x1F\x7F]/g, ' ');
  }

  // Strip all HTML/script tags
  text = stripHtml(text);

  // Compress extreme character repetition (e.g. "aaaaaaa...." to "aaaaa")
  if (maxConsecutiveRepeats > 0) {
    const repeatRegex = new RegExp(`(.)\\1{${maxConsecutiveRepeats},}`, 'g');
    text = text.replace(repeatRegex, '$1'.repeat(maxConsecutiveRepeats));
  }

  // Normalize excessive multiple consecutive spaces
  text = text.replace(/[ \t]{3,}/g, '  ');

  // Enforce optional max length
  if (maxLength && text.length > maxLength) {
    text = text.substring(0, maxLength).trim();
  }

  return escapeEntities ? escapeHtml(text) : text;
}

// Validate URLs strictly against dangerous schemes (e.g., javascript:, vbscript:, file:)
export function isValidUrl(
  url: string,
  allowedProtocols: string[] = ['http:', 'https:']
): boolean {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim();

  // Explicit check for dangerous executable schemes
  const dangerousPattern = /^(javascript|vbscript|file|about):/i;
  if (dangerousPattern.test(trimmed)) {
    return false;
  }

  // Safe image data URIs (e.g. data:image/png;base64,... or data:image/jpeg;base64,...)
  if (/^data:image\/(jpeg|png|webp|gif|svg\+xml);base64,/i.test(trimmed)) {
    return true;
  }

  // Disallow other data: schemes (e.g. data:text/html, data:application/...)
  if (/^data:/i.test(trimmed)) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    return allowedProtocols.includes(parsed.protocol.toLowerCase());
  } catch {
    // Relative URLs or protocol-relative URLs (e.g. /api/media/file/...)
    if (trimmed.startsWith('/') || trimmed.startsWith('//')) {
      return !dangerousPattern.test(trimmed);
    }
    return false;
  }
}

// Validate standard email format
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim()) && email.length <= 254;
}

// Anti-spam text analysis: detect repeated garbage strings or gibberish
export function isRepetitiveSpam(text: string): boolean {
  if (!text || text.length < 10) return false;

  const normalized = text.toLowerCase().replace(/\s+/g, '');

  // 1. Ratio of unique characters to total length
  const uniqueChars = new Set(normalized).size;
  if (normalized.length > 20 && uniqueChars / normalized.length < 0.15) {
    return true; // Over 85% repeating the exact same characters
  }

  // 2. Pattern repetition: check if a short token repeats more than 5 times
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 6) {
    const wordCounts = new Map<string, number>();
    for (const w of words) {
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
    }
    for (const count of wordCounts.values()) {
      if (count / words.length > 0.7) {
        return true; // 70%+ identical words repeated
      }
    }
  }

  return false;
}
