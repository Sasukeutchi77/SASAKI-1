import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { User, Category, Article, Comment, Notification, VerificationRequest, Report, MediaHouse, AdminLog, MediaRecord } from '../src/types';

export interface DBFollow {
  id: string;
  followerId: string;
  targetId: string; // userId or mediaId
  createdAt: string;
}

export interface DBLike {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
}

export interface DBCommentLike {
  id: string;
  userId: string;
  commentId: string;
  createdAt: string;
}

export interface DBBookmark {
  id: string;
  userId: string;
  articleId: string;
  createdAt: string;
}

export interface DBView {
  id: string;
  articleId: string;
  userId?: string;
  ip?: string;
  viewedAt: string;
}

export interface UserWithPassword extends User {
  passwordHash: string;
  passwordSalt: string;
}

export interface DatabaseSchema {
  users: UserWithPassword[];
  categories: Category[];
  articles: Article[];
  comments: Comment[];
  likes: DBLike[];
  commentLikes: DBCommentLike[];
  bookmarks: DBBookmark[];
  follows: DBFollow[];
  notifications: Notification[];
  verificationRequests: VerificationRequest[];
  reports: Report[];
  views: DBView[];
  mediaHouses: MediaHouse[];
  adminLogs: AdminLog[];
  mediaRecords: MediaRecord[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Security helper: Password hash using Node's crypto
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const generatedSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, generatedSalt, 64).toString('hex');
  return { hash, salt: generatedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
}

// Token generator helper (HMAC SHA-256 based)
const JWT_SECRET = process.env.JWT_SECRET || 'purgeinfo-secure-secret-key-2026-global';

export function generateToken(payload: { userId: string; role: string; email: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { userId: string; role: string; email: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Initial Database Seeding
function createInitialData(): DatabaseSchema {
  const adminPass = hashPassword('admin123');
  const mediaPass = hashPassword('media123');
  const journPass = hashPassword('journ123');
  const readerPass = hashPassword('user123');

  const users: UserWithPassword[] = [
    {
      id: 'usr_admin',
      email: 'admin@purgeinfo.com',
      passwordHash: adminPass.hash,
      passwordSalt: adminPass.salt,
      name: 'Direction Générale',
      role: 'admin',
      isVerified: true,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Équipe de modération et administration de la plateforme purge-info.',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'usr_globalnews',
      email: 'medianews@purgeinfo.com',
      passwordHash: mediaPass.hash,
      passwordSalt: mediaPass.salt,
      name: 'Média Global News',
      role: 'journalist',
      isVerified: true,
      status: 'active',
      mediaName: 'Global News Agency',
      mediaId: 'media_globalnews',
      avatar: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
      bio: 'Agence internationale d’information continue, d’enquêtes et d’analyses indépendantes.',
      followersCount: 125000,
      followingCount: 14,
      verificationStatus: 'approved',
      createdAt: '2026-01-05T09:30:00Z',
    },
    {
      id: 'usr_salif',
      email: 'lucas.moreau@purgeinfo.com',
      passwordHash: journPass.hash,
      passwordSalt: journPass.salt,
      name: 'Lucas Moreau',
      role: 'journalist',
      isVerified: true,
      status: 'active',
      mediaName: 'L’Observateur International',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'Grand reporter et analyste des politiques économiques et des technologies émergentes.',
      followersCount: 18400,
      followingCount: 65,
      verificationStatus: 'approved',
      createdAt: '2026-01-10T11:00:00Z',
    },
    {
      id: 'usr_aminata',
      email: 'clara.dupont@purgeinfo.com',
      passwordHash: readerPass.hash,
      passwordSalt: readerPass.salt,
      name: 'Clara Dupont',
      role: 'reader',
      isVerified: false,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
      bio: 'Lectrice citoyenne passionnée par les innovations technologiques et le journalisme d’investigation.',
      followersCount: 12,
      followingCount: 8,
      createdAt: '2026-02-01T14:20:00Z',
    },
  ];

  const categories: Category[] = [
    { id: 'cat_international', name: 'International', slug: 'international', description: 'Actualités mondiales, géopolitique et diplomatie globale' },
    { id: 'cat_afrique', name: 'Monde & Régions', slug: 'monde-regions', description: 'Évolutions majeures et décryptages régionaux à l’international' },
    { id: 'cat_politique', name: 'Politique', slug: 'politique', description: 'Gouvernance, réformes institutionnelles et démocratie' },
    { id: 'cat_economie', name: 'Économie', slug: 'economie', description: 'Finances, investissements, industrie et transition durable' },
    { id: 'cat_societe', name: 'Société', slug: 'societe', description: 'Initiatives citoyennes, écologie et cohésion sociale' },
    { id: 'cat_sport', name: 'Sport', slug: 'sport', description: 'Football mondial, athlétisme, sports mécaniques et grandes compétitions' },
    { id: 'cat_technologie', name: 'Technologie', slug: 'technologie', description: 'Startups, numérique, intelligence artificielle et cybersécurité' },
    { id: 'cat_education', name: 'Éducation', slug: 'education', description: 'Sciences, universités, formation professionnelle et recherche' },
    { id: 'cat_culture', name: 'Culture', slug: 'culture', description: 'Cinéma, festivals, arts contemporains, musique et littérature' },
    { id: 'cat_sante', name: 'Santé', slug: 'sante', description: 'Recherche médicale, politiques de santé et bien-être' },
    { id: 'cat_faits_divers', name: 'Faits divers', slug: 'faits-divers', description: 'Événements insolites et chroniques du monde' },
  ];

  const articles: Article[] = [
    {
      id: 'art_1',
      title: 'Transition énergétique et souveraineté : Les nouveaux chantiers industriels mondiaux pour 2026',
      summary: 'Accélération de la transformation locale des matières premières, décarbonation et renforcement de l’autonomie par les énergies renouvelables.',
      content: `Les acteurs industriels mondiaux ont présenté cette semaine leur feuille de route axée sur la souveraineté technologique, la valorisation des ressources et la transition énergétique durable.

Parmi les priorités figurent la relocalisation stratégique des unités de production et la mise en service de nouveaux parcs photovoltaïques et éoliens de dernière génération.

L’objectif affiché est d’augmenter la part de valeur ajoutée produite localement tout en stimulant la création d’emplois qualifiés pour les nouvelles générations d'ici la fin de l'année. Les observateurs économiques ont salué ces mesures tout en appelant à poursuivre l'amélioration de la gouvernance.`,
      authorId: 'usr_globalnews',
      authorName: 'Média Global News',
      authorAvatar: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
      authorRole: 'journalist',
      isAuthorVerified: true,
      mediaId: 'media_globalnews',
      mediaName: 'Global News Agency',
      coverImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=1000&auto=format&fit=crop&q=80'
      ],
      categoryId: 'cat_economie',
      categoryName: 'Économie',
      tags: [],
      status: 'published',
      viewsCount: 1420,
      likesCount: 184,
      commentsCount: 28,
      createdAt: '2026-03-05T08:30:00Z',
      updatedAt: '2026-03-05T08:30:00Z',
    },
    {
      id: 'art_2',
      title: 'Biennales artistiques et festivals : Le dynamisme de la création culturelle contemporaine',
      summary: 'Les préparatifs des grands rendez-vous artistiques mobilisent créateurs, cinéastes et artisans dans une ferveur créative renouvelée.',
      content: `L'effervescence artistique est au cœur des métropoles culturelles. Les ateliers de design, les créateurs indépendants et les sociétés de production cinématographique s'activent pour finaliser leurs œuvres en prévision des prochaines biennales.

Les institutions culturelles ont confirmé le soutien accru aux jeunes créateurs avec un fonds spécial d'amorçage pour la création contemporaine.

Plusieurs expositions itinérantes mettront à l'honneur le design textile et l'artisanat d'art, fleurons de l'identité et de la créativité reconnus à l'échelle internationale.`,
      authorId: 'usr_salif',
      authorName: 'Lucas Moreau',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      authorRole: 'journalist',
      isAuthorVerified: true,
      mediaName: 'L’Observateur International',
      coverImage: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1000&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1000&auto=format&fit=crop&q=80'
      ],
      categoryId: 'cat_culture',
      categoryName: 'Culture',
      tags: [],
      status: 'published',
      viewsCount: 980,
      likesCount: 142,
      commentsCount: 14,
      createdAt: '2026-03-04T10:15:00Z',
      updatedAt: '2026-03-04T10:15:00Z',
    },
    {
      id: 'art_3',
      title: 'Agritech & Écologie : Comment l’irrigation intelligente et le solaire révolutionnent les cultures',
      summary: 'Des coopératives combinent pompage solaire et capteurs connectés pour optimiser les rendements tout en préservant les nappes phréatiques.',
      content: `Dans les plaines maraîchères, une révolution silencieuse est en cours. Grâce à l'implantation de micro-stations solaires couplées à des capteurs d'humidité de fabrication innovante, les exploitants agricoles optimisent l'apport en eau au goutte-à-goutte.

Le projet pilote initié par un consortium de jeunes ingénieurs agronomes permet une économie d'eau de plus de 55% par rapport aux techniques traditionnelles.

Les premières récoltes de cette campagne témoignent d'une hausse significative des rendements et d'une sécurité alimentaire renforcée pour les populations.`,
      authorId: 'usr_salif',
      authorName: 'Lucas Moreau',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      authorRole: 'journalist',
      isAuthorVerified: true,
      mediaName: 'L’Observateur International',
      coverImage: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=1000&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=1000&auto=format&fit=crop&q=80'],
      categoryId: 'cat_technologie',
      categoryName: 'Technologie',
      tags: [],
      status: 'published',
      viewsCount: 1120,
      likesCount: 167,
      commentsCount: 19,
      createdAt: '2026-03-03T16:45:00Z',
      updatedAt: '2026-03-03T16:45:00Z',
    },
    {
      id: 'art_4',
      title: 'Qualifications mondiales : Préparation intensive et stratégie tactique pour les sélections',
      summary: 'Le sélectionneur dévoile une liste équilibrée entre cadres expérimentés et jeunes talents évoluant dans les championnats d’élite.',
      content: `Les sélections sportives entament leur phase de regroupement tactique en vue des prochaines échéances éliminatoires internationales.

Le staff technique a insisté sur la rigueur tactique et la solidité défensive lors des séances d'entraînement intensives. Les supporters se mobilisent pour porter leurs équipes vers une qualification historique.`,
      authorId: 'usr_globalnews',
      authorName: 'Média Global News',
      authorAvatar: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
      authorRole: 'journalist',
      isAuthorVerified: true,
      mediaId: 'media_globalnews',
      mediaName: 'Global News Agency',
      coverImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1000&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1000&auto=format&fit=crop&q=80'],
      categoryId: 'cat_sport',
      categoryName: 'Sport',
      tags: [],
      status: 'published',
      viewsCount: 2310,
      likesCount: 389,
      commentsCount: 63,
      createdAt: '2026-03-02T18:00:00Z',
      updatedAt: '2026-03-02T18:00:00Z',
    },
    {
      id: 'art_5',
      title: 'Paiement numérique et télécoms : Stratégie commune pour l’interopérabilité transfrontalière',
      summary: 'Mise en place d’une plateforme d’interopérabilité financière et réduction tarifaire des flux numériques transfrontaliers.',
      content: `Les autorités de régulation du numérique ont ratifié un protocole d'accord visant l'interconnexion complète des réseaux de fibre optique et la baisse des frais de transaction financière.

Ce dispositif facilitera considérablement le commerce électronique et les transferts de fonds pour les commerçants, entreprises et citoyens.`,
      authorId: 'usr_globalnews',
      authorName: 'Média Global News',
      authorAvatar: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
      authorRole: 'journalist',
      isAuthorVerified: true,
      mediaId: 'media_globalnews',
      mediaName: 'Global News Agency',
      coverImage: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1000&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1000&auto=format&fit=crop&q=80'],
      categoryId: 'cat_afrique',
      categoryName: 'Monde & Régions',
      tags: [],
      status: 'published',
      viewsCount: 1650,
      likesCount: 245,
      commentsCount: 31,
      createdAt: '2026-03-01T12:00:00Z',
      updatedAt: '2026-03-01T12:00:00Z',
    },
  ];

  const comments: Comment[] = [
    {
      id: 'com_1',
      articleId: 'art_1',
      userId: 'usr_aminata',
      userName: 'Clara Dupont',
      userAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
      userRole: 'reader',
      isUserVerified: false,
      content: 'Excellente initiative pour la relocalisation industrielle ! C’est exactement ce qu’il nous faut pour valoriser nos ouvriers et stimuler l’emploi qualifié.',
      likesCount: 24,
      createdAt: '2026-03-05T09:12:00Z',
    },
    {
      id: 'com_2',
      articleId: 'art_1',
      userId: 'usr_salif',
      userName: 'Lucas Moreau',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      userRole: 'journalist',
      isUserVerified: true,
      parentId: 'com_1',
      content: 'Tout à fait d’accord Clara. D’ailleurs nos enquêtes de terrain indiquent que la première unité ouvrira dès le deuxième semestre.',
      likesCount: 18,
      createdAt: '2026-03-05T09:45:00Z',
    },
    {
      id: 'com_3',
      articleId: 'art_3',
      userId: 'usr_aminata',
      userName: 'Clara Dupont',
      userAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
      userRole: 'reader',
      isUserVerified: false,
      content: 'Ce genre d’innovation concrète donne beaucoup d’espoir face au stress hydrique mondial.',
      likesCount: 12,
      createdAt: '2026-03-03T18:20:00Z',
    },
  ];

  const follows: DBFollow[] = [
    {
      id: 'flw_1',
      followerId: 'usr_aminata',
      targetId: 'usr_globalnews',
      createdAt: '2026-02-10T10:00:00Z',
    },
    {
      id: 'flw_2',
      followerId: 'usr_aminata',
      targetId: 'usr_salif',
      createdAt: '2026-02-12T14:00:00Z',
    },
  ];

  const likes: DBLike[] = [
    { id: 'lk_1', userId: 'usr_aminata', articleId: 'art_1', createdAt: '2026-03-05T09:10:00Z' },
    { id: 'lk_2', userId: 'usr_aminata', articleId: 'art_3', createdAt: '2026-03-03T17:00:00Z' },
  ];

  const bookmarks: DBBookmark[] = [
    { id: 'bm_1', userId: 'usr_aminata', articleId: 'art_1', createdAt: '2026-03-05T09:15:00Z' },
    { id: 'bm_2', userId: 'usr_aminata', articleId: 'art_3', createdAt: '2026-03-03T17:05:00Z' },
  ];

  const notifications: Notification[] = [
    {
      id: 'notif_1',
      userId: 'usr_aminata',
      type: 'article',
      title: 'Nouvel article de Global News Agency',
      message: 'Média Global News a publié : Transition énergétique et souveraineté : Les nouveaux chantiers...',
      link: '/article/art_1',
      read: false,
      createdAt: '2026-03-05T08:31:00Z',
    },
    {
      id: 'notif_2',
      userId: 'usr_aminata',
      type: 'comment',
      title: 'Réponse à votre commentaire',
      message: 'Lucas Moreau a répondu à votre commentaire sur l’article économique.',
      link: '/article/art_1',
      read: true,
      createdAt: '2026-03-05T09:46:00Z',
    },
  ];

  const verificationRequests: VerificationRequest[] = [
    {
      id: 'req_1',
      userId: 'usr_salif',
      userName: 'Lucas Moreau',
      userEmail: 'lucas.moreau@purgeinfo.com',
      mediaName: 'L’Observateur International',
      pressCardNumber: 'PRESS-INTL-2025-8842',
      motivation: 'Journaliste d’investigation titulaire d’une carte de presse professionnelle depuis 2018.',
      status: 'approved',
      adminNotes: 'Carte de presse officielle validée après authentification.',
      createdAt: '2026-01-12T10:00:00Z',
      reviewedAt: '2026-01-13T14:30:00Z',
    },
  ];

  const reports: Report[] = [
    {
      id: 'rep_1',
      reporterId: 'usr_aminata',
      reporterName: 'Clara Dupont',
      targetType: 'comment',
      targetId: 'com_3',
      targetTitle: 'Commentaire sur Agritech & Écologie',
      reason: 'Demande de vérification de source',
      details: 'Demande de confirmation des sources techniques sur les capteurs solaires.',
      status: 'pending',
      createdAt: '2026-03-04T12:00:00Z',
    },
  ];

  const views: DBView[] = [];

  const mediaHouses: MediaHouse[] = [
    {
      id: 'media_globalnews',
      name: 'Global News Agency',
      slug: 'global-news-agency',
      logo: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
      description: 'Agence internationale de référence spécialisée dans le décryptage géopolitique, l’investigation et l’actualité continue.',
      ownerId: 'usr_globalnews',
      ownerName: 'Média Global News',
      phone: '+33 1 40 00 12 34',
      email: 'contact@globalnews.example.com',
      website: 'https://globalnews.example.com',
      address: 'Siège International, 12 Avenue des Médias',
      status: 'active',
      isVerified: true,
      journalistsCount: 12,
      articlesCount: 4,
      createdAt: '2026-01-05T09:30:00Z',
    },
    {
      id: 'media_obs_intl',
      name: 'L’Observateur International',
      slug: 'lobservateur-international',
      logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1000&auto=format&fit=crop&q=80',
      description: 'Grand média d’investigation, d’économie mondiale et de reportages de terrain approfondis.',
      ownerId: 'usr_salif',
      ownerName: 'Lucas Moreau',
      phone: '+33 1 45 20 50 60',
      email: 'redaction@lobservateur-intl.example.com',
      website: 'https://lobservateur-intl.example.com',
      address: 'Bureau Central d’Investigation, 45 Rue de la Presse',
      status: 'active',
      isVerified: true,
      journalistsCount: 8,
      articlesCount: 2,
      createdAt: '2026-01-10T11:00:00Z',
    },
    {
      id: 'media_sidwaya',
      name: 'Courrier des Citoyens',
      slug: 'courrier-citoyens',
      logo: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=150&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=1000&auto=format&fit=crop&q=80',
      description: 'Organe d’information générale citoyenne, de débats démocratiques et de reportage institutionnel.',
      ownerId: 'usr_admin',
      ownerName: 'Direction Générale',
      phone: '+33 1 42 10 30 40',
      email: 'info@courrier-citoyens.example.com',
      website: 'https://courrier-citoyens.example.com',
      address: 'Centre International de Presse, 8 Esplanade des Médias',
      status: 'active',
      isVerified: true,
      journalistsCount: 15,
      articlesCount: 5,
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'media_omega',
      name: 'Nexus Média Direct',
      slug: 'nexus-media',
      logo: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=150&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1000&auto=format&fit=crop&q=80',
      description: 'Plateforme multimédia d’actualité en direct, podcasts et diffusions d’enquêtes vidéo.',
      ownerId: 'usr_globalnews',
      ownerName: 'Média Global News',
      phone: '+33 1 48 90 00 11',
      email: 'redaction@nexusmedia.example.com',
      website: 'https://nexusmedia.example.com',
      address: 'Pôle Numérique & Médias, Tour Horizon',
      status: 'active',
      isVerified: true,
      journalistsCount: 9,
      articlesCount: 1,
      createdAt: '2026-01-15T08:00:00Z',
    },
  ];

  const adminLogs: AdminLog[] = [
    {
      id: 'log_1',
      adminId: 'usr_admin',
      adminName: 'Direction Générale',
      action: 'verify_journalist',
      targetType: 'journalist',
      targetId: 'usr_salif',
      targetTitle: 'Lucas Moreau',
      details: 'Accréditation validée après authentification de la carte de presse officielle n°PRESS-INTL-2025-8842',
      timestamp: '2026-01-13T14:30:00Z',
    },
    {
      id: 'log_2',
      adminId: 'usr_admin',
      adminName: 'Direction Générale',
      action: 'verify_media',
      targetType: 'media',
      targetId: 'media_globalnews',
      targetTitle: 'Global News Agency',
      details: 'Attribution du badge média officiel et agrément éditorial',
      timestamp: '2026-01-05T10:00:00Z',
    },
    {
      id: 'log_3',
      adminId: 'usr_admin',
      adminName: 'Direction Générale',
      action: 'init_platform',
      targetType: 'system',
      targetId: 'sys_root',
      targetTitle: 'Système purge-info',
      details: 'Initialisation de l’infrastructure de modération et règles de sécurité',
      timestamp: '2026-01-01T08:00:00Z',
    },
  ];

  // Set default status for comments and categories
  categories.forEach((c) => {
    if (!c.status) c.status = 'active';
  });

  comments.forEach((c) => {
    if (!c.status) c.status = 'active';
  });

  return {
    users,
    categories,
    articles,
    comments,
    likes,
    commentLikes: [],
    bookmarks,
    follows,
    notifications,
    verificationRequests,
    reports,
    views,
    mediaHouses,
    adminLogs,
    mediaRecords: [],
  };
}

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): DatabaseSchema {
    const initial = createInitialData();
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(content);
        // Ensure new collections exist even on existing database file
        if (!parsed.mediaHouses || parsed.mediaHouses.length === 0) {
          parsed.mediaHouses = initial.mediaHouses;
        }
        if (!parsed.adminLogs || parsed.adminLogs.length === 0) {
          parsed.adminLogs = initial.adminLogs;
        }
        if (!parsed.reports || parsed.reports.length === 0) {
          parsed.reports = initial.reports;
        }
        if (!parsed.mediaRecords) {
          parsed.mediaRecords = [];
        }
        if (parsed.categories) {
          parsed.categories.forEach((c: Category) => {
            if (!c.status) c.status = 'active';
          });
        }
        if (parsed.comments) {
          parsed.comments.forEach((c: Comment) => {
            if (!c.status) c.status = 'active';
          });
        }
        return parsed;
      }
    } catch (err) {
      console.error('Error reading db.json, generating default data:', err);
    }
    this.saveDataDirect(initial);
    return initial;
  }

  private saveDataDirect(data: DatabaseSchema) {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing db.json:', err);
    }
  }

  public save() {
    this.saveDataDirect(this.data);
  }

  public getData(): DatabaseSchema {
    return this.data;
  }
}

export const db = new Database();
