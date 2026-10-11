// Global Toast Event Bus for cross-boundary communication (API services, Auth, React components)

export type ToastType = 'error' | 'success' | 'warning' | 'info' | 'auth';

export interface ToastAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms, default 6500ms for errors, 4000ms for success
  action?: ToastAction;
  secondaryAction?: ToastAction;
  category?: string;
  createdAt: number;
}

type ToastListener = (toast: ToastItem) => void;
type DismissListener = (id: string) => void;
type ClearListener = () => void;

class ToastBus {
  private toastListeners = new Set<ToastListener>();
  private dismissListeners = new Set<DismissListener>();
  private clearListeners = new Set<ClearListener>();

  onToast(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    return () => this.toastListeners.delete(listener);
  }

  onDismiss(listener: DismissListener): () => void {
    this.dismissListeners.add(listener);
    return () => this.dismissListeners.delete(listener);
  }

  onClear(listener: ClearListener): () => void {
    this.clearListeners.add(listener);
    return () => this.clearListeners.delete(listener);
  }

  emit(toast: Omit<ToastItem, 'id' | 'createdAt'> & { id?: string }): string {
    const id = toast.id || `toast_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullToast: ToastItem = {
      ...toast,
      id,
      createdAt: Date.now(),
      duration: toast.duration !== undefined ? toast.duration : (toast.type === 'error' || toast.type === 'auth' ? 7000 : 4500),
    };

    this.toastListeners.forEach((fn) => {
      try {
        fn(fullToast);
      } catch (err) {
        console.warn('[ToastBus] Listener execution warning:', err);
      }
    });

    return id;
  }

  dismiss(id: string): void {
    this.dismissListeners.forEach((fn) => {
      try {
        fn(id);
      } catch (err) {
        console.warn('[ToastBus] Dismiss error:', err);
      }
    });
  }

  clear(): void {
    this.clearListeners.forEach((fn) => {
      try {
        fn();
      } catch (err) {
        console.warn('[ToastBus] Clear error:', err);
      }
    });
  }

  emitError(message: string, options?: { title?: string; duration?: number; action?: ToastAction }): string {
    return this.emit({
      type: 'error',
      message,
      title: options?.title,
      duration: options?.duration,
      action: options?.action,
    });
  }

  emitSuccess(message: string, options?: { title?: string; duration?: number; action?: ToastAction }): string {
    return this.emit({
      type: 'success',
      message,
      title: options?.title,
      duration: options?.duration,
      action: options?.action,
    });
  }

  emitWarning(message: string, options?: { title?: string; duration?: number; action?: ToastAction }): string {
    return this.emit({
      type: 'warning',
      message,
      title: options?.title,
      duration: options?.duration,
      action: options?.action,
    });
  }

  emitInfo(message: string, options?: { title?: string; duration?: number; action?: ToastAction }): string {
    return this.emit({
      type: 'info',
      message,
      title: options?.title,
      duration: options?.duration,
      action: options?.action,
    });
  }
}

export const toastBus = new ToastBus();
