import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User, CloudinaryMedia } from '../types';
import { api } from '../services/api';
import {
  auth as firebaseAuth,
  isFirebaseConfigured,
  registerWithFirebaseEmail,
  loginWithFirebaseEmail,
  loginWithFirebaseGoogle,
  sendFirebasePasswordReset,
  logoutFirebase,
  getFirebaseIdToken,
  syncFirestoreUserProfile,
  mapFirebaseError,
} from '../services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { uploadMediaToCloudinary } from '../services/cloudinary';
import { realtime } from '../services/realtime';
import { sfx } from '../services/soundEffects';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirebaseActive: boolean;
  unreadNotifs: number;
  bookmarksCount: number;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUserProfile: (data: Partial<User>) => Promise<User>;
  uploadAvatar: (file: File) => Promise<CloudinaryMedia>;
  uploadCover: (file: File) => Promise<CloudinaryMedia>;
  removeAvatar: () => Promise<void>;
  removeCover: () => Promise<void>;
  requestJournalistVerification: (data: {
    mediaName?: string;
    pressCardNumber: string;
    motivation: string;
    documentUrl?: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize user and token synchronously from localStorage so session is never lost on refresh
  const [user, setUserState] = useState<User | null>(() => api.getUser());
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(() => !api.getUser() && !api.getToken());
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [bookmarksCount, setBookmarksCount] = useState<number>(0);
  const isFirebaseActive = isFirebaseConfigured();

  // Deduplication ref to avoid multiple concurrent refresh calls on refresh
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  // Sync state and localStorage seamlessly
  const setUser = (u: User | null | ((prev: User | null) => User | null)) => {
    setUserState((prev) => {
      const next = typeof u === 'function' ? u(prev) : u;
      if (next) {
        api.setUser(next);
      } else {
        api.setUser(null);
      }
      return next;
    });
  };

  // Load current user profile from API/backend with request deduplication
  const refreshUser = async (): Promise<void> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const runRefresh = async () => {
      const currentToken = api.getToken();
      if (!currentToken) {
        // Check if Firebase user is logged in
        if (isFirebaseActive && firebaseAuth) {
          if (typeof (firebaseAuth as any).authStateReady === 'function') {
            await (firebaseAuth as any).authStateReady().catch(() => {});
          }
          if (firebaseAuth.currentUser) {
            try {
              const freshToken = await firebaseAuth.currentUser.getIdToken();
              api.setToken(freshToken);
              setToken(freshToken);
            } catch {
              if (!api.getUser()) {
                setUser(null);
              }
              setIsLoading(false);
              return;
            }
          } else {
            if (!api.getUser()) {
              setUser(null);
            }
            setIsLoading(false);
            return;
          }
        } else {
          if (!api.getUser()) {
            setUser(null);
          }
          setIsLoading(false);
          return;
        }
      }

      try {
        const data = await api.getMe();
        if (data && data.user) {
          setUser(data.user);
          setUnreadNotifs(data.unreadNotifs || 0);
          setBookmarksCount(data.bookmarksCount || 0);
        }
      } catch (err: any) {
        console.warn('Session check warning:', err);
        // Attempt token recovery via Firebase before clearing
        let recovered = false;
        if (isFirebaseActive && firebaseAuth) {
          try {
            if (typeof (firebaseAuth as any).authStateReady === 'function') {
              await (firebaseAuth as any).authStateReady().catch(() => {});
            }
            if (firebaseAuth.currentUser) {
              const freshIdToken = await firebaseAuth.currentUser.getIdToken(true);
              if (freshIdToken) {
                api.setToken(freshIdToken);
                setToken(freshIdToken);
                const data = await api.getMe();
                if (data && data.user) {
                  setUser(data.user);
                  setUnreadNotifs(data.unreadNotifs || 0);
                  setBookmarksCount(data.bookmarksCount || 0);
                  recovered = true;
                  return;
                }
              }
            }
          } catch {
            // continue
          }
        }

        const errMsg = String(err?.message || err);
        const isDefiniteAuthFailure =
          errMsg.includes('Non authentifié') ||
          errMsg.includes('Authentification requise') ||
          errMsg.includes('Token invalide') ||
          errMsg.includes('Token expiré');

        // Only clear session on a definitive invalidation when no Firebase user is present
        if (isDefiniteAuthFailure && !recovered) {
          if (!isFirebaseActive || !firebaseAuth?.currentUser) {
            api.clearSession();
            setToken(null);
            setUser(null);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    refreshPromiseRef.current = runRefresh().finally(() => {
      refreshPromiseRef.current = null;
    });

    return refreshPromiseRef.current;
  };

  // Sync Firebase Auth state listener
  useEffect(() => {
    if (isFirebaseActive && firebaseAuth) {
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (fbUser: FirebaseUser | null) => {
        if (fbUser) {
          try {
            const idToken = await fbUser.getIdToken();
            api.setToken(idToken);
            setToken(idToken);
            await refreshUser();
          } catch (e) {
            console.error('Error fetching token for Firebase user:', e);
            await refreshUser();
          }
        } else {
          // If no token in local storage either, reset
          if (!api.getToken() && !api.getUser()) {
            setUser(null);
            setToken(null);
            setIsLoading(false);
          } else if (api.getToken()) {
            await refreshUser();
          }
        }
      });
      return () => unsubscribe();
    } else {
      refreshUser();
    }
  }, [isFirebaseActive]);

  // Real-time synchronization for personal notifications and live role updates
  useEffect(() => {
    const unsubNotif = realtime.on('notification:new', (notifItem: any) => {
      setUnreadNotifs((prev) => prev + 1);
      sfx.playNotificationDing();
      if (notifItem?.type === 'verification' || notifItem?.link === 'profile') {
        refreshUser();
      }
    });

    const unsubUser = realtime.on('user:updated', (updatedUser: any) => {
      if (updatedUser) {
        setUser((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser));
        refreshUser();
      }
    });

    const unsubRole = realtime.on('user:roleChanged', (payload: any) => {
      if (payload?.role) {
        const isJournalist = payload.role === 'journalist' || payload.role === 'journaliste';
        setUser((prev) => {
          if (!prev) return prev;
          if (payload.userId && payload.userId !== prev.id && payload.email && payload.email.toLowerCase() !== prev.email.toLowerCase()) {
            return prev;
          }
          return {
            ...prev,
            role: isJournalist ? 'journalist' : (payload.role || prev.role),
            accountType: isJournalist ? 'journalist' : (payload.accountType || prev.accountType),
            isVerified: payload.isVerified !== undefined ? payload.isVerified : isJournalist ? true : prev.isVerified,
            verificationStatus: payload.verificationStatus || (isJournalist ? 'approved' : prev.verificationStatus),
          };
        });
      }
      refreshUser();
    });

    return () => {
      unsubNotif();
      unsubUser();
      unsubRole();
    };
  }, []);

  // 1. Email + Password Login
  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    try {
      // 1. Prioritize Platform REST login
      try {
        const data = await api.login({ email: cleanEmail, password: pass });
        setToken(data.token);
        setUser(data.user);
        await refreshUser();
        return;
      } catch (apiErr: any) {
        // If REST login fails, check if the account exists in Firebase Auth
        if (isFirebaseActive && firebaseAuth) {
          try {
            const { idToken } = await loginWithFirebaseEmail(cleanEmail, pass);
            api.setToken(idToken);
            setToken(idToken);
            await refreshUser();
            return;
          } catch {
            // If Firebase also fails, surface the clearer platform REST error message
            throw apiErr;
          }
        }
        throw apiErr;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Email + Password Registration
  // CRITICAL RULE: New registration is strictly role: USER (never admin or journalist directly)
  const registerWithEmail = async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    try {
      // 1. Always register user on the platform REST backend
      const res = await api.register({
        name: cleanName,
        email: cleanEmail,
        password: pass,
        accountType: 'user', // Forced USER role
      });
      setToken(res.token);
      setUser(res.user);

      // 2. Opportunistically sync with Firebase if active (non-blocking)
      if (isFirebaseActive && firebaseAuth) {
        try {
          await registerWithFirebaseEmail(cleanName, cleanEmail, pass);
        } catch (fbErr) {
          console.info('Firebase registration sync skipped:', fbErr);
        }
      }

      await refreshUser();
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Google Sign In
  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      if (isFirebaseActive && firebaseAuth) {
        try {
          const { idToken } = await loginWithFirebaseGoogle();
          api.setToken(idToken);
          setToken(idToken);
          await refreshUser();
        } catch (fbErr: any) {
          throw new Error(mapFirebaseError(fbErr.code || fbErr.message));
        }
      } else {
        throw new Error(
          'La connexion via Google nécessite la configuration des identifiants Firebase (VITE_FIREBASE_*). Veuillez utiliser votre email et mot de passe ou configurer les variables d’environnement.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Password Reset
  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      await api.forgotPassword(cleanEmail);
    } catch {
      if (isFirebaseActive && firebaseAuth) {
        try {
          await sendFirebasePasswordReset(cleanEmail);
        } catch (fbErr: any) {
          throw new Error(mapFirebaseError(fbErr.code || fbErr.message));
        }
      }
    }
  };

  // 5. Logout
  const logout = async () => {
    try {
      if (isFirebaseActive) {
        await logoutFirebase();
      }
    } catch (e) {
      console.warn('Firebase logout error:', e);
    }
    api.clearSession();
    setToken(null);
    setUser(null);
    setUnreadNotifs(0);
    setBookmarksCount(0);
  };

  // 6. Update Profile
  const updateUserProfile = async (data: Partial<User>): Promise<User> => {
    // If token is missing but Firebase user is active, retrieve fresh token first
    if (!api.getToken() && isFirebaseActive && firebaseAuth?.currentUser) {
      try {
        const freshToken = await firebaseAuth.currentUser.getIdToken();
        api.setToken(freshToken);
        setToken(freshToken);
      } catch (e) {
        console.warn('Failed to get fresh Firebase token before update:', e);
      }
    }

    let res;
    try {
      res = await api.updateProfile(data);
    } catch (err: any) {
      // If 401 and Firebase user is active, force refresh token and retry
      if (
        isFirebaseActive &&
        firebaseAuth?.currentUser &&
        String(err?.message || err).includes('Authentification requise')
      ) {
        const freshToken = await firebaseAuth.currentUser.getIdToken(true);
        api.setToken(freshToken);
        setToken(freshToken);
        res = await api.updateProfile(data);
      } else {
        throw err;
      }
    }

    setUser(res.user);

    // Sync to Firestore if Firebase is active
    if (isFirebaseActive && firebaseAuth?.currentUser) {
      await syncFirestoreUserProfile(firebaseAuth.currentUser, data);
    }

    return res.user;
  };

  // 7. Upload Avatar to Cloudinary
  const uploadAvatar = async (file: File): Promise<CloudinaryMedia> => {
    // 1. Upload media to Cloudinary through backend
    const media = await uploadMediaToCloudinary(file, {
      type: 'image',
      usageType: 'avatar',
      folder: 'purge_info/avatars',
    });

    // 2. Update user profile with Cloudinary URL & metadata
    const updated = await updateUserProfile({
      avatar: media.url,
      avatarMedia: media,
    });

    setUser(updated);
    return media;
  };

  // 7b. Upload Cover Image (Banner)
  const uploadCover = async (file: File): Promise<CloudinaryMedia> => {
    const media = await uploadMediaToCloudinary(file, {
      type: 'image',
      usageType: 'cover',
      folder: 'purge_info/covers',
    });

    const updated = await updateUserProfile({
      coverImage: media.url,
      coverMedia: media,
    });

    setUser(updated);
    return media;
  };

  // 7c. Remove Avatar
  const removeAvatar = async () => {
    const res = await api.removeAvatar();
    setUser(res.user);
  };

  // 7d. Remove Cover
  const removeCover = async () => {
    const res = await api.removeCover();
    setUser(res.user);
  };

  // 8. Request Journalist Verification (User -> Demande -> Admin)
  const requestJournalistVerification = async (data: {
    mediaName?: string;
    pressCardNumber: string;
    motivation: string;
    documentUrl?: string;
  }) => {
    await api.requestVerification(data);
    await refreshUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        isFirebaseActive,
        unreadNotifs,
        bookmarksCount,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        resetPassword,
        logout,
        refreshUser,
        updateUserProfile,
        uploadAvatar,
        uploadCover,
        removeAvatar,
        removeCover,
        requestJournalistVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
