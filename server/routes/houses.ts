import { Router, Response } from 'express';
import { db } from '../db';
import { AuthenticatedRequest, requireAuth, requireJournalistOrAdmin } from '../auth';
import { MediaHouse, User } from '../../src/types';
import { sanitizeText, isValidUrl } from '../security/sanitizer';
import { isMasterAdmin } from '../config/masterAccounts';
import { realtimeHub } from '../realtime';

export const housesRouter = Router();

const MAX_JOURNALISTS_PER_HOUSE = 5;

// Helper to sanitize user object for member listing
function sanitizeMember(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    avatar: u.avatar,
    bio: u.bio,
    role: u.role,
    isVerified: u.isVerified,
    mediaId: u.mediaId,
    mediaName: u.mediaName,
    followersCount: u.followersCount || 0,
    articlesCount: u.articlesCount || 0,
    createdAt: u.createdAt,
  };
}

// 1. Get all Media Houses
housesRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const { q } = req.query;
  const currentUserId = req.user?.id;
  let hasChanges = false;

  let houses = (data.mediaHouses || []).map((m) => {
    const memberIds = m.members && Array.isArray(m.members) ? m.members : [m.ownerId];
    const membersData = data.users
      .filter((u) => memberIds.includes(u.id))
      .map(sanitizeMember);
    const articles = data.articles.filter((a) => a.mediaId === m.id || (a.mediaName && a.mediaName.toLowerCase() === m.name.toLowerCase()));

    const followers = data.follows.filter((f) => f.targetId === m.id || (m.ownerId && f.targetId === m.ownerId));
    const isFollowing = currentUserId
      ? data.follows.some((f) => f.followerId === currentUserId && (f.targetId === m.id || (m.ownerId && f.targetId === m.ownerId)))
      : false;
    const followersCount = m.followersCount ? Math.max(m.followersCount, followers.length) : followers.length;
    const membersCount = memberIds.length;

    // Auto-verify if >= 100 followers OR >= 100 members
    if ((followersCount >= 100 || membersCount >= 100) && !m.isVerified) {
      m.isVerified = true;
      hasChanges = true;
    }

    return {
      ...m,
      members: memberIds,
      membersData,
      journalistsCount: memberIds.length,
      articlesCount: Math.max(m.articlesCount || 0, articles.length),
      maxJournalists: MAX_JOURNALISTS_PER_HOUSE,
      followersCount,
      isFollowing,
    };
  });

  if (hasChanges) {
    db.save();
  }

  if (q) {
    const query = String(q).toLowerCase().trim();
    houses = houses.filter(
      (h) =>
        h.name.toLowerCase().includes(query) ||
        h.description.toLowerCase().includes(query) ||
        h.ownerName.toLowerCase().includes(query)
    );
  }

  return res.json({ mediaHouses: houses });
});

// 2. Get current journalist's active house (My House)
housesRouter.get('/my-house', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;

  const house = (data.mediaHouses || []).find(
    (m) =>
      m.ownerId === user.id ||
      (m.members && Array.isArray(m.members) && m.members.includes(user.id)) ||
      (user.mediaId && m.id === user.mediaId)
  );

  if (!house) {
    return res.json({ house: null });
  }

  const memberIds = house.members && Array.isArray(house.members) ? house.members : [house.ownerId];
  const membersData = data.users
    .filter((u) => memberIds.includes(u.id))
    .map(sanitizeMember);

  const isChef = house.ownerId === user.id || isMasterAdmin(user.email);
  const houseArticles = data.articles.filter((a) => a.mediaId === house.id);

  const totalViews = houseArticles.reduce((acc, a) => acc + (a.viewsCount || 0), 0);
  const totalLikes = houseArticles.reduce((acc, a) => acc + (a.likesCount || 0), 0);
  const totalComments = houseArticles.reduce((acc, a) => acc + (a.commentsCount || 0), 0);

  return res.json({
    house: {
      ...house,
      members: memberIds,
      membersData,
      journalistsCount: memberIds.length,
      articlesCount: houseArticles.length,
      maxJournalists: MAX_JOURNALISTS_PER_HOUSE,
    },
    articles: houseArticles,
    stats: {
      totalViews,
      totalLikes,
      totalComments,
      totalArticles: houseArticles.length,
    },
    isChef,
    maxJournalists: MAX_JOURNALISTS_PER_HOUSE,
    canAddMembers: isChef && memberIds.length < MAX_JOURNALISTS_PER_HOUSE,
  });
});

// 3. Get available accredited journalists who can be added to a house
housesRouter.get('/available-journalists', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;

  // Must be a journalist or admin to view
  if (user.role !== 'journalist' && user.role !== 'admin' && !isMasterAdmin(user.email)) {
    return res.status(403).json({ error: 'Accès réservé aux journalistes et administrateurs.' });
  }

  // Find all journalists whose status is active
  const journalists = data.users
    .filter((u) => u.role === 'journalist' && u.status === 'active')
    .map((u) => {
      const house = (data.mediaHouses || []).find(
        (m) => m.ownerId === u.id || (m.members && m.members.includes(u.id))
      );
      return {
        ...sanitizeMember(u),
        currentHouseId: house ? house.id : undefined,
        currentHouseName: house ? house.name : undefined,
        isAvailable: !house,
      };
    });

  return res.json({ journalists });
});

// 4. Get a specific media house by ID or slug
housesRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const house = (data.mediaHouses || []).find((m) => m.id === req.params.id || m.slug === req.params.id);

  if (!house) {
    return res.status(404).json({ error: 'Maison de journalistes introuvable.' });
  }

  const currentUserId = req.user?.id;
  const memberIds = house.members && Array.isArray(house.members) ? house.members : [house.ownerId];
  const membersData = data.users
    .filter((u) => memberIds.includes(u.id))
    .map(sanitizeMember);

  const houseArticles = data.articles.filter((a) => a.mediaId === house.id && a.status === 'published');

  const followers = data.follows.filter((f) => f.targetId === house.id || (house.ownerId && f.targetId === house.ownerId));
  const isFollowing = currentUserId
    ? data.follows.some((f) => f.followerId === currentUserId && (f.targetId === house.id || (house.ownerId && f.targetId === house.ownerId)))
    : false;
  const followersCount = house.followersCount ? Math.max(house.followersCount, followers.length) : followers.length;
  const membersCount = memberIds.length;

  // Auto-verify if >= 100 followers OR >= 100 members
  if ((followersCount >= 100 || membersCount >= 100) && !house.isVerified) {
    house.isVerified = true;
    db.save();
  }

  return res.json({
    house: {
      ...house,
      members: memberIds,
      membersData,
      journalistsCount: memberIds.length,
      articlesCount: houseArticles.length,
      maxJournalists: MAX_JOURNALISTS_PER_HOUSE,
      followersCount,
      isFollowing,
    },
    articles: houseArticles,
  });
});

// Follow / Unfollow a media house
housesRouter.post('/:id/follow', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const currentUserId = req.user!.id;
  const houseId = req.params.id;

  const house = (data.mediaHouses || []).find((h) => h.id === houseId || h.slug === houseId);
  if (!house) {
    return res.status(404).json({ error: 'Maison de presse introuvable.' });
  }

  const existingIndex = data.follows.findIndex(
    (f) => f.followerId === currentUserId && (f.targetId === house.id || (house.ownerId && f.targetId === house.ownerId))
  );

  let isFollowing = false;
  if (existingIndex !== -1) {
    data.follows.splice(existingIndex, 1);
    isFollowing = false;
  } else {
    data.follows.push({
      id: `flw_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      followerId: currentUserId,
      targetId: house.id,
      createdAt: new Date().toISOString(),
    });
    isFollowing = true;

    if (house.ownerId && house.ownerId !== currentUserId) {
      data.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: house.ownerId,
        type: 'follow',
        title: 'Nouvel abonné pour votre Maison de Presse',
        message: `${req.user!.name} s'est abonné à votre rédaction "${house.name}".`,
        link: `/houses/${house.id}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  const followersCount = data.follows.filter((f) => f.targetId === house.id || (house.ownerId && f.targetId === house.ownerId)).length;
  const membersCount = house.members ? house.members.length : (house.journalistsCount || 1);

  // Auto-verify if >= 100 followers OR >= 100 members
  let newlyVerified = false;
  if ((followersCount >= 100 || membersCount >= 100) && !house.isVerified) {
    house.isVerified = true;
    newlyVerified = true;
    if (house.ownerId) {
      data.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: house.ownerId,
        type: 'system',
        title: 'Maison de Presse Certifiée (Badge Bleu TikTok) !',
        message: `Félicitations ! Votre maison de presse "${house.name}" a atteint 100 abonnés / membres. Elle est désormais certifiée avec le badge bleu officiel !`,
        link: `/houses/${house.id}`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  }

  db.save();
  return res.json({ isFollowing, followersCount, isVerified: house.isVerified, newlyVerified });
});

// 5. Create a new Media House (Chef role)
housesRouter.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;

  // Strict check: Only accounts with 'journalist' role or principal 'admin' can create a house
  if (user.role !== 'journalist' && user.role !== 'admin' && !isMasterAdmin(user.email)) {
    return res.status(403).json({
      error: 'Seuls les journalistes accrédités par les comptes principaux peuvent fonder une maison de journalistes.',
    });
  }

  // Check if user already owns or is member of a house
  const existingHouse = (data.mediaHouses || []).find(
    (m) => m.ownerId === user.id || (m.members && m.members.includes(user.id))
  );
  if (existingHouse && !isMasterAdmin(user.email)) {
    return res.status(400).json({
      error: `Vous êtes déjà rattaché à la maison de journalistes "${existingHouse.name}". Un journaliste ne peut appartenir qu'à une seule maison à la fois.`,
    });
  }

  const { name, description, logo, coverImage, phone, email, website, address, motto, specialties } = req.body;

  if (!name || name.trim().length < 3) {
    return res.status(400).json({ error: 'Le nom de la maison de journalistes doit comporter au moins 3 caractères.' });
  }

  const cleanName = sanitizeText(name, { maxLength: 80, allowNewlines: false });
  const cleanSlug = cleanName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const duplicate = (data.mediaHouses || []).find((m) => m.slug === cleanSlug);
  if (duplicate) {
    return res.status(400).json({ error: 'Une maison de journalistes avec un nom similaire existe déjà.' });
  }

  const newHouseId = `house_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  const newHouse: MediaHouse = {
    id: newHouseId,
    name: cleanName,
    slug: cleanSlug,
    logo: logo && isValidUrl(logo) ? logo : 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
    coverImage: coverImage && isValidUrl(coverImage) ? coverImage : 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
    description: description ? sanitizeText(description, { maxLength: 600 }) : `Maison de presse indépendante fondée par ${user.name}.`,
    motto: motto ? sanitizeText(motto, { maxLength: 120, allowNewlines: false }) : 'L\'information vérifiée, sans concession.',
    specialties: Array.isArray(specialties)
      ? specialties.map((s: string) => sanitizeText(s, { maxLength: 40, allowNewlines: false })).filter(Boolean)
      : ['Investigation', 'Société', 'Économie & Finance'],
    ownerId: user.id, // Chef de la maison
    ownerName: user.name,
    members: [user.id], // Le chef est le 1er membre sur les 5 autorisés
    memberRoles: { [user.id]: 'Chef de Rédaction' },
    editorialNotes: [],
    phone: phone ? sanitizeText(phone, { maxLength: 30, allowNewlines: false }) : undefined,
    email: email ? sanitizeText(email, { maxLength: 100, allowNewlines: false }) : undefined,
    website: website && isValidUrl(website) ? website.trim() : undefined,
    address: address ? sanitizeText(address, { maxLength: 150, allowNewlines: false }) : 'Bureau Éditorial Central',
    status: 'active',
    isVerified: true,
    journalistsCount: 1,
    articlesCount: 0,
    createdAt: now,
  };

  if (!data.mediaHouses) data.mediaHouses = [];
  data.mediaHouses.push(newHouse);

  // Link user to this new house
  user.mediaId = newHouse.id;
  user.mediaName = newHouse.name;

  db.save();
  realtimeHub.broadcast('mediaHouse:created', newHouse);

  return res.status(201).json({
    message: `Félicitations ! La maison de journalistes "${newHouse.name}" a été fondée avec succès. Vous en êtes le Chef de rédaction.`,
    house: newHouse,
  });
});

// 6. Update Media House information
housesRouter.put('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const house = (data.mediaHouses || []).find((m) => m.id === req.params.id);

  if (!house) {
    return res.status(404).json({ error: 'Maison de journalistes introuvable.' });
  }

  // Only the Chef or a Master Admin can update house details
  const isChef = house.ownerId === user.id;
  const isSuperAdmin = user.role === 'admin' || isMasterAdmin(user.email);
  if (!isChef && !isSuperAdmin) {
    return res.status(403).json({ error: 'Seul le Chef de cette maison ou les comptes principaux peuvent modifier ses informations.' });
  }

  const { name, description, logo, coverImage, phone, email, website, address, motto, specialties } = req.body;

  if (name && name.trim().length >= 3) {
    const oldName = house.name;
    house.name = sanitizeText(name, { maxLength: 80, allowNewlines: false });
    // Update mediaName for all members
    if (house.members) {
      data.users.forEach((u) => {
        if (house.members!.includes(u.id)) {
          u.mediaName = house.name;
        }
      });
    }
  }

  if (description !== undefined) {
    house.description = sanitizeText(description, { maxLength: 600 });
  }
  if (motto !== undefined) {
    house.motto = sanitizeText(motto, { maxLength: 120, allowNewlines: false });
  }
  if (Array.isArray(specialties)) {
    house.specialties = specialties
      .map((s: string) => sanitizeText(s, { maxLength: 40, allowNewlines: false }))
      .filter(Boolean);
  }
  if (logo && isValidUrl(logo)) house.logo = logo;
  if (coverImage && isValidUrl(coverImage)) house.coverImage = coverImage;
  if (phone !== undefined) house.phone = phone ? sanitizeText(phone, { maxLength: 30, allowNewlines: false }) : undefined;
  if (email !== undefined) house.email = email ? sanitizeText(email, { maxLength: 100, allowNewlines: false }) : undefined;
  if (website !== undefined) house.website = website && isValidUrl(website) ? website.trim() : undefined;
  if (address !== undefined) house.address = address ? sanitizeText(address, { maxLength: 150, allowNewlines: false }) : undefined;

  db.save();
  realtimeHub.broadcast('mediaHouse:updated', house);

  return res.json({
    message: 'Informations de la maison mises à jour avec succès.',
    house,
  });
});

// 7. Add a journalist member to the House (Max 5 journalists rule)
housesRouter.post('/:id/members', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const house = (data.mediaHouses || []).find((m) => m.id === req.params.id);

  if (!house) {
    return res.status(404).json({ error: 'Maison de journalistes introuvable.' });
  }

  // Only the Chef or a Master Admin can add members
  const isChef = house.ownerId === user.id;
  const isSuperAdmin = user.role === 'admin' || isMasterAdmin(user.email);
  if (!isChef && !isSuperAdmin) {
    return res.status(403).json({ error: 'Seul le Chef de cette maison peut intégrer de nouveaux journalistes.' });
  }

  if (!house.members) {
    house.members = [house.ownerId];
  }

  // STRICT RULE: Max 5 journalists per house
  if (house.members.length >= MAX_JOURNALISTS_PER_HOUSE) {
    return res.status(400).json({
      error: `Capacité maximale atteinte : cette maison compte déjà ${MAX_JOURNALISTS_PER_HOUSE} journalistes (limite stricte du protocole anti-désinformation).`,
    });
  }

  const { journalistId } = req.body;
  if (!journalistId) {
    return res.status(400).json({ error: 'Veuillez sélectionner un journaliste à intégrer.' });
  }

  const targetJournalist = data.users.find((u) => u.id === journalistId);
  if (!targetJournalist) {
    return res.status(404).json({ error: 'Journaliste introuvable.' });
  }

  // STRICT RULE: Target MUST have role 'journalist' (promoted by master admin)
  if (targetJournalist.role !== 'journalist' && targetJournalist.role !== 'admin') {
    return res.status(400).json({
      error: `L'utilisateur "${targetJournalist.name}" n'est pas un journaliste accrédité. Seuls les 2 comptes principaux peuvent promouvoir un compte citoyen au rang de journaliste.`,
    });
  }

  // Check if target is already in this house
  if (house.members.includes(targetJournalist.id)) {
    return res.status(400).json({ error: `Le journaliste "${targetJournalist.name}" fait déjà partie de cette maison.` });
  }

  // Check if target is already in another house
  const otherHouse = (data.mediaHouses || []).find(
    (m) => m.id !== house.id && (m.ownerId === targetJournalist.id || (m.members && m.members.includes(targetJournalist.id)))
  );
  if (otherHouse) {
    return res.status(400).json({
      error: `Le journaliste "${targetJournalist.name}" appartient déjà à la maison "${otherHouse.name}".`,
    });
  }

  // Add journalist to house
  house.members.push(targetJournalist.id);
  house.journalistsCount = house.members.length;

  targetJournalist.mediaId = house.id;
  targetJournalist.mediaName = house.name;

  // Add notification to the added journalist
  data.notifications.unshift({
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    userId: targetJournalist.id,
    type: 'system',
    title: 'Bienvenue dans votre Maison de Journalistes',
    message: `${user.name} (Chef de rédaction) vous a intégré à la maison "${house.name}". Vous pouvez désormais publier vos articles sous l'égide de cette maison.`,
    read: false,
    createdAt: new Date().toISOString(),
  });

  db.save();
  realtimeHub.broadcast('mediaHouse:updated', house);

  const membersData = data.users
    .filter((u) => house.members!.includes(u.id))
    .map(sanitizeMember);

  return res.json({
    message: `Le journaliste "${targetJournalist.name}" a été intégré avec succès à la maison "${house.name}" (${house.members.length}/${MAX_JOURNALISTS_PER_HOUSE} journalistes).`,
    house: {
      ...house,
      membersData,
    },
  });
});

// 8. Remove a journalist member from the House
housesRouter.delete('/:id/members/:memberId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const house = (data.mediaHouses || []).find((m) => m.id === req.params.id);

  if (!house) {
    return res.status(404).json({ error: 'Maison de journalistes introuvable.' });
  }

  const { memberId } = req.params;

  // Chef or Master Admin or the member himself can perform this action
  const isChef = house.ownerId === user.id;
  const isSuperAdmin = user.role === 'admin' || isMasterAdmin(user.email);
  const isSelfLeaving = user.id === memberId;

  if (!isChef && !isSuperAdmin && !isSelfLeaving) {
    return res.status(403).json({ error: 'Permission refusée pour retirer ce journaliste.' });
  }

  // Cannot remove the Chef
  if (memberId === house.ownerId) {
    return res.status(400).json({
      error: 'Le Chef de la maison ne peut pas être retiré. Pour changer de chef ou fermer la maison, contactez un compte principal.',
    });
  }

  if (!house.members) {
    house.members = [house.ownerId];
  }

  if (!house.members.includes(memberId)) {
    return res.status(404).json({ error: 'Ce journaliste ne figure pas dans cette maison.' });
  }

  // Remove from house members
  house.members = house.members.filter((id) => id !== memberId);
  house.journalistsCount = house.members.length;

  // Detach user
  const removedUser = data.users.find((u) => u.id === memberId);
  if (removedUser) {
    removedUser.mediaId = undefined;
    removedUser.mediaName = undefined;

    // Notification
    data.notifications.unshift({
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: removedUser.id,
      type: 'system',
      title: 'Maison de Journalistes',
      message: isSelfLeaving
        ? `Vous avez quitté la maison de journalistes "${house.name}".`
        : `Vous avez été retiré de la maison de journalistes "${house.name}". Vous devez rejoindre ou fonder une autre maison pour publier des articles.`,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }

  db.save();
  realtimeHub.broadcast('mediaHouse:updated', house);

  const membersData = data.users
    .filter((u) => house.members!.includes(u.id))
    .map(sanitizeMember);

  return res.json({
    message: `Le journaliste a été retiré de la maison avec succès (${house.members.length}/${MAX_JOURNALISTS_PER_HOUSE} journalistes).`,
    house: {
      ...house,
      membersData,
    },
  });
});

// 9. Delete Media House (Chef of the house or Master Admin)
housesRouter.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const houseIndex = (data.mediaHouses || []).findIndex((m) => m.id === req.params.id);

  if (houseIndex === -1) {
    return res.status(404).json({ error: 'Maison de journalistes introuvable.' });
  }

  const house = data.mediaHouses[houseIndex];
  const isChef = house.ownerId === user.id;
  const isSuperAdmin = user.role === 'admin' || isMasterAdmin(user.email);

  if (!isChef && !isSuperAdmin) {
    return res.status(403).json({
      error: 'Action non autorisée : seul le Chef de cette maison ou un administrateur principal peut la dissoudre.',
    });
  }

  const { reason } = req.body || {};

  // Detach all members
  const memberIds = house.members && Array.isArray(house.members) ? house.members : [house.ownerId];
  data.users.forEach((u) => {
    if (memberIds.includes(u.id) || u.mediaId === house.id) {
      u.mediaId = undefined;
      u.mediaName = undefined;

      // Notification
      data.notifications.unshift({
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        userId: u.id,
        type: 'system',
        title: 'Maison de Journalistes dissoute',
        message: `La maison de journalistes "${house.name}" a été officiellement dissoute par ${isSuperAdmin ? "l'administrateur principal" : `le Chef ${user.name}`}. Motif : ${reason || 'Dissolution de la rédaction'}.`,
        read: false,
        createdAt: new Date().toISOString(),
      });
    }
  });

  // Remove house
  data.mediaHouses.splice(houseIndex, 1);
  db.save();
  realtimeHub.broadcast('mediaHouse:deleted', { houseId: req.params.id });

  return res.json({
    message: `La maison de journalistes "${house.name}" a été dissoute avec succès. Les journalistes membres ont été libérés.`,
  });
});

// 10. Update member editorial title/role in the House
housesRouter.put('/:id/members/:memberId/role', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const house = (data.mediaHouses || []).find((m) => m.id === req.params.id);

  if (!house) {
    return res.status(404).json({ error: 'Maison de journalistes introuvable.' });
  }

  const isChef = house.ownerId === user.id;
  const isSuperAdmin = user.role === 'admin' || isMasterAdmin(user.email);
  if (!isChef && !isSuperAdmin) {
    return res.status(403).json({ error: 'Seul le Chef de cette maison peut attribuer les titres éditoriaux.' });
  }

  const { memberId } = req.params;
  const { title } = req.body;

  if (!house.members || !house.members.includes(memberId)) {
    return res.status(404).json({ error: 'Ce journaliste n\'est pas membre de la maison.' });
  }

  const cleanTitle = title ? sanitizeText(title, { maxLength: 50, allowNewlines: false }) : 'Journaliste';

  if (!house.memberRoles) house.memberRoles = {};
  house.memberRoles[memberId] = cleanTitle;

  db.save();
  realtimeHub.broadcast('mediaHouse:updated', house);

  return res.json({
    message: `Le titre de « ${cleanTitle} » a été attribué avec succès.`,
    memberRoles: house.memberRoles,
    house,
  });
});

// 11. Add an internal editorial note / story lead
housesRouter.post('/:id/notes', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const house = (data.mediaHouses || []).find((m) => m.id === req.params.id);

  if (!house) {
    return res.status(404).json({ error: 'Maison de journalistes introuvable.' });
  }

  const isMember = house.ownerId === user.id || (house.members && house.members.includes(user.id)) || isMasterAdmin(user.email);
  if (!isMember) {
    return res.status(403).json({ error: 'Seuls les membres de cette rédaction peuvent poster des notes de service.' });
  }

  const { content, priority } = req.body;
  if (!content || content.trim().length < 3) {
    return res.status(400).json({ error: 'Le contenu de la note de rédaction est trop court.' });
  }

  const validPriority = ['urgent', 'standard', 'investigation'].includes(priority) ? priority : 'standard';

  const newNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    authorId: user.id,
    authorName: user.name,
    authorAvatar: user.avatar,
    content: sanitizeText(content, { maxLength: 800 }),
    priority: validPriority as 'urgent' | 'standard' | 'investigation',
    createdAt: new Date().toISOString(),
  };

  if (!house.editorialNotes) house.editorialNotes = [];
  house.editorialNotes.unshift(newNote);

  db.save();
  realtimeHub.broadcast('mediaHouse:updated', house);

  return res.status(201).json({
    message: 'Note de conférence de rédaction enregistrée.',
    note: newNote,
    house,
  });
});

// 12. Delete an internal editorial note
housesRouter.delete('/:id/notes/:noteId', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const house = (data.mediaHouses || []).find((m) => m.id === req.params.id);

  if (!house) {
    return res.status(404).json({ error: 'Maison de journalistes introuvable.' });
  }

  if (!house.editorialNotes) {
    return res.status(404).json({ error: 'Note introuvable.' });
  }

  const noteIndex = house.editorialNotes.findIndex((n) => n.id === req.params.noteId);
  if (noteIndex === -1) {
    return res.status(404).json({ error: 'Note introuvable.' });
  }

  const note = house.editorialNotes[noteIndex];
  const isAuthor = note.authorId === user.id;
  const isChef = house.ownerId === user.id;
  const isSuperAdmin = user.role === 'admin' || isMasterAdmin(user.email);

  if (!isAuthor && !isChef && !isSuperAdmin) {
    return res.status(403).json({ error: 'Vous ne pouvez pas supprimer cette note de service.' });
  }

  house.editorialNotes.splice(noteIndex, 1);
  db.save();
  realtimeHub.broadcast('mediaHouse:updated', house);

  return res.json({
    message: 'Note supprimée du carnet de bord de la rédaction.',
    house,
  });
});
