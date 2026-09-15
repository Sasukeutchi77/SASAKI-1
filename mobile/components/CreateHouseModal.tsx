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
import { api } from '../services/api';
import { MediaHouse, User } from '../types';
import { ImageSelectModal } from './ImageSelectModal';
import { uploadPickedImageToCloudinary } from '../services/imagePicker';

const SPECIALTY_OPTIONS = [
  'Investigation',
  'Politique',
  'Économie & Finance',
  'Société & Citoyenneté',
  'Sécurité & Défense',
  'Droits Humains',
  'Environnement & Climat',
  'Culture & Médias',
];

const DEFAULT_LOGOS = [
  'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=300&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&auto=format&fit=crop&q=80',
];

const DEFAULT_COVERS = [
  'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1000&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1000&auto=format&fit=crop&q=80',
];

interface CreateHouseModalProps {
  visible: boolean;
  currentUser: User | null;
  onSuccess: (newHouse: MediaHouse) => void;
  onClose: () => void;
}

export const CreateHouseModal: React.FC<CreateHouseModalProps> = ({
  visible,
  currentUser,
  onSuccess,
  onClose,
}) => {
  const [name, setName] = useState<string>('');
  const [motto, setMotto] = useState<string>("L'information vérifiée, sans concession.");
  const [description, setDescription] = useState<string>('');
  const [specialties, setSpecialties] = useState<string[]>(['Investigation', 'Société & Citoyenneté']);
  const [logo, setLogo] = useState<string>(DEFAULT_LOGOS[0]);
  const [coverImage, setCoverImage] = useState<string>(DEFAULT_COVERS[0]);
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>(currentUser?.email || '');
  const [address, setAddress] = useState<string>('Bureau Éditorial Central');
  const [website, setWebsite] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals de sélection d'images
  const [imagePickerType, setImagePickerType] = useState<'logo' | 'cover' | null>(null);

  const toggleSpecialty = (spec: string) => {
    if (specialties.includes(spec)) {
      if (specialties.length > 1) {
        setSpecialties(specialties.filter((s) => s !== spec));
      }
    } else {
      setSpecialties([...specialties, spec]);
    }
  };

  const handleSelectImageResult = async (result: { url?: string; pickedResult?: any }) => {
    try {
      let finalUrl = result.url;
      if (result.pickedResult) {
        setLoading(true);
        const uploaded = await uploadPickedImageToCloudinary(
          result.pickedResult,
          imagePickerType === 'logo' ? 'media_logo' : 'media_cover'
        );
        finalUrl = uploaded.url;
      }

      if (finalUrl) {
        if (imagePickerType === 'logo') {
          setLogo(finalUrl);
        } else if (imagePickerType === 'cover') {
          setCoverImage(finalUrl);
        }
      }
    } catch (err: any) {
      Alert.alert('Erreur image', err.message || "Impossible d'appliquer l'image.");
    } finally {
      setLoading(false);
      setImagePickerType(null);
    }
  };

  const handleSubmit = async () => {
    if ((currentUser?.mediaName || currentUser?.mediaId) && currentUser?.role !== 'admin') {
      setErrorMessage(
        `Chaque compte de journaliste ne peut créer qu'une seule maison de presse. Vous êtes déjà rattaché à « ${currentUser.mediaName || 'votre maison'} ».`
      );
      return;
    }

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 3) {
      setErrorMessage('Le nom de la maison de presse doit comporter au moins 3 caractères.');
      return;
    }

    const cleanDesc = description.trim();
    if (!cleanDesc || cleanDesc.length < 10) {
      setErrorMessage('Veuillez décrire la ligne éditoriale (au moins 10 caractères).');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await api.createMediaHouse({
        name: cleanName,
        motto: motto.trim() || undefined,
        description: cleanDesc,
        specialties,
        logo,
        coverImage,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        website: website.trim() || undefined,
      });

      Alert.alert(
        'Maison de Presse Fondée !',
        `Félicitations ! La maison « ${res.house.name} » a été créée avec succès. Vous en êtes le Chef de Rédaction.`
      );
      onSuccess(res.house);
      onClose();
    } catch (err: any) {
      console.error('[CreateHouseModal] Erreur création:', err);
      setErrorMessage(
        err.message || 'Impossible de créer la maison de presse. Vérifiez votre connexion.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backBtnText}>✕ ANNULER</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>FONDER UNE MAISON</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.publishBtn, loading && styles.publishBtnDisabled]}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#020512" size="small" />
            ) : (
              <Text style={styles.publishBtnText}>CRÉER</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          {/* Bannière de Présentation */}
          <View style={styles.bannerCard}>
            <Text style={styles.bannerBadge}>RÉSEAU ÉDITORIAL PURGE</Text>
            <Text style={styles.bannerTitle}>Création de Maison de Presse</Text>
            <Text style={styles.bannerSubtitle}>
              Fondez votre propre média d'investigation, fédérez jusqu'à 5 journalistes accrédités et
              publiez vos dépêches sous une même bannière.
            </Text>
          </View>

          {/* Règle Déontologique 1 Maison par Journaliste */}
          {(currentUser?.mediaName || currentUser?.mediaId) && currentUser?.role !== 'admin' ? (
            <View style={styles.limitCard}>
              <Text style={styles.limitIcon}>🛡️</Text>
              <Text style={styles.limitTitle}>LIMITE DÉONTOLOGIQUE ATTEINTE</Text>
              <Text style={styles.limitDesc}>
                Chaque compte de journaliste est strictement limité à une seule maison de presse. Vous êtes actuellement affilié à la maison :
              </Text>
              <View style={styles.limitActiveBox}>
                <Text style={styles.limitActiveName}>« {currentUser.mediaName || 'Maison Active'} »</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.limitCloseBtn} activeOpacity={0.8}>
                <Text style={styles.limitCloseBtnText}>RETOUR À MON PROFIL</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {(!currentUser?.mediaName && !currentUser?.mediaId) || currentUser?.role === 'admin' ? (
            <>
              {/* Section 1 : Identité de la maison */}
              <View style={styles.formSection}>
                <Text style={styles.sectionHeading}>1. IDENTITÉ & LIGNE ÉDITORIALE</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nom de la Maison de Presse *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: L'Investigateur du Faso, Le Sphinx..."
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Devise ou Slogan</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: L'information vérifiée, sans concession."
                placeholderTextColor="#64748b"
                value={motto}
                onChangeText={setMotto}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ligne Éditoriale & Mission *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décrivez les principes, la rigueur et les combats journalistiques portés par cette rédaction..."
                placeholderTextColor="#64748b"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Section 2 : Spécialités */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>2. DOMAINES D'INVESTIGATION</Text>
            <Text style={styles.sectionSub}>Sélectionnez les domaines couverts par votre média :</Text>

            <View style={styles.chipsContainer}>
              {SPECIALTY_OPTIONS.map((spec) => {
                const active = specialties.includes(spec);
                return (
                  <TouchableOpacity
                    key={spec}
                    style={[styles.chip, active && styles.activeChip]}
                    onPress={() => toggleSpecialty(spec)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, active && styles.activeChipText]}>
                      {active ? '✓ ' : '+ '}
                      {spec}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Section 3 : Visuels (Logo et Couverture) */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>3. VISUELS & CHARTE GRAPHIQUE</Text>

            {/* Logo */}
            <View style={styles.visualRow}>
              <View style={styles.logoPreviewWrapper}>
                <Image source={{ uri: logo }} style={styles.logoPreview} />
              </View>
              <View style={styles.visualInfo}>
                <Text style={styles.visualTitle}>Logo Officiel</Text>
                <Text style={styles.visualSub}>Emblème carré 1:1 pour les classements</Text>
                <TouchableOpacity
                  style={styles.changeImgBtn}
                  onPress={() => setImagePickerType('logo')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.changeImgBtnText}>📷 Choisir ou modifier le logo</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Couverture */}
            <View style={styles.coverWrapper}>
              <Text style={styles.visualTitle}>Photo de Couverture</Text>
              <Image source={{ uri: coverImage }} style={styles.coverPreview} />
              <TouchableOpacity
                style={styles.changeImgBtn}
                onPress={() => setImagePickerType('cover')}
                activeOpacity={0.8}
              >
                <Text style={styles.changeImgBtnText}>🖼️ Modifier l'image de couverture (16:9)</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Section 4 : Contact & Bureau */}
          <View style={styles.formSection}>
            <Text style={styles.sectionHeading}>4. SIÈGE & COORDONNÉES RÉDACTION</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adresse du Bureau Éditorial</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Secteur 15, Ouagadougou / Quartier Plateau, Abidjan"
                placeholderTextColor="#64748b"
                value={address}
                onChangeText={setAddress}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Téléphone ou WhatsApp de Contact</Text>
              <TextInput
                style={styles.input}
                placeholder="+226 70 00 00 00"
                placeholderTextColor="#64748b"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Officiel de Rédaction</Text>
              <TextInput
                style={styles.input}
                placeholder="redaction@mon-media.bf"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Site Web (optionnel)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://mon-media.bf"
                placeholderTextColor="#64748b"
                value={website}
                onChangeText={setWebsite}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Bouton Créer En bas */}
          <TouchableOpacity
            style={[styles.bigSubmitBtn, loading && styles.publishBtnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#020512" size="small" />
            ) : (
              <Text style={styles.bigSubmitBtnText}>🏛️ FONDER LA MAISON DE PRESSE</Text>
            )}
          </TouchableOpacity>
          </>
        ) : null}
        </ScrollView>

        {/* Modal Sélecteur d'image (Galerie + URL + Presets) */}
        {imagePickerType && (
          <ImageSelectModal
            visible={!!imagePickerType}
            title={
              imagePickerType === 'logo'
                ? 'Choisir le logo de la Maison'
                : 'Choisir la photo de couverture'
            }
            mode={imagePickerType === 'logo' ? 'avatar' : 'cover'}
            currentImageUrl={imagePickerType === 'logo' ? logo : coverImage}
            onSelectImage={handleSelectImageResult}
            onClose={() => setImagePickerType(null)}
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
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  backBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  publishBtn: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  publishBtnDisabled: {
    opacity: 0.5,
  },
  publishBtnText: {
    color: '#020512',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  bannerCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 16,
    padding: 16,
  },
  bannerBadge: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  bannerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
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
  formSection: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 12,
  },
  sectionHeading: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 8,
  },
  sectionSub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  inputGroup: {
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
  textArea: {
    minHeight: 85,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeChip: {
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    borderColor: '#06b6d4',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeChipText: {
    color: '#06b6d4',
    fontWeight: 'bold',
  },
  visualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  logoPreviewWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#06b6d4',
    overflow: 'hidden',
  },
  logoPreview: {
    width: '100%',
    height: '100%',
  },
  visualInfo: {
    flex: 1,
    gap: 4,
  },
  visualTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  visualSub: {
    color: '#94a3b8',
    fontSize: 11,
  },
  changeImgBtn: {
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  changeImgBtnText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '600',
  },
  coverWrapper: {
    gap: 8,
    marginTop: 8,
  },
  coverPreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  bigSubmitBtn: {
    backgroundColor: '#06b6d4',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  bigSubmitBtnText: {
    color: '#020512',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  limitCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  limitIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  limitTitle: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  limitDesc: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12,
  },
  limitActiveBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 16,
  },
  limitActiveName: {
    color: '#06b6d4',
    fontSize: 14,
    fontWeight: 'bold',
  },
  limitCloseBtn: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  limitCloseBtnText: {
    color: '#020512',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
});
