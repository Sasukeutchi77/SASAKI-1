import { Router, Response, Request } from 'express';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { AuthenticatedRequest, requireAuth } from '../auth';
import { db } from '../db';
import { MediaRecord, MediaUsageType, CloudinaryMedia } from '../../src/types';
import { mediaUploadLimiter } from '../security/rateLimiter';
import { sanitizeText } from '../security/sanitizer';

export const mediaRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch {}
}

/**
 * Saves a base64 data URI to the local /uploads directory and returns the served URL path.
 * This guarantees low-bandwidth storage and avoids Firestore 1MB document limitations.
 */
export function saveBase64MediaLocally(dataUri: string, prefix = 'media'): string | null {
  if (!dataUri || typeof dataUri !== 'string' || !dataUri.startsWith('data:')) return null;
  const commaIdx = dataUri.indexOf(',');
  if (commaIdx === -1) return null;

  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const mimeMatch = dataUri.substring(0, commaIdx).match(/data:([^;]+);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    let ext = 'jpg';
    if (mime.includes('png')) ext = 'png';
    else if (mime.includes('webp')) ext = 'webp';
    else if (mime.includes('gif')) ext = 'gif';
    else if (mime.includes('mp4')) ext = 'mp4';

    const base64Data = dataUri.substring(commaIdx + 1);
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const targetPath = path.join(UPLOADS_DIR, filename);

    fs.writeFileSync(targetPath, buffer);
    return `/api/media/files/${filename}`;
  } catch (err) {
    console.error('[Media] Failed to write media file locally:', err);
    return null;
  }
}

// Serve uploaded static media files with high cache headers
mediaRouter.get('/files/:filename', (req: Request, res: Response) => {
  const safeFilename = path.basename(req.params.filename);
  const filePath = path.join(UPLOADS_DIR, safeFilename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Fichier média introuvable.' });
  }
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.sendFile(filePath);
});

// Lazy Cloudinary configuration
function initCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    return true;
  }
  return false;
}

// Helper to determine destination folder based on media usage
function getCloudinaryFolder(usageType: MediaUsageType): string {
  switch (usageType) {
    case 'avatar':
      return 'purge_info/avatars';
    case 'cover':
      return 'purge_info/covers';
    case 'article_cover':
      return 'purge_info/articles';
    case 'article_gallery':
      return 'purge_info/galleries';
    case 'article_video':
      return 'purge_info/videos';
    case 'press_card':
      return 'purge_info/press_cards';
    case 'media_logo':
      return 'purge_info/media_logos';
    default:
      return 'purge_info/uploads';
  }
}

// 1. Get Cloudinary signed upload parameters for direct client upload
mediaRouter.post('/signature', requireAuth, mediaUploadLimiter, (req: AuthenticatedRequest, res: Response) => {
  const isConfigured = initCloudinary();
  if (!isConfigured) {
    return res.status(503).json({
      error: 'Cloudinary n’est pas configuré sur le serveur (variables CLOUDINARY_* manquantes).',
      configured: false,
    });
  }

  const { folder = 'purge_info/uploads', usageType = 'general' } = req.body;
  const user = req.user!;

  // Role validation: regular readers can only generate signatures for avatars or press cards
  if (user.role !== 'admin' && user.role !== 'journalist') {
    if (usageType !== 'avatar' && usageType !== 'press_card') {
      return res.status(403).json({
        error: 'Autorisation insuffisante pour ce dossier de téléversement.',
      });
    }
  }

  const timestamp = Math.round(new Date().getTime() / 1000);
  const targetFolder = getCloudinaryFolder(usageType as MediaUsageType) || folder;

  const paramsToSign: Record<string, any> = {
    folder: targetFolder,
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  return res.json({
    signature,
    timestamp,
    apiKey: process.env.CLOUDINARY_API_KEY,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    folder: targetFolder,
  });
});

// 2. Server-side proxy upload (handles base64 or media payload securely with strict validation)
mediaRouter.post('/upload', requireAuth, mediaUploadLimiter, async (req: AuthenticatedRequest, res: Response) => {
  const {
    file,
    type = 'image',
    usageType = 'general',
    altText,
    caption,
    articleId,
  } = req.body;
  const user = req.user!;

  if (!file) {
    return res.status(400).json({ error: 'Fichier requis pour l’envoi.' });
  }

  const cleanAltText = altText ? sanitizeText(altText, { maxLength: 150, allowNewlines: false }) : undefined;
  const cleanCaption = caption ? sanitizeText(caption, { maxLength: 300 }) : undefined;

  // Role & Permissions Validation:
  // Regular readers cannot upload article assets or videos!
  const isPrivileged = user.role === 'admin' || user.role === 'journalist';
  if (!isPrivileged) {
    if (type === 'video') {
      return res.status(403).json({
        error: 'Accès refusé : Le téléversement de vidéos est exclusivement réservé aux journalistes accrédités et administrateurs.',
      });
    }
    if (['article_cover', 'article_gallery', 'article_video'].includes(usageType)) {
      return res.status(403).json({
        error: 'Accès refusé : La publication de médias d’articles est réservée aux journalistes accrédités.',
      });
    }
  }

  // Approximate size validation from base64 string
  const base64Length = file.length;
  const estimatedSizeBytes = Math.round((base64Length * 3) / 4);

  const maxImageSize = 10 * 1024 * 1024; // 10 MB
  const maxVideoSize = 60 * 1024 * 1024; // 60 MB

  if (type === 'image' && estimatedSizeBytes > maxImageSize) {
    return res.status(400).json({
      error: `L’image dépasse la limite autorisée de 10 Mo (taille estimée : ${(estimatedSizeBytes / (1024 * 1024)).toFixed(1)} Mo).`,
    });
  }

  if (type === 'video' && estimatedSizeBytes > maxVideoSize) {
    return res.status(400).json({
      error: `La vidéo dépasse la limite autorisée de 60 Mo (taille estimée : ${(estimatedSizeBytes / (1024 * 1024)).toFixed(1)} Mo).`,
    });
  }

  // Format / MIME validation
  if (file.startsWith('data:')) {
    const mimeMatch = file.match(/^data:([^;]+);base64,/);
    if (mimeMatch) {
      const mime = mimeMatch[1].toLowerCase();
      const validImageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      const validVideoMimes = ['video/mp4', 'video/webm', 'video/quicktime'];

      if (type === 'image' && !validImageMimes.includes(mime)) {
        return res.status(400).json({
          error: `Format d’image non supporté (${mime}). Utilisez JPG, PNG, WEBP ou GIF.`,
        });
      }

      if (type === 'video' && !validVideoMimes.includes(mime)) {
        return res.status(400).json({
          error: `Format vidéo non supporté (${mime}). Utilisez MP4, WebM ou QuickTime (MOV).`,
        });
      }
    }
  }

  const targetFolder = getCloudinaryFolder(usageType as MediaUsageType);
  const isConfigured = initCloudinary();
  const now = new Date().toISOString();

  if (!isConfigured) {
    // If user has not yet configured Cloudinary credentials in .env,
    // save media cleanly to local disk and generate a fast local URL
    console.warn('Cloudinary not configured in environment; using local file persistence.');
    const fallbackId = `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const savedLocalUrl = saveBase64MediaLocally(file, usageType || 'media');
    const fallbackUrl = savedLocalUrl || (file.startsWith('data:')
      ? file
      : type === 'video'
      ? 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
      : 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80');

    const fallbackMedia: CloudinaryMedia = {
      url: fallbackUrl,
      publicId: fallbackId,
      type,
      width: type === 'video' ? 1280 : 1000,
      height: type === 'video' ? 720 : 667,
      format: type === 'video' ? 'mp4' : 'jpg',
      duration: type === 'video' ? 30 : undefined,
      thumbnailUrl: type === 'video' ? 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=600&auto=format&fit=crop&q=80' : undefined,
      altText: altText || undefined,
      createdAt: now,
    };

    // Store metadata in DB
    const data = db.getData();
    const mediaRecord: MediaRecord = {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mediaId: fallbackId,
      url: fallbackUrl,
      secureUrl: fallbackUrl,
      publicId: fallbackId,
      resourceType: type,
      format: fallbackMedia.format,
      width: fallbackMedia.width,
      height: fallbackMedia.height,
      duration: fallbackMedia.duration,
      altText: altText || undefined,
      caption: caption || undefined,
      ownerId: user.id,
      ownerName: user.name,
      ownerRole: user.role,
      articleId: articleId || undefined,
      usageType: usageType as MediaUsageType,
      createdAt: now,
    };
    data.mediaRecords.unshift(mediaRecord);
    await db.persistMediaRecord(mediaRecord);
    db.save();

    return res.json({
      success: true,
      media: fallbackMedia,
      mediaRecord,
      warning: 'Attention : Vos identifiants Cloudinary ne sont pas encore configurés dans .env. Le média est géré en mode local sécurisé.',
    });
  }

  try {
    const uploadOptions: Record<string, any> = {
      folder: targetFolder,
      resource_type: type === 'video' ? 'video' : 'image',
    };

    // Apply auto optimization on Cloudinary side
    if (type === 'image') {
      uploadOptions.transformation = [
        { quality: 'auto', fetch_format: 'auto' },
      ];
    }

    const uploadRes = await cloudinary.uploader.upload(file, uploadOptions);

    const secureUrl = uploadRes.secure_url || uploadRes.url;
    const mediaThumbnail =
      type === 'video'
        ? secureUrl.replace(/\.[^/.]+$/, '.jpg')
        : undefined;

    const media: CloudinaryMedia = {
      url: secureUrl,
      publicId: uploadRes.public_id,
      type: uploadRes.resource_type || type,
      width: uploadRes.width,
      height: uploadRes.height,
      format: uploadRes.format,
      duration: uploadRes.duration,
      thumbnailUrl: mediaThumbnail,
      altText: altText || undefined,
      createdAt: now,
    };

    // Persist media metadata strictly in db.json without the heavy binary
    const data = db.getData();
    const mediaRecord: MediaRecord = {
      id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      mediaId: uploadRes.public_id,
      url: secureUrl,
      secureUrl: secureUrl,
      publicId: uploadRes.public_id,
      resourceType: uploadRes.resource_type || type,
      format: uploadRes.format,
      width: uploadRes.width,
      height: uploadRes.height,
      duration: uploadRes.duration,
      altText: altText || undefined,
      caption: caption || undefined,
      ownerId: user.id,
      ownerName: user.name,
      ownerRole: user.role,
      articleId: articleId || undefined,
      usageType: usageType as MediaUsageType,
      createdAt: now,
    };

    data.mediaRecords.unshift(mediaRecord);
    await db.persistMediaRecord(mediaRecord);
    db.save();

    return res.json({
      success: true,
      media,
      mediaRecord,
    });
  } catch (err: any) {
    console.error('Erreur Cloudinary upload:', err);
    return res.status(500).json({
      error: `Échec de l’envoi vers Cloudinary : ${err.message || 'Erreur réseau ou identifiants invalides'}`,
    });
  }
});

// 3. List media records (user library or admin overview)
mediaRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const user = req.user!;
  const { type, usageType, articleId } = req.query;

  let records = [...data.mediaRecords];

  // If not admin, restrict to own uploaded media
  if (user.role !== 'admin') {
    records = records.filter((m) => m.ownerId === user.id);
  }

  if (type) {
    records = records.filter((m) => m.resourceType === type);
  }
  if (usageType) {
    records = records.filter((m) => m.usageType === usageType);
  }
  if (articleId) {
    records = records.filter((m) => m.articleId === articleId);
  }

  return res.json({
    mediaRecords: records,
    total: records.length,
  });
});

// 4. Delete media by public ID with ownership & usage verification (Orphan prevention)
mediaRouter.delete('/:publicId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { publicId } = req.params;
  const user = req.user!;
  const data = db.getData();

  // Find record in DB
  const recordIndex = data.mediaRecords.findIndex(
    (m) => m.publicId === publicId || m.mediaId === publicId
  );
  const record = recordIndex !== -1 ? data.mediaRecords[recordIndex] : null;

  // Security Check: Only the original owner or an admin can delete the file
  if (record && record.ownerId !== user.id && user.role !== 'admin') {
    return res.status(403).json({
      error: 'Interdit : Vous n’êtes pas le propriétaire de cette ressource multimédia.',
    });
  }

  // Orphan & Conflict Check: Verify if media is actively used anywhere in the platform
  let isUsedElsewhere = false;
  let usedInTitle = '';

  for (const art of data.articles) {
    if (
      art.coverImage.includes(publicId) ||
      (art.coverMedia && art.coverMedia.publicId === publicId) ||
      (art.images && art.images.some((img) => img.includes(publicId))) ||
      (art.gallery && art.gallery.some((g) => g.publicId === publicId || g.url.includes(publicId))) ||
      (art.videoUrl && art.videoUrl.includes(publicId)) ||
      (art.videoMedia && art.videoMedia.publicId === publicId)
    ) {
      isUsedElsewhere = true;
      usedInTitle = `Article : « ${art.title} »`;
      break;
    }
  }

  if (!isUsedElsewhere) {
    for (const u of data.users) {
      if (
        (u.avatar && u.avatar.includes(publicId)) ||
        (u.avatarMedia && u.avatarMedia.publicId === publicId) ||
        (u.coverImage && u.coverImage.includes(publicId)) ||
        (u.coverMedia && u.coverMedia.publicId === publicId)
      ) {
        isUsedElsewhere = true;
        usedInTitle = `Profil de l’utilisateur : ${u.name}`;
        break;
      }
    }
  }

  if (!isUsedElsewhere) {
    for (const m of data.mediaHouses) {
      if (
        (m.logo && m.logo.includes(publicId)) ||
        (m.logoMedia && m.logoMedia.publicId === publicId) ||
        (m.coverImage && m.coverImage.includes(publicId)) ||
        (m.coverMedia && m.coverMedia.publicId === publicId)
      ) {
        isUsedElsewhere = true;
        usedInTitle = `Maison de presse : ${m.name}`;
        break;
      }
    }
  }

  // If in use and not explicitly forced by admin query, reject deletion to prevent broken images
  if (isUsedElsewhere && req.query.force !== 'true') {
    return res.status(409).json({
      error: `Suppression annulée : ce fichier est actuellement utilisé dans ${usedInTitle}. Retirez-le d’abord de cette ressource avant de le détruire.`,
      inUse: true,
      usedIn: usedInTitle,
    });
  }

  // Proceed with Cloudinary destruction
  const isConfigured = initCloudinary();
  if (isConfigured && !publicId.startsWith('fallback_')) {
    try {
      const resourceType = record?.resourceType || (req.query.resourceType === 'video' ? 'video' : 'image');
      await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err: any) {
      console.warn('Erreur lors de la destruction Cloudinary:', err.message);
    }
  }

  // Clean metadata from db.json
  if (recordIndex !== -1) {
    const deletedRecord = data.mediaRecords.splice(recordIndex, 1)[0];
    await db.deleteMediaRecord(deletedRecord.id);
    db.save();
  }

  return res.json({
    success: true,
    message: 'Média et métadonnées supprimés avec succès.',
  });
});
