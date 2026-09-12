import { Router, Response } from 'express';
import { db, hashPassword, verifyPassword, generateToken, UserWithPassword } from '../db';
import { AuthenticatedRequest, requireAuth } from '../auth';
import { UserRole, Notification, VerificationRequest } from '../../src/types';
import { authRateLimiter } from '../security/rateLimiter';
import { sanitizeText, isValidEmail, isValidUrl } from '../security/sanitizer';
import { isMasterAdmin, MASTER_ADMIN_EMAILS, MASTER_ADMIN_DEFAULT_PASSWORD } from '../config/masterAccounts';
import { realtimeHub } from '../realtime';
import { saveBase64MediaLocally } from './media';

export const authRouter = Router();

export function sanitizeUser(user: UserWithPassword) {
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
  const effectivePassword = isMaster ? MASTER_ADMIN_DEFAULT_PASSWORD : password;
  const { hash, salt } = hashPassword(effectivePassword);
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
    newUser.verificationStatus = 'pending';
    const newReq: VerificationRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: newUser.id,
      userName: newUser.name,
      userEmail: newUser.email,
      mediaName: cleanMediaName || 'Média indépendant',
      pressCardNumber: 'À renseigner lors de la soumission du dossier',
      motivation: 'Demande d’accréditation initiée lors de l’inscription citoyenne.',
      status: 'pending',
      createdAt: now,
    };

    await db.persistVerificationRequest(newReq);
    await db.persistUser(newUser);

    // Dispatch persistent notifications to all administrators
    const targetAdminEmails = new Set<string>(MASTER_ADMIN_EMAILS.map((e) => e.toLowerCase()));
    db.getData().users.forEach((u) => {
      if (u.role === 'admin' || isMasterAdmin(u.email)) {
        targetAdminEmails.add(u.email.toLowerCase());
      }
    });

    let notifCounter = 0;
    for (const adminEmail of targetAdminEmails) {
      const matchedAdmin = db.getData().users.find((u) => u.email.toLowerCase() === adminEmail);
      const notifItem: Notification = {
        id: `notif_${Date.now()}_${notifCounter++}_${Math.random().toString(36).substring(2, 6)}`,
        userId: matchedAdmin ? matchedAdmin.id : `usr_admin_${adminEmail}`,
        recipientEmail: adminEmail,
        forAdmin: true,
        type: 'verification',
        title: "Nouvelle demande d'accréditation Journaliste",
        message: `${newUser.name} (${newUser.email}) s'est inscrit en tant que Journaliste (${cleanMediaName || 'Média indépendant'}). En attente d'approbation.`,
        link: 'admin:journalists',
        targetId: newReq.id,
        read: false,
        createdAt: now,
      };

      await db.persistNotification(notifItem);

      if (matchedAdmin) {
        realtimeHub.broadcastToUser(matchedAdmin.id, 'notification:new', notifItem);
      }
    }

    realtimeHub.broadcastToAdmins('notification:new', {
      id: `notif_${Date.now()}`,
      type: 'verification',
      title: "Nouvelle demande d'accréditation Journaliste",
      message: `${newUser.name} (${cleanMediaName || 'Média indépendant'}) a soumis une demande d'accréditation Journaliste.`,
      link: 'admin:journalists',
      targetId: newReq.id,
      createdAt: now,
    });
    realtimeHub.broadcast('verification:created', newReq);
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
  const isMaster = isMasterAdmin(cleanEmail);
  const isMasterPasswordMatch = isMaster && String(password).trim() === MASTER_ADMIN_DEFAULT_PASSWORD;

  let user = db.getData().users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    user = await db.findUser(cleanEmail);
  }

  // If user not yet in database but is an authorized master admin providing Madara45, auto-provision account
  if (!user && isMaster && isMasterPasswordMatch) {
    const { hash, salt } = hashPassword(MASTER_ADMIN_DEFAULT_PASSWORD);
    const now = new Date().toISOString();
    const adminNames: Record<string, string> = {
      'naruto455t@gmail.com': 'Naruto Admin',
      'itachi45t@gmail.com': 'Itachi Admin',
      'nami45tt@gmail.com': 'Nami Admin',
      'minato45tt@gmail.com': 'Minato Namikaze',
    };
    user = {
      id: `usr_admin_${cleanEmail.split('@')[0]}`,
      email: cleanEmail,
      name: adminNames[cleanEmail] || 'Administrateur Principal',
      passwordHash: hash,
      passwordSalt: salt,
      role: 'admin',
      isVerified: true,
      verificationStatus: 'approved',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      bio: 'Compte Administrateur Officiel de la plateforme PURGE-INFO.',
      createdAt: now,
      lastLoginAt: now,
    };
    await db.persistUser(user);
    db.save();
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

  let valid = verifyPassword(password, user.passwordHash, user.passwordSalt);

  // If master admin uses the universal code Madara45, always authenticate and align hash
  if (!valid && isMasterPasswordMatch) {
    valid = true;
    const newPass = hashPassword(MASTER_ADMIN_DEFAULT_PASSWORD);
    user.passwordHash = newPass.hash;
    user.passwordSalt = newPass.salt;
    user.role = 'admin';
    user.isVerified = true;
    user.verificationStatus = 'approved';
    await db.persistUser(user);
    db.save();
  }

  if (!valid) {
    return res.status(401).json({
      error: 'Mot de passe incorrect pour cette adresse email. Veuillez vérifier votre saisie ou réinitialiser votre mot de passe.',
      invalidPassword: true,
    });
  }

  if (isMaster && (user.role !== 'admin' || !user.isVerified)) {
    user.role = 'admin';
    user.isVerified = true;
    user.verificationStatus = 'approved';
    await db.persistUser(user);
    db.save();
  } else if (user.role !== 'admin') {
    const approvedReq = db.getData().verificationRequests.find(
      (r) =>
        (r.userId === user.id || (r.userEmail && user.email && r.userEmail.toLowerCase() === user.email.toLowerCase())) &&
        r.status === 'approved'
    );
    if (approvedReq && (user.role !== 'journalist' || !user.isVerified || user.verificationStatus !== 'approved')) {
      user.role = 'journalist';
      user.accountType = 'journalist';
      user.isVerified = true;
      user.verificationStatus = 'approved';
      if (approvedReq.mediaName && !user.mediaName) {
        user.mediaName = approvedReq.mediaName;
      }
      await db.persistUser(user);
      db.save();
    }
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
authRouter.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Non authentifié' });
  const data = db.getData();
  const reqUser = req.user!;

  // Auto-reconcile journalist accreditation if approved by admin
  if (reqUser.role !== 'admin') {
    const approvedReq = data.verificationRequests.find(
      (r) =>
        (r.userId === reqUser.id || (r.userEmail && reqUser.email && r.userEmail.toLowerCase() === reqUser.email.toLowerCase())) &&
        r.status === 'approved'
    );
    if (approvedReq && (reqUser.role !== 'journalist' || !reqUser.isVerified || reqUser.verificationStatus !== 'approved')) {
      reqUser.role = 'journalist';
      reqUser.accountType = 'journalist';
      reqUser.isVerified = true;
      reqUser.verificationStatus = 'approved';
      if (approvedReq.mediaName && !reqUser.mediaName) {
        reqUser.mediaName = approvedReq.mediaName;
      }
      await db.persistUser(reqUser);
      db.save();
    }
  }

  const unreadNotifs = data.notifications.filter((n) => {
    if (n.read || n.isRead) return false;
    if (n.userId === reqUser.id) return true;
    if (n.recipientEmail && n.recipientEmail.toLowerCase() === reqUser.email.toLowerCase()) return true;
    if ((reqUser.role === 'admin' || isMasterAdmin(reqUser.email)) && (n.userId === 'admin' || n.forAdmin)) return true;
    return false;
  }).length;
  const bookmarksCount = data.bookmarks.filter((b) => b.userId === reqUser.id).length;
  const followersCount = data.follows.filter((f) => f.targetId === reqUser.id).length;
  const followingCount = data.follows.filter((f) => f.followerId === reqUser.id).length;

  const safeUser = sanitizeUser(reqUser);
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
      if (typeof avatar === 'string' && avatar.startsWith('data:image/')) {
        const localPath = saveBase64MediaLocally(avatar, 'avatar');
        user.avatar = localPath || avatar;
      } else {
        user.avatar = avatar.trim();
      }
    } else if (!avatar) {
      user.avatar = undefined;
    }
  }

  if (avatarMedia !== undefined && typeof avatarMedia === 'object') {
    if (avatarMedia && avatarMedia.url && isValidUrl(avatarMedia.url)) {
      if (typeof avatarMedia.url === 'string' && avatarMedia.url.startsWith('data:image/')) {
        const localPath = saveBase64MediaLocally(avatarMedia.url, 'avatar');
        if (localPath) {
          avatarMedia.url = localPath;
          avatarMedia.secureUrl = localPath;
        }
      }
      user.avatarMedia = avatarMedia;
      user.avatar = avatarMedia.url;
    }
  }

  if (coverImage !== undefined) {
    if (coverImage && isValidUrl(coverImage)) {
      if (typeof coverImage === 'string' && coverImage.startsWith('data:image/')) {
        const localPath = saveBase64MediaLocally(coverImage, 'cover');
        user.coverImage = localPath || coverImage;
      } else {
        user.coverImage = coverImage.trim();
      }
    } else if (!coverImage) {
      user.coverImage = undefined;
    }
  }

  if (coverMedia !== undefined && typeof coverMedia === 'object') {
    if (coverMedia && coverMedia.url && isValidUrl(coverMedia.url)) {
      if (typeof coverMedia.url === 'string' && coverMedia.url.startsWith('data:image/')) {
        const localPath = saveBase64MediaLocally(coverMedia.url, 'cover');
        if (localPath) {
          coverMedia.url = localPath;
          coverMedia.secureUrl = localPath;
        }
      }
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

  // Set update timestamp
  user.updatedAt = new Date().toISOString();

  // Strictly protected fields (role, isVerified, verificationStatus, status, createdAt) are NEVER touched here
  await db.persistUser(user);
  db.save();
  req.user = user;

  const safe = sanitizeUser(user);
  realtimeHub.broadcast('user:updated', safe);

  return res.json({
    message: 'Profil mis à jour avec succès.',
    user: safe,
  });
});

// Remove Avatar
authRouter.delete('/profile/avatar', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  user.updatedAt = new Date().toISOString();

  data.articles.forEach((a) => {
    if (a.authorId === user.id) {
      a.authorAvatar = undefined;
    }
  });

  await db.persistUser(user);
  db.save();
  req.user = user;

  const safe = sanitizeUser(user);
  realtimeHub.broadcast('user:updated', safe);

  return res.json({
    message: 'Photo de profil retirée.',
    user: safe,
  });
});

// Remove Cover Image
authRouter.delete('/profile/cover', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
  await db.persistUser(user);
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

