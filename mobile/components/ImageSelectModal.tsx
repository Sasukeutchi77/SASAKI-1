import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  pickImageFromGallery,
  takePhotoWithCamera,
  AVATAR_PRESETS,
  ARTICLE_COVER_PRESETS,
  PickImageResult,
} from '../services/imagePicker';
import { AppIcon } from './AppIcon';

interface ImageSelectModalProps {
  visible: boolean;
  title: string;
  mode: 'avatar' | 'cover';
  currentImageUrl?: string;
  onSelectImage: (result: {
    url?: string;
    pickedResult?: PickImageResult;
  }) => Promise<void> | void;
  onClose: () => void;
}

export const ImageSelectModal: React.FC<ImageSelectModalProps> = ({
  visible,
  title,
  mode,
  currentImageUrl,
  onSelectImage,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'gallery' | 'url' | 'presets'>('gallery');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const presets = mode === 'avatar' ? AVATAR_PRESETS : ARTICLE_COVER_PRESETS;

  const handlePickFromGallery = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await pickImageFromGallery(mode === 'avatar' ? [1, 1] : [16, 9]);
      if (result) {
        await onSelectImage({ pickedResult: result });
        onClose();
      }
    } catch (err: any) {
      console.warn('[ImageSelectModal] Galerie:', err);
      setErrorMessage(
        err.message || "Impossible d'ouvrir la galerie. Vous pouvez saisir une URL ci-dessous ou choisir un modèle."
      );
      // Auto-switch to URL or presets so user is never blocked!
      setActiveTab('url');
    } finally {
      setLoading(false);
    }
  };

  const handleTakePhoto = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await takePhotoWithCamera(mode === 'avatar' ? [1, 1] : [16, 9]);
      if (result) {
        await onSelectImage({ pickedResult: result });
        onClose();
      }
    } catch (err: any) {
      console.warn('[ImageSelectModal] Camera:', err);
      setErrorMessage(err.message || "Impossible d'accéder à la caméra.");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyUrl = async () => {
    const trimmed = inputUrl.trim();
    if (!trimmed) {
      Alert.alert('Validation', "Veuillez saisir une URL d'image valide.");
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('data:image')) {
      Alert.alert('URL Invalide', "L'adresse de l'image doit commencer par https:// ou http://");
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await onSelectImage({ url: trimmed });
      setInputUrl('');
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors de l'application de l'image.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = async (presetUrl: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await onSelectImage({ url: presetUrl });
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Erreur lors du choix de l'image.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSub}>
                {mode === 'avatar' ? 'Format carré 1:1 recommandé' : 'Format panoramique 16:9'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <AppIcon name="close" size={16} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          {/* Error Message */}
          {errorMessage ? (
            <View style={styles.errorBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="alert-circle" size={14} color="#fca5a5" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            </View>
          ) : null}

          {/* Navigation Tabs */}
          <View style={styles.tabsRow}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'gallery' && styles.activeTab]}
              onPress={() => setActiveTab('gallery')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon
                  name="phone-portrait"
                  size={13}
                  color={activeTab === 'gallery' ? '#06b6d4' : '#94a3b8'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabText, activeTab === 'gallery' && styles.activeTabText]}>
                  Appareil
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'url' && styles.activeTab]}
              onPress={() => setActiveTab('url')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon
                  name="link"
                  size={13}
                  color={activeTab === 'url' ? '#06b6d4' : '#94a3b8'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabText, activeTab === 'url' && styles.activeTabText]}>
                  Lien Web
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'presets' && styles.activeTab]}
              onPress={() => setActiveTab('presets')}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon
                  name="sparkles"
                  size={13}
                  color={activeTab === 'presets' ? '#06b6d4' : '#94a3b8'}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabText, activeTab === 'presets' && styles.activeTabText]}>
                  Modèles
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <ScrollView contentContainerStyle={styles.contentScroll} keyboardShouldPersistTaps="handled">
            {activeTab === 'gallery' && (
              <View style={styles.tabBody}>
                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={handlePickFromGallery}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionIconCircle}>
                    <AppIcon name="images" size={22} color="#06b6d4" />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>Choisir depuis la galerie</Text>
                    <Text style={styles.actionSubtitle}>Sélectionnez une photo de votre téléphone</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionCard}
                  onPress={handleTakePhoto}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  <View style={styles.actionIconCircle}>
                    <AppIcon name="camera" size={22} color="#06b6d4" />
                  </View>
                  <View style={styles.actionInfo}>
                    <Text style={styles.actionTitle}>Prendre une photo</Text>
                    <Text style={styles.actionSubtitle}>Utiliser l'appareil photo du smartphone</Text>
                  </View>
                </TouchableOpacity>

                {currentImageUrl ? (
                  <View style={styles.currentPreviewBox}>
                    <Text style={styles.previewLabel}>Photo actuelle :</Text>
                    <Image source={{ uri: currentImageUrl }} style={mode === 'avatar' ? styles.avatarPreview : styles.coverPreview} />
                  </View>
                ) : null}
              </View>
            )}

            {activeTab === 'url' && (
              <View style={styles.tabBody}>
                <Text style={styles.inputInstruction}>
                  Collez le lien direct vers une photo (Unsplash, Cloudinary, Imgur, ou serveur média) :
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor="#64748b"
                  value={inputUrl}
                  onChangeText={setInputUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {inputUrl.trim().length > 10 ? (
                  <View style={styles.urlPreviewContainer}>
                    <Text style={styles.previewLabel}>Aperçu du lien :</Text>
                    <Image
                      source={{ uri: inputUrl.trim() }}
                      style={mode === 'avatar' ? styles.avatarPreview : styles.coverPreview}
                      resizeMode="cover"
                    />
                  </View>
                ) : null}

                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={handleApplyUrl}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <ActivityIndicator color="#020512" />
                  ) : (
                    <Text style={styles.applyBtnText}>APPLIQUER CETTE PHOTO</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'presets' && (
              <View style={styles.tabBody}>
                <Text style={styles.inputInstruction}>
                  {mode === 'avatar'
                    ? 'Sélectionnez un profil journalistique professionnel :'
                    : "Sélectionnez un visuel d'illustration pour votre dossier :"}
                </Text>

                <View style={mode === 'avatar' ? styles.presetsGridAvatar : styles.presetsGridCover}>
                  {presets.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.presetCard,
                        mode === 'avatar' ? styles.presetCardAvatar : styles.presetCardCover,
                      ]}
                      onPress={() => handleSelectPreset(item.url)}
                      disabled={loading}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: item.url }}
                        style={mode === 'avatar' ? styles.presetImgAvatar : styles.presetImgCover}
                      />
                      <Text style={styles.presetLabel} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {loading ? (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#06b6d4" />
              <Text style={styles.loadingText}>Traitement de l'image...</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 5, 18, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0a0f24',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    maxHeight: '85%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 10,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 16,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  activeTab: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderColor: '#06b6d4',
  },
  tabText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#06b6d4',
    fontWeight: 'bold',
  },
  contentScroll: {
    padding: 16,
  },
  tabBody: {
    gap: 14,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 14,
  },
  actionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  actionIcon: {
    fontSize: 20,
  },
  actionInfo: {
    flex: 1,
  },
  actionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  actionSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  inputInstruction: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 13,
  },
  applyBtn: {
    backgroundColor: '#06b6d4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  applyBtnText: {
    color: '#020512',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  currentPreviewBox: {
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  previewLabel: {
    color: '#94a3b8',
    fontSize: 11,
  },
  avatarPreview: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#06b6d4',
  },
  coverPreview: {
    width: '100%',
    height: 140,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  urlPreviewContainer: {
    alignItems: 'center',
    gap: 8,
    marginVertical: 6,
  },
  presetsGridAvatar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  presetCardAvatar: {
    width: '30%',
    alignItems: 'center',
  },
  presetImgAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  presetsGridCover: {
    gap: 12,
  },
  presetCardCover: {
    width: '100%',
  },
  presetImgCover: {
    width: '100%',
    height: 90,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  presetCard: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    alignItems: 'center',
  },
  presetLabel: {
    color: '#cbd5e1',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2, 5, 18, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#06b6d4',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
