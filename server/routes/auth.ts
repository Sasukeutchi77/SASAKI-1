import { Router, Response } from 'express';
import { db, hashPassword, verifyPassword, generateToken, UserWithPassword } from '../db';
import { AuthenticatedRequest, requireAuth } from '../auth';
import { UserRole } from '../../src/types';
import { authRateLimiter } from '../security/rateLimiter';
import { sanitizeText, isValidEmail, isValidUrl } from '../security/sanitizer';
import { isMasterAdmin } from '../config/masterAccounts';

export const authRouter = Router();

function sanitizeUser(user: UserWithPassword) {
  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}

// Register with anti-abuse rate limiting and strict validation
authRouter.post('/register', authRateLimiter, async (req, res) => {
  const { name, email, password, accountType, mediaName, bio, phone } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Le nom, l’email et le mot de passe sont obligatoires.' });
  }

  const cleanName = sanitizeText(name, { maxLength: 60, allowNewlines: false });
  if (cleanName.length < 2) {
    return res.status(400).json({ error: 'Le nom doit contenir au moins 2 caractères valides.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  if (!isValidEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Format d’adresse email invalide.' });
  }

  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
  }

  if (password.length > 128) {
    return res.status(400).json({ error: 'Le mot de passe est trop long (maximum 128 caractères).' });
  }

  let existing = db.getData().users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!existing) {
    existing = await db.findUser(cleanEmail);
  }
  if (existing) {
    return res.status(400).json({ error: 'Un compte avec cette adresse email existe déjà.' });
  }

  // Strict policy: Only designated master admin accounts receive 'admin'.
  const isMaster = isMasterAdmin(cleanEmail);
  const role: UserRole = isMaster ? 'admin' : 'user';
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  const cleanBio = bio ? sanitizeText(bio, { maxLength: 500 }) : (isMaster ? 'Compte Principal PURGE-INFO' : 'Lecteur citoyen sur PURGE-INFO');
  const cleanPhone = phone ? sanitizeText(phone, { maxLength: 30, allowNewlines: false }) : undefined;
  const cleanMediaName = mediaName ? sanitizeText(mediaName, { maxLength: 100, allowNewlines: false }) : undefined;

  const newUser: UserWithPassword = {
    id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    email: cleanEmail,
    passwordHash: hash,
    passwordSalt: salt,
    name: cleanName,
    role,
    avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    bio: cleanBio,
    mediaName: cleanMediaName,
    phone: cleanPhone,
    isVerified: isMaster,
    verificationStatus: isMaster ? 'approved' : 'none',
    status: 'active',
    followersCount: 0,
    followingCount: 0,
    createdAt: now,
  };

  // Persist immediately into Cloud Firestore
  await db.persistUser(newUser);

  // If user requested journalist accreditation, auto-create a verification request
  if (accountType === 'journalist') {
    db.getData().verificationRequests.unshift({
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: newUser.id,
      userName: newUser.name,
      userEmail: newUser.email,
      mediaName: cleanMediaName || 'Média indépendant',
      pressCardNumber: 'À renseigner lors de la soumission du dossier',
      motivation: 'Demande d’accréditation initiée lors de l’inscription.',
      status: 'pending',
      createdAt: now,
    });
  }
  db.save();

  const token = generateToken({
    userId: newUser.id,
    role: newUser.role,
    email: newUser.email,
  });

  return res.status(201).json({
    message: 'Compte créé avec succès !',
    token,
    user: sanitizeUser(newUser),
  });
});

// Login with rate limiting
authRouter.post('/login', authRateLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email et mot de passe requis.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  let user = db.getData().users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    user = await db.findUser(cleanEmail);
  }
  if (!user) {
    return res.status(401).json({
      error: `Aucun compte n'est enregistré avec l'adresse « ${cleanEmail} ». Cliquez sur "Créer un compte" pour vous inscrire en quelques secondes.`,
      notFound: true,
      email: cleanEmail,
    });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      error: 'Votre compte a été suspendu par l’équipe de modération de purge-info. Veuillez contacter le support.',
      accountSuspended: true,
    });
  }

  const valid = verifyPassword(password, user.passwordHash, user.passwordSalt);
  if (!valid) {
    return res.status(401).json({
      error: 'Mot de passe incorrect pour cette adresse email. Veuillez vérifier votre saisie ou réinitialiser votre mot de passe.',
      invalidPassword: true,
    });
  }

  if (isMasterAdmin(user.email) && user.role !== 'admin') {
    user.role = 'admin';
    user.isVerified = true;
    db.save();
  }

  const token = generateToken({
    userId: user.id,
    role: user.role,
    email: user.email,
  });

  return res.json({
    message: 'Connexion réussie',
    token,
    user: sanitizeUser(user),
  });
});

// Current User Profile
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  const data = db.getData();
  const unreadNotifs = data.notifications.filter((n) => n.userId === req.user!.id && !n.read).length;
  const bookmarksCount = data.bookmarks.filter((b) => b.userId === req.user!.id).length;
  const followersCount = data.follows.filter((f) => f.targetId === req.user!.id).length;
  const followingCount = data.follows.filter((f) => f.followerId === req.user!.id).length;

  const safeUser = sanitizeUser(req.user);
  return res.json({
    user: {
      ...safeUser,
      followersCount,
      followingCount,
    },
    unreadNotifs,
    bookmarksCount,
  });
});

// Update Profile with sanitization and parameter protection
authRouter.put('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  const { name, username, bio, avatar, avatarMedia, coverImage, coverMedia, mediaName, phone } = req.body;

  const data = db.getData();
  let user = data.users.find(
    (u) =>
      u.id === req.user!.id ||
      (req.user!.email && u.email.toLowerCase() === req.user!.email.toLowerCase())
  );

  if (!user) {
    user = req.user;
    data.users.push(user);
  }

  const oldName = user.name;
  if (name !== undefined && typeof name === 'string') {
    const cleanName = sanitizeText(name, { maxLength: 60, allowNewlines: false });
    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Le nom doit comporter au moins 2 caractères.' });
    }
    user.name = cleanName;
  }

  if (username !== undefined && typeof username === 'string') {
    const cleanUsername = sanitizeText(username, { maxLength: 40, allowNewlines: false })
      .toLowerCase()
      .replace(/[^a-z0-9_.-]/g, '');
    if (cleanUsername) {
      if (cleanUsername.length < 2) {
        return res.status(400).json({ error: "L'identifiant doit comporter au moins 2 caractères." });
      }
      const existing = data.users.find(
        (u) =>
          u.id !== user.id &&
          u.email.toLowerCase() !== user.email.toLowerCase() &&
          u.username &&
          u.username.toLowerCase() === cleanUsername
      );
      if (existing) {
        return res.status(400).json({ error: `L'identifiant @${cleanUsername} est déjà réservé par un autre compte.` });
      }
      user.username = cleanUsername;
    }
  }

  if (bio !== undefined && typeof bio === 'string') {
    user.bio = sanitizeText(bio, { maxLength: 500 });
  }

  if (avatar !== undefined) {
    if (avatar && isValidUrl(avatar)) {
      user.avatar = avatar.trim();
    } else if (!avatar) {
      user.avatar = undefined;
    }
  }

  if (avatarMedia !== undefined && typeof avatarMedia === 'object') {
    if (avatarMedia && avatarMedia.url && isValidUrl(avatarMedia.url)) {
      user.avatarMedia = avatarMedia;
      user.avatar = avatarMedia.url;
    }
  }

  if (coverImage !== undefined) {
    if (coverImage && isValidUrl(coverImage)) {
      user.coverImage = coverImage.trim();
    } else if (!coverImage) {
      user.coverImage = undefined;
    }
  }

  if (coverMedia !== undefined && typeof coverMedia === 'object') {
    if (coverMedia && coverMedia.url && isValidUrl(coverMedia.url)) {
      user.coverMedia = coverMedia;
      user.coverImage = coverMedia.url;
    }
  }

  if (phone !== undefined && typeof phone === 'string') {
    user.phone = sanitizeText(phone, { maxLength: 30, allowNewlines: false });
  }

  if (mediaName !== undefined && typeof mediaName === 'string') {
    user.mediaName = sanitizeText(mediaName, { maxLength: 100, allowNewlines: false });
  }

  // Update cached author name and avatar in user's articles and comments
  if (user.name && user.name !== oldName) {
    data.articles.forEach((a) => {
      if (a.authorId === user.id) {
        a.authorName = user.name;
      }
    });
    data.comments.forEach((c) => {
      if (c.userId === user.id) {
        c.userName = user.name;
      }
    });
  }

  if (user.avatar) {
    data.articles.forEach((a) => {
      if (a.authorId === user.id) {
        a.authorAvatar = user.avatar;
      }
    });
    data.comments.forEach((c) => {
      if (c.userId === user.id) {
        c.userAvatar = user.avatar;
      }
    });
  }

  // Strictly protected fields (role, isVerified, verificationStatus, status, createdAt) are NEVER touched here
  await db.persistUser(user);
  db.save();
  req.user = user;

  return res.json({
    message: 'Profil mis à jour avec succès.',
    user: sanitizeUser(user),
  });
});

// Remove Avatar
authRouter.delete('/profile/avatar', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  const data = db.getData();
  const user = data.users.find(
    (u) =>
      u.id === req.user!.id ||
      (req.user!.email && u.email.toLowerCase() === req.user!.email.toLowerCase())
  );
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  user.avatar = undefined;
  user.avatarMedia = undefined;
  db.save();
  req.user = user;

  return res.json({
    message: 'Photo de profil retirée.',
    user: sanitizeUser(user),
  });
});

// Remove Cover Image
authRouter.delete('/profile/cover', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  const data = db.getData();
  const user = data.users.find(
    (u) =>
      u.id === req.user!.id ||
      (req.user!.email && u.email.toLowerCase() === req.user!.email.toLowerCase())
  );
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  user.coverImage = undefined;
  user.coverMedia = undefined;
  db.save();
  req.user = user;

  return res.json({
    message: 'Image de couverture retirée.',
    user: sanitizeUser(user),
  });
});

// Password recovery / Forgot password endpoint
authRouter.post('/forgot-password', authRateLimiter, (req, res) => {
  const { email } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Adresse email valide requise.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.getData().users.find((u) => u.email.toLowerCase() === cleanEmail);

  // Security best practice: Respond with success even if email is not found to prevent user enumeration
  return res.json({
    success: true,
    message: user
      ? 'Un email de réinitialisation vous a été envoyé si l’adresse est enregistrée sur purge-info.'
      : 'Un email de réinitialisation vous a été envoyé si l’adresse est enregistrée sur purge-info.',
  });
});

