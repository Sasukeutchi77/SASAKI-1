/**
 * Safe confirm helper that does not throw SecurityError / DOMException
 * when executed inside an iframe or sandboxed environment.
 */
export function safeConfirm(message: string): boolean {
  try {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message);
    }
  } catch {
    // Sandboxed scripts cannot open modal dialogs
    return true;
  }
  return true;
}
