// Global event helper to open or close the Auth Modal with specified mode

export type AuthModalMode = 'login' | 'register' | 'forgot';

export function openAuthModal(mode: AuthModalMode = 'login') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('purge:open-auth-modal', { detail: { mode } }));
}

export function closeAuthModal() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('purge:close-auth-modal'));
}
