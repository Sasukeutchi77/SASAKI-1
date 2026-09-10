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
      // Check if Firebase user is logged in
      if (isFirebaseActive && firebaseAuth?.currentUser) {
        try {
          const freshToken = await firebaseAuth.currentUser.getIdToken();
          api.setToken(freshToken);
          setToken(freshToken);
        } catch {
          setUser(null);
          setIsLoading(false);
          return;
        }
      } else {
        setUser(null);
        setIsLoading(false);
        return;
      }
    }

    try {
      const data = await api.getMe();
      setUser(data.user);
      setUnreadNotifs(data.unreadNotifs);
      setBookmarksCount(data.bookmarksCount);
    } catch (err: any) {
      console.warn('Session check warning:', err);
      // Attempt token recovery via Firebase before clearing
      if (isFirebaseActive && firebaseAuth?.currentUser) {
        try {
          const freshIdToken = await firebaseAuth.currentUser.getIdToken(true);
          api.setToken(freshIdToken);
          setToken(freshIdToken);
          const data = await api.getMe();
          setUser(data.user);
          setUnreadNotifs(data.unreadNotifs);
          setBookmarksCount(data.bookmarksCount);
          return;
        } catch {
          // continue to cleanup
        }
      }
      const errMsg = String(err?.message || err);
      if (
        errMsg.includes('401') ||
        errMsg.includes('Non authentifié') ||
        errMsg.includes('Authentification requise')
      ) {
        api.clearToken();
        setToken(null);
        setUser(null);
      }
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
    api.clearToken();
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
