import React, { useState, useEffect } from 'react';
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
import { User } from '../types';
import { api } from '../services/api';
import { ImageSelectModal } from './ImageSelectModal';
import { uploadPickedImageToCloudinary } from '../services/imagePicker';

interface EditProfileModalProps {
  visible: boolean;
  currentUser: User;
  onUserUpdated: (updatedUser: User) => void;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  currentUser,
  onUserUpdated,
  onClose,
}) => {
  const [name, setName] = useState<string>(currentUser.name || '');
  const [username, setUsername] = useState<string>(currentUser.username || '');
  const [bio, setBio] = useState<string>(currentUser.bio || '');
  const [phone, setPhone] = useState<string>(currentUser.phone || '');
  const [mediaName, setMediaName] = useState<string>(currentUser.mediaName || '');
  const [avatar, setAvatar] = useState<string>(currentUser.avatar || '');

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState<boolean>(false);

  useEffect(() => {
    if (visible && currentUser) {
      setName(currentUser.name || '');
      setUsername(currentUser.username || '');
      setBio(currentUser.bio || '');
      setPhone(currentUser.phone || '');
      setMediaName(currentUser.mediaName || '');
      setAvatar(currentUser.avatar || '');
      setErrorMessage(null);
    }
  }, [visible, currentUser]);

  const handleSelectAvatar = async (result: { url?: string; pickedResult?: any }) => {
    try {
      let finalAvatarUrl = result.url;
      if (result.pickedResult) {
        setSaving(true);
        const uploaded = await uploadPickedImageToCloudinary(result.pickedResult, 'avatar');
        finalAvatarUrl = uploaded.url;
      }

      if (finalAvatarUrl) {
        setAvatar(finalAvatarUrl);
      }
    } catch (err: any) {
      Alert.alert('Photo de profil', err.message || "Erreur lors de la mise à jour de l'image.");
    } finally {
      setSaving(false);
      setShowImagePicker(false);
    }
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMessage('Le nom doit comporter au moins 2 caractères.');
      return;
    }

    setSaving(true);
    setErrorMessage(null);

    try {
      const payload: Partial<User> = {
        name: cleanName,
        username: username.trim() ? username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '') : undefined,
        bio: bio.trim(),
        phone: phone.trim() || undefined,
        mediaName: mediaName.trim() || undefined,
        avatar: avatar.trim() || undefined,
      };

      const res = await api.updateProfile(payload);
      onUserUpdated(res.user);
      Alert.alert('Profil mis à jour', 'Vos informations ont été enregistrées avec succès.');
      onClose();
    } catch (err: any) {
      console.error('[EditProfileModal] Erreur sauvegarde:', err);
      setErrorMessage(
        err.message || 'Impossible d’enregistrer le profil. Veuillez vérifier vos données.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} activeOpacity={0.7}>
            <Text style={styles.cancelText}>ANNULER</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>MODIFIER MON PROFIL</Text>
          <TouchableOpacity
            onPress={handleSave}
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#020512" />
            ) : (
              <Text style={styles.saveBtnText}>ENREGISTRER</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{name ? name.charAt(0).toUpperCase() : 'U'}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.avatarBadgeBtn}
                onPress={() => setShowImagePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.avatarBadgeText}>📷</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.changePhotoBtn}
              onPress={() => setShowImagePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.changePhotoBtnText}>Changer la photo de profil</Text>
            </TouchableOpacity>
            <Text style={styles.photoTip}>
              Galerie, appareil photo, URL web ou modèles certifiés
            </Text>
          </View>

          {/* Form Fields */}
          <View style={styles.cardSection}>
            <Text style={styles.sectionLabel}>COORDONNÉES PERSONNELLES</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Nom complet ou Pseudonyme officiel *</Text>
              <TextInput
                style={styles.input}
                placeholder="Votre nom d'auteur ou de citoyen"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Identifiant unique (@pseudo)</Text>
              <TextInput
                style={styles.input}
                placeholder="ex: madara_uchiha"
                placeholderTextColor="#64748b"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Adresse Email de compte (lecture seule)</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={currentUser.email}
                editable={false}
              />
              <Text style={styles.fieldHint}>
                L'email est lié à votre authentification sécurisée.
              </Text>
            </View>
          </View>

          <View style={styles.cardSection}>
            <Text style={styles.sectionLabel}>BIOGRAPHIE & LIGNE ÉDITORIALE</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Biographie / Présentation publique</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Présentez votre parcours, vos centres d'intérêt journalistiques ou vos domaines d'enquête..."
                placeholderTextColor="#64748b"
                value={bio}
                onChangeText={setBio}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Maison de Presse ou Organe Média</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: PURGE Rédaction, Journaliste Indépendant, Le Sphinx..."
                placeholderTextColor="#64748b"
                value={mediaName}
                onChangeText={setMediaName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Numéro de Téléphone / WhatsApp</Text>
              <TextInput
                style={styles.input}
                placeholder="+226 70 00 00 00"
                placeholderTextColor="#64748b"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.bigSaveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#020512" size="small" />
            ) : (
              <Text style={styles.bigSaveBtnText}>ENREGISTRER LES MODIFICATIONS</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Modal d'image */}
        {showImagePicker && (
          <ImageSelectModal
            visible={showImagePicker}
            title="Photo de profil"
            mode="avatar"
            currentImageUrl={avatar}
            onSelectImage={handleSelectAvatar}
            onClose={() => setShowImagePicker(false)}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020512',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#060a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.2)',
  },
  headerBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  cancelText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  saveBtn: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    color: '#020512',
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  errorBox: {
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    borderRadius: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 18,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: '#06b6d4',
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderWidth: 2,
    borderColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#06b6d4',
    fontSize: 36,
    fontWeight: 'bold',
  },
  avatarBadgeBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#06b6d4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#020512',
  },
  avatarBadgeText: {
    fontSize: 14,
  },
  changePhotoBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  changePhotoBtnText: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: 'bold',
  },
  photoTip: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 4,
  },
  cardSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 8,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  inputDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.05)',
    color: '#64748b',
  },
  fieldHint: {
    color: '#64748b',
    fontSize: 10,
  },
  textArea: {
    minHeight: 80,
  },
  bigSaveBtn: {
    backgroundColor: '#06b6d4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  bigSaveBtnText: {
    color: '#020512',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
