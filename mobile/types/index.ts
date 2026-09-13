export type UserRole = 'user' | 'citoyen' | 'reader' | 'journalist' | 'journaliste' | 'admin';

export type AccountType = 'user' | 'citoyen' | 'journalist' | 'journaliste';

export const isJournalistRole = (role?: string | null): boolean => {
  return role === 'journalist' || role === 'journaliste';
};

export const isCitizenRole = (role?: string | null): boolean => {
  return role === 'user' || role === 'citoyen' || role === 'reader' || role === 'citizen';
};

export const isAdminRole = (role?: string | null): boolean => {
  return role === 'admin';
};

export type ArticleStatus = 'draft' | 'published' | 'hidden' | 'deleted';

export interface CloudinaryMedia {
  url: string;
  publicId: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  format?: string;
  thumbnailUrl?: string;
  altText?: string;
  createdAt: string;
}

export interface User {
  id: string;
  uid?: string;
  email: string;
  name: string;
  username?: string;
  role: UserRole;
  accountType?: AccountType;
  avatar?: string;
  avatarMedia?: CloudinaryMedia;
  coverImage?: string;
  coverMedia?: CloudinaryMedia;
  bio?: string;
  isVerified?: boolean;
  verificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  trustScore?: number;
  status: 'active' | 'suspended';
  mediaName?: string;
  mediaId?: string;
  phone?: string;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  articlesCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  order?: number;
  articleCount?: number;
}

export interface PollOption {
  id: string;
  text: string;
  votesCount: number;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string;
  expiresAt?: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  coverImage?: string;
  coverMedia?: CloudinaryMedia;
  images?: string[];
  categoryId: string;
  categoryName?: string;
  categorySlug?: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  authorIsVerified?: boolean;
  mediaName?: string;
  status: ArticleStatus;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  tags?: string[];
  readTime?: number;
  poll?: Poll;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  articleId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole?: string;
  authorIsVerified?: boolean;
  content: string;
  likesCount: number;
  isLiked?: boolean;
  parentId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MediaHouse {
  id: string;
  name: string;
  slug: string;
  logo: string;
  description: string;
  ownerId: string;
  ownerName: string;
  members?: string[];
  membersData?: User[];
  isVerified: boolean;
  articlesCount?: number;
  followersCount?: number;
  isFollowing?: boolean;
}

export interface TopMediaHouse {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  bio?: string;
  isVerified?: boolean;
  articlesCount: number;
  followersCount: number;
  score?: number;
  trustScore?: number;
  rating?: number;
  journalistsCount?: number;
  rank?: number;
  isFollowing?: boolean;
}

export interface TopJournalist {
  id: string;
  name: string;
  username?: string;
  avatar?: string;
  mediaName?: string;
  role?: string;
  isVerified?: boolean;
  articlesCount: number;
  followersCount: number;
  score?: number;
  trustScore?: number;
  rank?: number;
  isFollowing?: boolean;
}

export interface RankingsResponse {
  topHouses: TopMediaHouse[];
  topJournalists: TopJournalist[];
  totalHousesCount: number;
  totalJournalistsCount: number;
  lastUpdated: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  mediaName?: string;
  pressCardNumber?: string;
  motivation?: string;
  documentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export type NavigationTab = 'feed' | 'search' | 'rankings' | 'bookmarks' | 'profile';
