export type UserRole = 'user' | 'reader' | 'journalist' | 'admin';

export type AccountType = 'user' | 'journalist';

export type ArticleStatus = 'draft' | 'published' | 'hidden' | 'deleted';

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected';

export type MediaUsageType =
  | 'avatar'
  | 'cover'
  | 'article_cover'
  | 'article_gallery'
  | 'article_video'
  | 'press_card'
  | 'media_logo'
  | 'general';

export interface CloudinaryMedia {
  url: string;
  publicId: string;
  type: 'image' | 'video';
  width?: number;
  height?: number;
  format?: string;
  duration?: number;
  thumbnailUrl?: string;
  altText?: string;
  createdAt: string;
}

export interface ArticleMediaItem {
  id: string;
  url: string;
  publicId?: string;
  type: 'image' | 'video';
  altText?: string;
  caption?: string;
  width?: number;
  height?: number;
  format?: string;
  order?: number;
}

export interface MediaRecord {
  id: string;
  mediaId: string;
  url: string;
  secureUrl: string;
  publicId: string;
  resourceType: 'image' | 'video';
  format?: string;
  width?: number;
  height?: number;
  duration?: number;
  altText?: string;
  caption?: string;
  ownerId: string;
  ownerName?: string;
  ownerRole?: string;
  articleId?: string;
  usageType: MediaUsageType;
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
  status: 'active' | 'suspended';
  mediaName?: string;
  mediaId?: string;
  phone?: string;
  verificationStatus?: VerificationStatus;
  followersCount?: number;
  followingCount?: number;
  isFollowing?: boolean;
  articlesCount?: number;
  createdAt: string;
  lastLoginAt?: string;
}

export interface MediaHouse {
  id: string;
  name: string;
  slug: string;
  logo: string;
  logoMedia?: CloudinaryMedia;
  coverImage?: string;
  coverMedia?: CloudinaryMedia;
  description: string;
  ownerId: string;
  ownerName: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  licenseNumber?: string;
  status: 'active' | 'suspended';
  isVerified: boolean;
  journalistsCount?: number;
  articlesCount?: number;
  createdAt: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: 'user' | 'journalist' | 'media' | 'article' | 'comment' | 'category' | 'report' | 'system';
  targetId: string;
  targetTitle?: string;
  details?: string;
  timestamp: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon?: string;
  status?: 'active' | 'disabled';
  order?: number;
  articleCount?: number;
  createdAt?: string;
}

export interface FactCheckSource {
  title: string;
  url?: string;
  publisher: string;
}

export interface FactCheckReport {
  rating: 'verified' | 'mostly_true' | 'unverified' | 'investigating';
  score: number; // 0 - 100
  verifiedSourcesCount: number;
  sources: FactCheckSource[];
  summary: string;
  checkedBy?: string;
  lastCheckedAt?: string;
}

export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  articleId: string;
  question: string;
  options: PollOption[];
  totalVotes: number;
  userVotedOptionId?: string;
  expiresAt?: string;
}

export interface LiveUpdate {
  id: string;
  articleId?: string;
  title: string;
  content: string;
  authorName: string;
  authorRole: UserRole;
  isUrgent?: boolean;
  isOfficial?: boolean;
  timestamp: string;
  category?: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  authorRole: UserRole;
  isAuthorVerified?: boolean;
  mediaId?: string;
  mediaName?: string;
  mediaLogo?: string;
  coverImage: string;
  coverImageAlt?: string;
  coverMedia?: CloudinaryMedia;
  images: string[];
  gallery?: ArticleMediaItem[];
  videoUrl?: string;
  videoMedia?: CloudinaryMedia;
  videoThumbnail?: string;
  categoryId: string;
  categoryName: string;
  tags: string[];
  status: ArticleStatus;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt: string;
  isLiked?: boolean;
  isBookmarked?: boolean;
  factCheck?: FactCheckReport;
  poll?: Poll;
}

export interface Comment {
  id: string;
  articleId: string;
  articleTitle?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  userRole: UserRole;
  isUserVerified?: boolean;
  parentId?: string;
  content: string;
  likesCount: number;
  status?: 'active' | 'hidden';
  isLiked?: boolean;
  isEdited?: boolean;
  updatedAt?: string;
  createdAt: string;
  replies?: Comment[];
}

export interface Notification {
  id: string;
  userId: string;
  type: 'article' | 'like' | 'comment' | 'verification' | 'follow' | 'system';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  mediaName: string;
  pressCardNumber: string;
  motivation: string;
  documentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNotes?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'article' | 'comment' | 'user';
  targetId: string;
  targetTitle?: string;
  reason: string;
  details?: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'rejected' | 'dismissed';
  actionTaken?: string;
  adminNotes?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalJournalists: number;
  totalMedia: number;
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  hiddenArticles: number;
  totalViews: number;
  totalComments: number;
  totalLikes: number;
  pendingReports: number;
  pendingVerifications: number;
  articlesByCategory?: { name: string; count: number }[];
  recentActivity?: {
    id: string;
    type: 'article' | 'report' | 'user' | 'verification' | 'media';
    title: string;
    subtitle: string;
    timestamp: string;
  }[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
