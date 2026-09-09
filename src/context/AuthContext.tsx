import React, { createContext, useContext, useState, useEffect } from 'react';
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
  quickSwitch: (roleKey: 'admin' | 'globalnews' | 'lucas' | 'clara') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(api.getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [unreadNotifs, setUnreadNotifs] = useState<number>(0);
  const [bookmarksCount, setBookmarksCount] = useState<number>(0);
  const isFirebaseActive = isFirebaseConfigured();

  // Load current user profile from API/backend
  const refreshUser = async () => {
    const currentToken = api.getToken();
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const data = await api.getMe();
      setUser(data.user);
      setUnreadNotifs(data.unreadNotifs);
      setBookmarksCount(data.bookmarksCount);
    } catch (err) {
      console.warn('Session expirée ou invalide:', err);
      api.clearToken();
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
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
          if (!api.getToken()) {
            setUser(null);
            setToken(null);
            setIsLoading(false);
          } else {
            await refreshUser();
          }
        }
      });
      return () => unsubscribe();
    } else {
      refreshUser();
    }
  }, [isFirebaseActive]);

  // Real-time synchronization for personal notifications (articles published by followed houses, replies, likes)
  useEffect(() => {
    const unsubNotif = realtime.on('notification:new', (notifItem) => {
      setUnreadNotifs((prev) => prev + 1);
      sfx.playNotificationDing();
    });

    return () => {
      unsubNotif();
    };
  }, []);

  // 1. Email + Password Login
  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      if (isFirebaseActive && firebaseAuth) {
        try {
          const { idToken } = await loginWithFirebaseEmail(email, pass);
          api.setToken(idToken);
          setToken(idToken);
          await refreshUser();
          return;
        } catch (fbErr: any) {
          throw new Error(mapFirebaseError(fbErr.code || fbErr.message));
        }
      } else {
        // Platform REST fallback login
        const data = await api.login({ email, password: pass });
        setToken(data.token);
        setUser(data.user);
        await refreshUser();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Email + Password Registration
  // CRITICAL RULE: New registration is strictly role: USER (never admin or journalist directly)
  const registerWithEmail = async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      if (isFirebaseActive && firebaseAuth) {
        try {
          const { idToken } = await registerWithFirebaseEmail(name, email, pass);
          api.setToken(idToken);
          setToken(idToken);
          await refreshUser();
          return;
        } catch (fbErr: any) {
          throw new Error(mapFirebaseError(fbErr.code || fbErr.message));
        }
      } else {
        // Platform REST registration strictly enforcing 'reader'/'user'
        const res = await api.register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password: pass,
          accountType: 'user', // Forced USER role
        });
        setToken(res.token);
        setUser(res.user);
        await refreshUser();
      }
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
    if (isFirebaseActive && firebaseAuth) {
      try {
        await sendFirebasePasswordReset(email);
      } catch (fbErr: any) {
        throw new Error(mapFirebaseError(fbErr.code || fbErr.message));
      }
    } else {
      await api.forgotPassword(email);
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
    api.clearToken();
    setToken(null);
    setUser(null);
    setUnreadNotifs(0);
    setBookmarksCount(0);
  };

  // 6. Update Profile
  const updateUserProfile = async (data: Partial<User>): Promise<User> => {
    const res = await api.updateProfile(data);
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

  // 9. Quick role switch for local testing/demo
  const quickSwitch = async (roleKey: 'admin' | 'globalnews' | 'lucas' | 'clara') => {
    const credentials: Record<string, { email: string; pass: string }> = {
      admin: { email: 'admin@purgeinfo.com', pass: 'admin123' },
      globalnews: { email: 'medianews@purgeinfo.com', pass: 'media123' },
      lucas: { email: 'lucas.moreau@purgeinfo.com', pass: 'journ123' },
      clara: { email: 'clara.dupont@purgeinfo.com', pass: 'user123' },
    };
    const cred = credentials[roleKey];
    if (cred) {
      const data = await api.login({ email: cred.email, password: cred.pass });
      setToken(data.token);
      setUser(data.user);
      await refreshUser();
    }
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
        quickSwitch,
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
