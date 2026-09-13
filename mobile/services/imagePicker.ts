import { api } from './api';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  ImagePicker = null;
}

export interface PickImageResult {
  uri: string;
  base64?: string;
  width?: number;
  height?: number;
  cancelled: boolean;
}

export const AVATAR_PRESETS = [
  { id: 'av1', label: 'Journaliste Investigation', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80' },
  { id: 'av2', label: 'Rédacteur Politique', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80' },
  { id: 'av3', label: 'Correspondante Afrique', url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80' },
  { id: 'av4', label: 'Analyste Économie', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80' },
  { id: 'av5', label: 'Chroniqueuse Société', url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&auto=format&fit=crop&q=80' },
  { id: 'av6', label: 'Grand Reporter', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&auto=format&fit=crop&q=80' },
];

export const ARTICLE_COVER_PRESETS = [
  { id: 'cov1', label: 'Investigation & Dossiers', url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&auto=format&fit=crop&q=80' },
  { id: 'cov2', label: 'Politique & Gouvernance', url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&auto=format&fit=crop&q=80' },
  { id: 'cov3', label: 'Économie & Marchés', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1200&auto=format&fit=crop&q=80' },
  { id: 'cov4', label: 'Sécurité & Géopolitique', url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1200&auto=format&fit=crop&q=80' },
  { id: 'cov5', label: 'Société & Droits Citoyens', url: 'https://images.unsplash.com/photo-1494178270175-e96de2971df9?w=1200&auto=format&fit=crop&q=80' },
  { id: 'cov6', label: 'Technologie & Numérique', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80' },
];

export async function requestMediaPermissions(): Promise<boolean> {
  if (!ImagePicker) return true;
  try {
    if (typeof ImagePicker.requestMediaLibraryPermissionsAsync === 'function') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return status === 'granted';
    }
    return true;
  } catch (err) {
    console.warn('[ImagePicker] Erreur permission média:', err);
    return true;
  }
}

export async function requestCameraPermissions(): Promise<boolean> {
  if (!ImagePicker) return true;
  try {
    if (typeof ImagePicker.requestCameraPermissionsAsync === 'function') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      return status === 'granted';
    }
    return true;
  } catch (err) {
    console.warn('[ImagePicker] Erreur permission caméra:', err);
    return true;
  }
}

export async function pickImageFromGallery(aspect: [number, number] = [16, 9]): Promise<PickImageResult | null> {
  if (!ImagePicker || typeof ImagePicker.launchImageLibraryAsync !== 'function') {
    const err = new Error("Le module natif de sélection d'images n'est pas disponible sur cet appareil. Vous pouvez saisir une URL d'image directe ou choisir parmi les modèles proposés.");
    (err as any).isNativeModuleError = true;
    throw err;
  }

  const hasPermission = await requestMediaPermissions();
  if (!hasPermission) {
    throw new Error("L'accès à la galerie photo a été refusé dans les paramètres de votre appareil.");
  }

  // Attempt 1: with editing / crop
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
      allowsEditing: true,
      aspect,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : undefined,
      width: asset.width,
      height: asset.height,
      cancelled: false,
    };
  } catch (firstErr: any) {
    console.warn('[ImagePicker] Échec avec allowsEditing=true, essai sans recadrage...', firstErr?.message);

    // Attempt 2: fallback without crop (allowsEditing: false) to bypass AppDirectories / cache module requirements
    try {
      const fallbackResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
        allowsEditing: false,
        quality: 0.8,
        base64: true,
      });

      if (fallbackResult.canceled || !fallbackResult.assets || fallbackResult.assets.length === 0) {
        return null;
      }

      const asset = fallbackResult.assets[0];
      return {
        uri: asset.uri,
        base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : undefined,
        width: asset.width,
        height: asset.height,
        cancelled: false,
      };
    } catch (secondErr: any) {
      console.error('[ImagePicker] Erreur sélection photo finale:', secondErr);
      const customErr = new Error(
        "Impossible d'accéder directement à la galerie de cet appareil (module natif non lié). Vous pouvez coller le lien d'une image ou choisir un modèle recommandé."
      );
      (customErr as any).isNativeModuleError = true;
      (customErr as any).originalError = secondErr;
      throw customErr;
    }
  }
}

export async function takePhotoWithCamera(aspect: [number, number] = [1, 1]): Promise<PickImageResult | null> {
  if (!ImagePicker || typeof ImagePicker.launchCameraAsync !== 'function') {
    const err = new Error("L'appareil photo n'est pas accessible sur cet appareil.");
    (err as any).isNativeModuleError = true;
    throw err;
  }

  const hasPerm = await requestCameraPermissions();
  if (!hasPerm) {
    throw new Error("L'accès à la caméra a été refusé. Veuillez l'activer dans les paramètres Android.");
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      base64: asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : undefined,
      width: asset.width,
      height: asset.height,
      cancelled: false,
    };
  } catch (err: any) {
    console.error('[ImagePicker] Erreur prise photo caméra:', err);
    const customErr = new Error("Impossible d'accéder à la caméra sur cet appareil.");
    (customErr as any).isNativeModuleError = true;
    (customErr as any).originalError = err;
    throw customErr;
  }
}

export async function uploadPickedImageToCloudinary(
  image: PickImageResult,
  usageType: string = 'article_cover'
): Promise<{ url: string; publicId: string }> {
  const payload = image.base64 || image.uri;
  try {
    const res = await api.uploadMedia(payload, usageType, 'purge_mobile');
    if (res?.success && res.media?.url) {
      return res.media;
    }
  } catch (err) {
    console.warn('[ImagePicker] Upload serveur échoué, repli sur image locale/base64:', err);
  }

  // Fallback direct et infaillible (data URL ou uri native)
  const safeUrl = image.base64 || image.uri;
  return {
    url: safeUrl,
    publicId: `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
  };
}
