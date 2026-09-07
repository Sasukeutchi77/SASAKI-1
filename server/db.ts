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
const JWT_SECRET = process.env.JWT_SECRET || 'fasoinfo-secure-secret-key-2026-ouaga';

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
      email: 'admin@fasoinfo.bf',
      passwordHash: adminPass.hash,
      passwordSalt: adminPass.salt,
      name: 'Administrateur purge-info',
      role: 'admin',
      isVerified: true,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      bio: 'Équipe de modération et administration de la plateforme purge-info.',
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'usr_burkinanews',
      email: 'burkinanews@fasoinfo.bf',
      passwordHash: mediaPass.hash,
      passwordSalt: mediaPass.salt,
      name: 'Média Burkina News',
      role: 'journalist',
      isVerified: true,
      status: 'active',
      mediaName: 'Burkina News',
      mediaId: 'media_burkinanews',
      avatar: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
      bio: 'Première agence de presse indépendante d’actualité continue au Burkina Faso.',
      followersCount: 125000,
      followingCount: 14,
      verificationStatus: 'approved',
      createdAt: '2026-01-05T09:30:00Z',
    },
    {
      id: 'usr_salif',
      email: 'salif.ouedraogo@fasoinfo.bf',
      passwordHash: journPass.hash,
      passwordSalt: journPass.salt,
      name: 'Salif Ouédraogo',
      role: 'journalist',
      isVerified: true,
      status: 'active',
      mediaName: 'L’Observateur du Sahel',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      bio: 'Grand reporter et analyste des politiques économiques et géopolitiques en Afrique de l’Ouest.',
      followersCount: 18400,
      followingCount: 65,
      verificationStatus: 'approved',
      createdAt: '2026-01-10T11:00:00Z',
    },
    {
      id: 'usr_aminata',
      email: 'aminata.traore@fasoinfo.bf',
      passwordHash: readerPass.hash,
      passwordSalt: readerPass.salt,
      name: 'Aminata Traoré',
      role: 'reader',
      isVerified: false,
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
      bio: 'Passionnée de tech, de culture burkinabè et de développement durable.',
      followersCount: 12,
      followingCount: 8,
      createdAt: '2026-02-01T14:20:00Z',
    },
  ];

  const categories: Category[] = [
    { id: 'cat_burkina', name: 'Burkina Faso', slug: 'burkina-faso', description: 'Actualités nationales, politiques et citoyennes du Faso' },
    { id: 'cat_afrique', name: 'Afrique', slug: 'afrique', description: 'Évolutions majeures sur le continent africain' },
    { id: 'cat_international', name: 'International', slug: 'international', description: 'Actualités mondiales et relations géopolitiques' },
    { id: 'cat_politique', name: 'Politique', slug: 'politique', description: 'Gouvernance, réformes institutionnelles et diplomatie' },
    { id: 'cat_economie', name: 'Économie', slug: 'economie', description: 'Finances, investissements, agriculture et entrepreneuriat' },
    { id: 'cat_societe', name: 'Société', slug: 'societe', description: 'Vie quotidienne, initiatives citoyennes et cohésion sociale' },
    { id: 'cat_sport', name: 'Sport', slug: 'sport', description: 'Les Étalons, football, cyclisme (Tour du Faso) et disciplines' },
    { id: 'cat_technologie', name: 'Technologie', slug: 'technologie', description: 'Startups, numérique, intelligence artificielle et télécoms' },
    { id: 'cat_education', name: 'Éducation', slug: 'education', description: 'Écoles, universités, formation professionnelle et recherche' },
    { id: 'cat_culture', name: 'Culture', slug: 'culture', description: 'FESPACO, SIAO, musiques, traditions et littérature' },
    { id: 'cat_sante', name: 'Santé', slug: 'sante', description: 'Prévention médicale, centres hospitaliers et bien-être' },
    { id: 'cat_faits_divers', name: 'Faits divers', slug: 'faits-divers', description: 'Événements insolites et chroniques urbaines' },
  ];

  const articles: Article[] = [
    {
      id: 'art_1',
      title: 'Transition et souveraineté : Les nouveaux chantiers économiques du Burkina Faso pour 2026',
      summary: 'Accélération de la transformation locale des matières premières (coton, or, sésame) et renforcement de l’autonomie énergétique par les centrales solaires régionales.',
      content: `Le gouvernement de transition a présenté cette semaine sa feuille de route économique axée sur la souveraineté industrielle et la valorisation des ressources locales. 

Parmi les axes prioritaires figurent l'expansion des usines d'égrenage et de filature de coton dans la boucle du Mouhoun, ainsi que la mise en service de trois nouvelles centrales solaires photovoltaïques à Koudougou et Dédougou.

L'objectif affiché est d'augmenter la part de valeur ajoutée produite sur le territoire national tout en créant plus de 45 000 emplois directs pour la jeunesse burkinabè d'ici la fin de l'année. Les organisations patronales ont salué ces mesures tout en appelant à poursuivre l'amélioration du climat des affaires.`,
      authorId: 'usr_burkinanews',
      authorName: 'Média Burkina News',
      authorAvatar: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
      authorRole: 'journalist',
      isAuthorVerified: true,
      mediaId: 'media_burkinanews',
      mediaName: 'Burkina News',
      coverImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
        'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=1000&auto=format&fit=crop&q=80'
      ],
      categoryId: 'cat_economie',
      categoryName: 'Économie',
      tags: ['Économie', 'Industrie', 'Burkina Faso', 'Énergie Solaire'],
      status: 'published',
      viewsCount: 1420,
      likesCount: 184,
      commentsCount: 28,
      createdAt: '2026-03-05T08:30:00Z',
      updatedAt: '2026-03-05T08:30:00Z',
    },
    {
      id: 'art_2',
      title: 'FESPACO & SIAO : Ouagadougou affirme son statut de capitale culturelle africaine',
      summary: 'Les préparatifs des grands rendez-vous artistiques mobilisent créateurs, cinéastes et artisans de toute la sous-région dans une ferveur créative renouvelée.',
      content: `À Ouagadougou, l'effervescence artistique est à son comble. Les ateliers d'artisans de Bobo-Dioulasso et les sociétés de production cinématographique s'activent pour finaliser leurs œuvres en prévision des prochaines biennales culturelles.

Le ministère de la Communication, de la Culture, des Arts et du Tourisme a confirmé le soutien accru aux jeunes créateurs avec un fond spécial d'amorçage.

Plusieurs expositions itinérantes mettront à l'honneur le tissage traditionnel Faso Dan Fani, fleuron de l'identité et du savoir-faire textile burkinabè reconnu à l'échelle internationale.`,
      authorId: 'usr_salif',
      authorName: 'Salif Ouédraogo',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      authorRole: 'journalist',
      isAuthorVerified: true,
      mediaName: 'L’Observateur du Sahel',
      coverImage: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1000&auto=format&fit=crop&q=80',
      images: [
        'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1000&auto=format&fit=crop&q=80'
      ],
      categoryId: 'cat_culture',
      categoryName: 'Culture',
      tags: ['Culture', 'FESPACO', 'Faso Dan Fani', 'Artisanat'],
      status: 'published',
      viewsCount: 980,
      likesCount: 142,
      commentsCount: 14,
      createdAt: '2026-03-04T10:15:00Z',
      updatedAt: '2026-03-04T10:15:00Z',
    },
    {
      id: 'art_3',
      title: 'Agritech au Sahel : Comment l’irrigation goutte-à-goutte solaire révolutionne la vallée du Sourou',
      summary: 'Des coopératives de jeunes agriculteurs combinent pompage solaire et capteurs connectés pour tripler les rendements maraîchers tout en préservant la nappe phréatique.',
      content: `Dans la province du Sourou, grenier agricole du pays, une révolution silencieuse est en cours. Grâce à l'implantation de micro-stations solaires couplées à des capteurs d'humidité de fabrication locale, les exploitants agricoles optimisent l'apport en eau des parcelles de tomates, d'oignons et de maïs.

Le projet pilote initié par un consortium de jeunes ingénieurs formés à l'Université Joseph Ki-Zerbo permet une économie d'eau de 60% par rapport aux techniques d'inondation traditionnelles.

Les premières récoltes de cette campagne sèche témoignent d'une hausse significative des revenus paysans et d'une sécurité alimentaire renforcée pour les familles de la région.`,
      authorId: 'usr_salif',
      authorName: 'Salif Ouédraogo',
      authorAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      authorRole: 'journalist',
      isAuthorVerified: true,
      mediaName: 'L’Observateur du Sahel',
      coverImage: 'https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=1000&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1586771107445-d3ca888129ff?w=1000&auto=format&fit=crop&q=80'],
      categoryId: 'cat_technologie',
      categoryName: 'Technologie',
      tags: ['Agritech', 'Sourou', 'Agriculture', 'Solaire', 'Innovation'],
      status: 'published',
      viewsCount: 1120,
      likesCount: 167,
      commentsCount: 19,
      createdAt: '2026-03-03T16:45:00Z',
      updatedAt: '2026-03-03T16:45:00Z',
    },
    {
      id: 'art_4',
      title: 'Étalons du Faso : Préparation intensive pour la qualification à la Coupe du Monde',
      summary: 'Le sélectionneur national dévoile une liste équilibrée entre cadres expérimentés et jeunes talents évoluant dans les championnats d’élite.',
      content: `L'équipe nationale de football du Burkina Faso, les Étalons, entame sa phase de regroupement à Ouagadougou en vue des prochaines échéances éliminatoires.

Le staff technique a insisté sur la rigueur tactique et la solidité défensive lors des séances d'entraînement au stade du 4-Août. Les supporters se mobilisent déjà pour porter les ambassadeurs du pays vers une qualification historique.`,
      authorId: 'usr_burkinanews',
      authorName: 'Média Burkina News',
      authorAvatar: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
      authorRole: 'journalist',
      isAuthorVerified: true,
      mediaId: 'media_burkinanews',
      mediaName: 'Burkina News',
      coverImage: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1000&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1000&auto=format&fit=crop&q=80'],
      categoryId: 'cat_sport',
      categoryName: 'Sport',
      tags: ['Sport', 'Étalons', 'Football', 'Burkina Faso'],
      status: 'published',
      viewsCount: 2310,
      likesCount: 389,
      commentsCount: 63,
      createdAt: '2026-03-02T18:00:00Z',
      updatedAt: '2026-03-02T18:00:00Z',
    },
    {
      id: 'art_5',
      title: 'Confédération des États du Sahel : Stratégie commune pour les télécoms et le paiement numérique',
      summary: 'Mise en place d’une plateforme d’interopérabilité financière et réduction tarifaire des communications transfrontalières entre le Burkina, le Mali et le Niger.',
      content: `Les ministres en charge du numérique des pays de l'Alliance des États du Sahel (AES) ont ratifié à Niamey un protocole d'accord visant l'interconnexion complète des réseaux de fibre optique et la baisse des frais de roaming.

Ce dispositif facilitera considérablement les transactions commerciales transfrontalières par monnaie électronique pour les commerçants, transporteurs et citoyens de l'espace communautaire.`,
      authorId: 'usr_burkinanews',
      authorName: 'Média Burkina News',
      authorAvatar: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
      authorRole: 'journalist',
      isAuthorVerified: true,
      mediaId: 'media_burkinanews',
      mediaName: 'Burkina News',
      coverImage: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1000&auto=format&fit=crop&q=80',
      images: ['https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1000&auto=format&fit=crop&q=80'],
      categoryId: 'cat_afrique',
      categoryName: 'Afrique',
      tags: ['AES', 'Afrique', 'Numérique', 'Coopération', 'Économie'],
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
      userName: 'Aminata Traoré',
      userAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
      userRole: 'reader',
      isUserVerified: false,
      content: 'Excellente initiative pour la transformation du coton sur place ! C’est exactement ce qu’il nous faut pour valoriser nos ouvriers et réduire les importations.',
      likesCount: 24,
      createdAt: '2026-03-05T09:12:00Z',
    },
    {
      id: 'com_2',
      articleId: 'art_1',
      userId: 'usr_salif',
      userName: 'Salif Ouédraogo',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      userRole: 'journalist',
      isUserVerified: true,
      parentId: 'com_1',
      content: 'Tout à fait d’accord Aminata. D’ailleurs nos enquêtes de terrain indiquent que la première usine ouvrira dès le deuxième semestre.',
      likesCount: 18,
      createdAt: '2026-03-05T09:45:00Z',
    },
    {
      id: 'com_3',
      articleId: 'art_3',
      userId: 'usr_aminata',
      userName: 'Aminata Traoré',
      userAvatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
      userRole: 'reader',
      isUserVerified: false,
      content: 'La jeunesse burkinabè innove sans relâche ! Bravo aux ingénieurs de l’Université Joseph Ki-Zerbo.',
      likesCount: 12,
      createdAt: '2026-03-03T18:20:00Z',
    },
  ];

  const follows: DBFollow[] = [
    {
      id: 'flw_1',
      followerId: 'usr_aminata',
      targetId: 'usr_burkinanews',
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
      title: 'Nouvel article de Burkina News',
      message: 'Média Burkina News a publié : Transition et souveraineté : Les nouveaux chantiers économiques...',
      link: '/article/art_1',
      read: false,
      createdAt: '2026-03-05T08:31:00Z',
    },
    {
      id: 'notif_2',
      userId: 'usr_aminata',
      type: 'comment',
      title: 'Réponse à votre commentaire',
      message: 'Salif Ouédraogo a répondu à votre commentaire sur l’article économique.',
      link: '/article/art_1',
      read: true,
      createdAt: '2026-03-05T09:46:00Z',
    },
  ];

  const verificationRequests: VerificationRequest[] = [
    {
      id: 'req_1',
      userId: 'usr_salif',
      userName: 'Salif Ouédraogo',
      userEmail: 'salif.ouedraogo@fasoinfo.bf',
      mediaName: 'L’Observateur du Sahel',
      pressCardNumber: 'BF-PRESS-2025-8842',
      motivation: 'Journaliste titulaire d’une carte de presse nationale depuis 2018, spécialisé en reportage économique.',
      status: 'approved',
      adminNotes: 'Carte de presse validée par le Conseil Supérieur de la Communication (CSC).',
      createdAt: '2026-01-12T10:00:00Z',
      reviewedAt: '2026-01-13T14:30:00Z',
    },
  ];

  const reports: Report[] = [
    {
      id: 'rep_1',
      reporterId: 'usr_aminata',
      reporterName: 'Aminata Traoré',
      targetType: 'comment',
      targetId: 'com_3',
      targetTitle: 'Commentaire sur Agritech au Sahel',
      reason: 'Demande de vérification de source',
      details: 'Demande de confirmation des sources sur les capteurs solaires du Sourou.',
      status: 'pending',
      createdAt: '2026-03-04T12:00:00Z',
    },
  ];

  const views: DBView[] = [];

  const mediaHouses: MediaHouse[] = [
    {
      id: 'media_burkinanews',
      name: 'Burkina News',
      slug: 'burkina-news',
      logo: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
      description: 'Première agence de presse indépendante d’actualité continue et d’analyses politiques au Burkina Faso.',
      ownerId: 'usr_burkinanews',
      ownerName: 'Média Burkina News',
      phone: '+226 25 30 00 01',
      email: 'contact@burkinanews.bf',
      website: 'https://burkinanews.bf',
      address: 'Avenue Kwamé N’Krumah, Ouagadougou',
      status: 'active',
      isVerified: true,
      journalistsCount: 12,
      articlesCount: 4,
      createdAt: '2026-01-05T09:30:00Z',
    },
    {
      id: 'media_obs_sahel',
      name: 'L’Observateur du Sahel',
      slug: 'lobservateur-du-sahel',
      logo: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=1000&auto=format&fit=crop&q=80',
      description: 'Quotidien national de référence fondé sur l’investigation, l’économie sahélienne et la culture.',
      ownerId: 'usr_salif',
      ownerName: 'Salif Ouédraogo',
      phone: '+226 25 31 15 20',
      email: 'redaction@obs-sahel.bf',
      website: 'https://lobservateurdusahel.bf',
      address: 'Boulevard Charles de Gaulle, Ouagadougou',
      status: 'active',
      isVerified: true,
      journalistsCount: 8,
      articlesCount: 2,
      createdAt: '2026-01-10T11:00:00Z',
    },
    {
      id: 'media_sidwaya',
      name: 'Sidwaya Quotidien',
      slug: 'sidwaya',
      logo: 'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=150&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1497440001374-f26997328c1b?w=1000&auto=format&fit=crop&q=80',
      description: 'Organe de presse publique d’information générale, de reportage institutionnel et de mémoire nationale.',
      ownerId: 'usr_admin',
      ownerName: 'Administrateur purge-info',
      phone: '+226 25 30 63 34',
      email: 'info@sidwaya.bf',
      website: 'https://sidwaya.bf',
      address: 'Secteur 1, Ouagadougou',
      status: 'active',
      isVerified: true,
      journalistsCount: 15,
      articlesCount: 5,
      createdAt: '2026-01-01T08:00:00Z',
    },
    {
      id: 'media_omega',
      name: 'Radio Oméga Médias',
      slug: 'radio-omega',
      logo: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=150&auto=format&fit=crop&q=80',
      coverImage: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=1000&auto=format&fit=crop&q=80',
      description: 'Réseau d’information en direct, radio FM et diffusion multimédia sur tout le territoire burkinabè.',
      ownerId: 'usr_burkinanews',
      ownerName: 'Média Burkina News',
      phone: '+226 25 37 00 00',
      email: 'redaction@omegabf.info',
      website: 'https://omegabf.info',
      address: 'Ouaga 2000, Ouagadougou',
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
      adminName: 'Administrateur purge-info',
      action: 'verify_journalist',
      targetType: 'journalist',
      targetId: 'usr_salif',
      targetTitle: 'Salif Ouédraogo',
      details: 'Accréditation validée après authentification de la carte de presse CSC n°BF-PRESS-2025-8842',
      timestamp: '2026-01-13T14:30:00Z',
    },
    {
      id: 'log_2',
      adminId: 'usr_admin',
      adminName: 'Administrateur purge-info',
      action: 'verify_media',
      targetType: 'media',
      targetId: 'media_burkinanews',
      targetTitle: 'Burkina News',
      details: 'Attribution du badge média officiel et agrément éditorial',
      timestamp: '2026-01-05T10:00:00Z',
    },
    {
      id: 'log_3',
      adminId: 'usr_admin',
      adminName: 'Administrateur purge-info',
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
