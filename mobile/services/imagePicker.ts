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
  { id: 'av1', label: 'Sasuke Uchiha (Shinobi)', url: '/assets/images/anime_sasuke_avatar.jpg' },
  { id: 'av2', label: 'Minato Namikaze (Éclair Jaune)', url: '/assets/images/anime_minato_avatar.jpg' },
  { id: 'av3', label: 'Itachi Uchiha (Maître des Ombres)', url: '/assets/images/anime_itachi_avatar.jpg' },
  { id: 'av4', label: 'Seigneur Purgeur (Cyberpunk)', url: '/assets/images/anime_lord_purgeur.jpg' },
  { id: 'av5', label: 'Purgeur d’Élite (Armure)', url: '/assets/images/anime_elite_purgeur_training.jpg' },
  { id: 'av6', label: 'Correspondant SASAKI', url: '/assets/images/purge_app_logo_1789222395660.jpg' },
];

export const ARTICLE_COVER_PRESETS = [
  { id: 'cov1', label: 'Décrets Officiels & Sanctuaires', url: '/assets/images/anime_decree_cover.jpg' },
  { id: 'cov2', label: 'Arène Centrale & Duels des Maîtres', url: '/assets/images/anime_arena_cover.jpg' },
  { id: 'cov3', label: 'Seigneurs Purgeurs (Haute Sécurité)', url: '/assets/images/anime_lord_purgeur.jpg' },
  { id: 'cov4', label: 'Le Sommet des Sept Clans (Pacte)', url: '/assets/images/anime_clans_sombre_pacte.jpg' },
  { id: 'cov5', label: 'Entraînement des Purgeurs d’Élite', url: '/assets/images/anime_elite_purgeur_training.jpg' },
  { id: 'cov6', label: 'Consultation & Sondage Citoyen', url: '/assets/images/manga_poll_banner.jpg' },
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
