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

export async function requestMediaPermissions(): Promise<boolean> {
  if (!ImagePicker) return true;
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[ImagePicker] Erreur permission média:', err);
    return true;
  }
}

export async function pickImageFromGallery(aspect: [number, number] = [16, 9]): Promise<PickImageResult | null> {
  if (!ImagePicker) {
    throw new Error("Le module d'image Expo n'est pas initialisé.");
  }

  const hasPermission = await requestMediaPermissions();
  if (!hasPermission) {
    throw new Error("L'accès à la galerie photo a été refusé.");
  }

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
  } catch (error) {
    console.error('[ImagePicker] Erreur sélection photo:', error);
    throw error;
  }
}

export async function uploadPickedImageToCloudinary(
  image: PickImageResult,
  usageType: string = 'article_cover'
): Promise<{ url: string; publicId: string }> {
  const payload = image.base64 || image.uri;
  const res = await api.uploadMedia(payload, usageType, 'purge_mobile');
  if (!res.success || !res.media?.url) {
    throw new Error("Échec de l'enregistrement de l'image sur les serveurs PURGE.");
  }
  return res.media;
}
