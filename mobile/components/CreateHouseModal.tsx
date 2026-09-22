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
import { AppIcon, AppIconName } from './AppIcon';
import { uploadPickedImageToCloudinary } from '../services/imagePicker';
import { HouseLivePreviewCard } from './house/HouseLivePreviewCard';
import { CreateHouseStepIndicator, CreateHouseStep } from './house/CreateHouseStepIndicator';

interface SpecialtyOption {
  name: string;
  icon: AppIconName;
}

const SPECIALTY_OPTIONS: SpecialtyOption[] = [
  { name: 'Investigation', icon: 'search' },
  { name: 'Politique', icon: 'building' },
  { name: 'Économie & Finance', icon: 'bar-chart' },
  { name: 'Société & Citoyenneté', icon: 'people' },
  { name: 'Sécurité & Défense', icon: 'shield' },
  { name: 'Droits Humains', icon: 'shield-checkmark' },
  { name: 'Environnement & Climat', icon: 'sparkles' },
  { name: 'Culture & Médias', icon: 'newspaper' },
];

const PRESET_LOGOS = [
  {
    title: 'Sentinelle',
    url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=300&auto=format&fit=crop&q=80',
  },
  {
    title: 'Vérité & Presse',
    url: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&auto=format&fit=crop&q=80',
  },
  {
    title: 'Chroniqueur',
    url: 'https://images.unsplash.com/photo-1495020689067-958852a7765e?w=300&auto=format&fit=crop&q=80',
  },
  {
    title: 'Enquêteur',
    url: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=300&auto=format&fit=crop&q=80',
  },
];

const PRESET_COVERS = [
  {
    title: 'Salle de Rédaction',
    url: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
  },
  {
    title: 'Archives & Enquêtes',
    url: 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1000&auto=format&fit=crop&q=80',
  },
  {
    title: 'Tribune Libre',
    url: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1000&auto=format&fit=crop&q=80',
  },
];

const SLOGAN_SUGGESTIONS = [
  "L'information vérifiée, sans concession.",
  "Révéler la vérité, éclairer le citoyen.",
  "Sentinelle indépendante et rigueur des faits.",
  "Le pouvoir aux faits, la voix au peuple.",
];

const MISSION_TEMPLATES = [
  {
    label: '🔍 Transparence Publique',
    text: 'Enquêtes rigoureuses et documentées sur la gestion publique, la lutte contre la corruption et la transparence institutionnelle.',
  },
  {
    label: '⚖️ Droits & Libertés',
    text: 'Défense inconditionnelle des droits humains, des libertés civiles et soutien aux lanceurs d’alerte citoyens.',
  },
  {
    label: '🌍 Écologie & Terroirs',
    text: 'Reportages d’impact sur les réalités écologiques, la souveraineté alimentaire, la paysannerie et l’aménagement équitable.',
  },
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
  // Navigation par étapes
  const [currentStep, setCurrentStep] = useState<CreateHouseStep>(1);
  const [showLivePreview, setShowLivePreview] = useState<boolean>(true);

  // Formulaire
  const [name, setName] = useState<string>('');
  const [motto, setMotto] = useState<string>("L'information vérifiée, sans concession.");
  const [description, setDescription] = useState<string>('');
  const [specialties, setSpecialties] = useState<string[]>(['Investigation', 'Société & Citoyenneté']);
  const [logo, setLogo] = useState<string>(PRESET_LOGOS[0].url);
  const [coverImage, setCoverImage] = useState<string>(PRESET_COVERS[0].url);
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>(currentUser?.email || '');
  const [address, setAddress] = useState<string>('Bureau Éditorial Central');
  const [website, setWebsite] = useState<string>('');
  const [charterAccepted, setCharterAccepted] = useState<boolean>(true);

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals de sélection d'images
  const [imagePickerType, setImagePickerType] = useState<'logo' | 'cover' | null>(null);

  // Critères de validation
  const isNameValid = name.trim().length >= 3;
  const isDescValid = description.trim().length >= 10;
  const isSpecialtiesValid = specialties.length >= 1;
  const isFormReady = isNameValid && isDescValid && isSpecialtiesValid && charterAccepted;

  // Calcul du slug instantané
  const generatedSlug = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'votre-maison';

  const toggleSpecialty = (spec: string) => {
    if (specialties.includes(spec)) {
      if (specialties.length > 1) {
        setSpecialties(specialties.filter((s) => s !== spec));
      } else {
        Alert.alert('Information', 'Une maison de presse doit couvrir au moins une thématique.');
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
      setCurrentStep(1);
      return;
    }

    const cleanDesc = description.trim();
    if (!cleanDesc || cleanDesc.length < 10) {
      setErrorMessage('Veuillez décrire la ligne éditoriale (au moins 10 caractères).');
      setCurrentStep(1);
      return;
    }

    if (!charterAccepted) {
      setErrorMessage('Veuillez accepter l’engagement déontologique du Chef de Rédaction.');
      setCurrentStep(3);
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
        `Félicitations ! La maison « ${res.house.name} » a été créée avec succès. Vous en êtes le Chef de Rédaction officiel.`
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
        {/* En-tête supérieur stylisé */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerCloseBtn} activeOpacity={0.7}>
            <AppIcon name="close" size={16} color="#94a3b8" />
            <Text style={styles.headerCloseText}>FERMER</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTag}>RÉSEAU ÉDITORIAL</Text>
            <Text style={styles.headerTitle}>FONDER UNE MAISON</Text>
          </View>

          <TouchableOpacity
            onPress={handleSubmit}
            style={[styles.headerActionBtn, (!isFormReady || loading) && styles.headerActionBtnDisabled]}
            disabled={!isFormReady || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <AppIcon name="shield-checkmark" size={13} color="#000000" />
                <Text style={styles.headerActionBtnText}>CRÉER</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Indicateur d'étapes de création */}
        <CreateHouseStepIndicator
          currentStep={currentStep}
          onSelectStep={setCurrentStep}
          step1Completed={isNameValid && isDescValid}
          step2Completed={isSpecialtiesValid}
          step3Completed={charterAccepted}
        />

        <ScrollView contentContainerStyle={styles.scrollBody} keyboardShouldPersistTaps="handled">
          {/* Vérification de la limite de 1 maison par journaliste */}
          {(currentUser?.mediaName || currentUser?.mediaId) && currentUser?.role !== 'admin' ? (
            <View style={styles.limitCard}>
              <View style={styles.limitIconWrap}>
                <AppIcon name="shield" size={28} color="#f59e0b" />
              </View>
              <Text style={styles.limitTitle}>LIMITE DÉONTOLOGIQUE ATTEINTE</Text>
              <Text style={styles.limitDesc}>
                Afin de préserver l'indépendance et la clarté éditoriale de PURGE, chaque journaliste est limité à une seule maison de presse.
              </Text>
              <View style={styles.limitActiveBox}>
                <Text style={styles.limitActiveLabel}>Votre rédaction actuelle :</Text>
                <Text style={styles.limitActiveName}>« {currentUser.mediaName || 'Maison Active'} »</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.limitCloseBtn} activeOpacity={0.8}>
                <Text style={styles.limitCloseBtnText}>RETOURNER AU PROFIL</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Bannière introductive épurée */}
              <View style={styles.bannerCard}>
                <View style={styles.bannerHeader}>
                  <View style={styles.bannerIconCircle}>
                    <AppIcon name="newspaper" size={18} color="#06b6d4" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bannerTitle}>Fondation d’un Média Indépendant</Text>
                    <Text style={styles.bannerSub}>
                      Fédérez jusqu’à 5 confrères, signez vos enquêtes collégiales et accédez aux scrutins de la presse.
                    </Text>
                  </View>
                </View>

                {/* Bouton de bascule de l'aperçu */}
                <TouchableOpacity
                  style={styles.previewToggleBtn}
                  onPress={() => setShowLivePreview(!showLivePreview)}
                  activeOpacity={0.8}
                >
                  <AppIcon
                    name={showLivePreview ? 'eye' : 'sparkles'}
                    size={13}
                    color="#06b6d4"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.previewToggleText}>
                    {showLivePreview ? 'Masquer l’aperçu de carte' : 'Afficher l’aperçu de carte'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* CARTE D'APERÇU EN DIRECT */}
              {showLivePreview && (
                <HouseLivePreviewCard
                  name={name}
                  motto={motto}
                  logo={logo}
                  coverImage={coverImage}
                  specialties={specialties}
                  ownerName={currentUser?.name || 'Chef de Rédaction'}
                  address={address}
                />
              )}

              {/* Message d'erreur */}
              {errorMessage && (
                <View style={styles.errorBox}>
                  <AppIcon name="alert-circle" size={14} color="#f87171" style={{ marginRight: 6, marginTop: 1 }} />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              )}

              {/* ================================================= */}
              {/* ÉTAPE 1 : IDENTITÉ, SLOGAN & LIGNE ÉDITORIALE */}
              {/* ================================================= */}
              {currentStep === 1 && (
                <View style={styles.stepContainer}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>ÉTAPE 1 / 3</Text>
                    </View>
                    <Text style={styles.sectionHeading}>IDENTITÉ & CHARTE ÉDITORIALE</Text>
                  </View>

                  {/* 1.1 Nom de la Maison */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Nom de la Maison de Presse *</Text>
                      <Text style={[styles.charCounter, isNameValid && styles.validCounter]}>
                        {name.trim().length} car. (min. 3)
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.input, isNameValid && styles.inputValid]}
                      placeholder="Ex: L'Investigateur du Faso, Sentinelle Libre..."
                      placeholderTextColor="#64748b"
                      value={name}
                      onChangeText={(val) => {
                        setName(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                    />
                    <View style={styles.slugRow}>
                      <AppIcon name="link" size={11} color="#64748b" style={{ marginRight: 4 }} />
                      <Text style={styles.slugText}>
                        Identifiant : <Text style={styles.slugHighlight}>purge.info/media/{generatedSlug}</Text>
                      </Text>
                    </View>
                  </View>

                  {/* 1.2 Slogan / Devise */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Devise ou Slogan de Rédaction</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Ex: L'information vérifiée, sans concession."
                      placeholderTextColor="#64748b"
                      value={motto}
                      onChangeText={setMotto}
                    />
                    <Text style={styles.helpText}>Suggestions rapides en un clic :</Text>
                    <View style={styles.suggestionsWrap}>
                      {SLOGAN_SUGGESTIONS.map((sug) => (
                        <TouchableOpacity
                          key={sug}
                          style={[styles.sloganPill, motto === sug && styles.activeSloganPill]}
                          onPress={() => setMotto(sug)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.sloganPillText, motto === sug && styles.activeSloganPillText]}>
                            « {sug} »
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* 1.3 Ligne Éditoriale & Déontologie */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Ligne Éditoriale & Mission *</Text>
                      <Text style={[styles.charCounter, isDescValid && styles.validCounter]}>
                        {description.trim().length} car. (min. 10)
                      </Text>
                    </View>
                    <TextInput
                      style={[styles.input, styles.textArea, isDescValid && styles.inputValid]}
                      placeholder="Décrivez les principes fondamentaux, les méthodes d'enquête et les engagements de vérité portés par votre rédaction..."
                      placeholderTextColor="#64748b"
                      value={description}
                      onChangeText={(val) => {
                        setDescription(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />

                    {/* Modèles d'inspiration */}
                    <Text style={styles.helpText}>Inspirations thématiques déontologiques :</Text>
                    <View style={styles.templatesWrap}>
                      {MISSION_TEMPLATES.map((tmpl) => (
                        <TouchableOpacity
                          key={tmpl.label}
                          style={styles.templateBtn}
                          onPress={() => {
                            if (!description.trim()) {
                              setDescription(tmpl.text);
                            } else {
                              setDescription(description.trim() + ' ' + tmpl.text);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.templateBtnText}>{tmpl.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* ================================================= */}
              {/* ÉTAPE 2 : DOMAINES D'INVESTIGATION & VISUELS */}
              {/* ================================================= */}
              {currentStep === 2 && (
                <View style={styles.stepContainer}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>ÉTAPE 2 / 3</Text>
                    </View>
                    <Text style={styles.sectionHeading}>DOMAINES & CHARTE GRAPHIQUE</Text>
                  </View>

                  {/* 2.1 Domaines d'investigation */}
                  <View style={styles.inputGroup}>
                    <View style={styles.labelRow}>
                      <Text style={styles.label}>Domaines d'Investigation couverts *</Text>
                      <Text style={styles.counterBadge}>
                        {specialties.length} sélectionné{specialties.length > 1 ? 's' : ''}
                      </Text>
                    </View>
                    <Text style={styles.subLabel}>
                      Choisissez les spécialités d'enquêtes pour orienter vos lecteurs :
                    </Text>

                    <View style={styles.chipsContainer}>
                      {SPECIALTY_OPTIONS.map((spec) => {
                        const active = specialties.includes(spec.name);
                        return (
                          <TouchableOpacity
                            key={spec.name}
                            style={[styles.chip, active && styles.activeChip]}
                            onPress={() => toggleSpecialty(spec.name)}
                            activeOpacity={0.7}
                          >
                            <AppIcon
                              name={active ? 'checkmark-circle' : spec.icon}
                              size={12}
                              color={active ? '#06b6d4' : '#94a3b8'}
                              style={{ marginRight: 6 }}
                            />
                            <Text style={[styles.chipText, active && styles.activeChipText]}>
                              {spec.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>

                  {/* 2.2 Studio Graphique : Logo Officiel */}
                  <View style={styles.visualStudioBox}>
                    <View style={styles.visualHeader}>
                      <View>
                        <Text style={styles.visualTitle}>Logo Officiel de la Rédaction</Text>
                        <Text style={styles.visualSub}>Format 1:1 pour l'arène et les classements</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.changeImgBtn}
                        onPress={() => setImagePickerType('logo')}
                        activeOpacity={0.8}
                      >
                        <AppIcon name="camera" size={13} color="#06b6d4" style={{ marginRight: 5 }} />
                        <Text style={styles.changeImgBtnText}>Changer / Importer</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Aperçu direct & Choix rapide parmi presets */}
                    <View style={styles.logoSelectionRow}>
                      <View style={styles.currentLogoWrap}>
                        <Image source={{ uri: logo }} style={styles.currentLogoImg} />
                        <View style={styles.activeCheckBadge}>
                          <AppIcon name="checkmark" size={10} color="#000000" />
                        </View>
                      </View>

                      <View style={styles.presetLogosGrid}>
                        <Text style={styles.presetLabel}>Présélections recommandées :</Text>
                        <View style={styles.presetThumbnailsRow}>
                          {PRESET_LOGOS.map((p) => {
                            const isSelected = logo === p.url;
                            return (
                              <TouchableOpacity
                                key={p.title}
                                style={[styles.presetThumbWrap, isSelected && styles.selectedThumbWrap]}
                                onPress={() => setLogo(p.url)}
                                activeOpacity={0.8}
                              >
                                <Image source={{ uri: p.url }} style={styles.presetThumb} />
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* 2.3 Studio Graphique : Photo de Couverture */}
                  <View style={styles.visualStudioBox}>
                    <View style={styles.visualHeader}>
                      <View>
                        <Text style={styles.visualTitle}>Bannière de Couverture (16:9)</Text>
                        <Text style={styles.visualSub}>Arrière-plan d'en-tête de votre maison de presse</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.changeImgBtn}
                        onPress={() => setImagePickerType('cover')}
                        activeOpacity={0.8}
                      >
                        <AppIcon name="image" size={13} color="#06b6d4" style={{ marginRight: 5 }} />
                        <Text style={styles.changeImgBtnText}>Changer / Importer</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.currentCoverWrap}>
                      <Image source={{ uri: coverImage }} style={styles.currentCoverImg} />
                      <View style={styles.coverRatioBadge}>
                        <Text style={styles.coverRatioText}>16:9 COUVERTURE</Text>
                      </View>
                    </View>

                    <View style={styles.presetCoversRow}>
                      {PRESET_COVERS.map((cov) => {
                        const isSelected = coverImage === cov.url;
                        return (
                          <TouchableOpacity
                            key={cov.title}
                            style={[styles.presetCoverThumb, isSelected && styles.selectedCoverThumb]}
                            onPress={() => setCoverImage(cov.url)}
                            activeOpacity={0.8}
                          >
                            <Image source={{ uri: cov.url }} style={styles.presetCoverImg} />
                            <Text style={styles.presetCoverTitle} numberOfLines={1}>
                              {cov.title}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              )}

              {/* ================================================= */}
              {/* ÉTAPE 3 : SIÈGE, CONTACT & PACTE DÉONTOLOGIQUE */}
              {/* ================================================= */}
              {currentStep === 3 && (
                <View style={styles.stepContainer}>
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.stepBadge}>
                      <Text style={styles.stepBadgeText}>ÉTAPE 3 / 3</Text>
                    </View>
                    <Text style={styles.sectionHeading}>SIÈGE, CONTACT & ENGAGEMENT</Text>
                  </View>

                  {/* Coordonnées */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Adresse ou Ville du Bureau Éditorial</Text>
                    <View style={styles.iconInputRow}>
                      <AppIcon name="building" size={14} color="#64748b" style={styles.inputLeftIcon} />
                      <TextInput
                        style={[styles.input, styles.inputWithIcon]}
                        placeholder="Ex: Bureau Central, Ouagadougou / Abidjan / Dakar"
                        placeholderTextColor="#64748b"
                        value={address}
                        onChangeText={setAddress}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Téléphone ou Ligne d’Alerte des Sources</Text>
                    <View style={styles.iconInputRow}>
                      <AppIcon name="call" size={14} color="#64748b" style={styles.inputLeftIcon} />
                      <TextInput
                        style={[styles.input, styles.inputWithIcon]}
                        placeholder="+226 70 00 00 00 / Signal / WhatsApp"
                        placeholderTextColor="#64748b"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Officiel de la Rédaction</Text>
                    <View style={styles.iconInputRow}>
                      <AppIcon name="mail" size={14} color="#64748b" style={styles.inputLeftIcon} />
                      <TextInput
                        style={[styles.input, styles.inputWithIcon]}
                        placeholder="redaction@votre-media.info"
                        placeholderTextColor="#64748b"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Site Web / Réseau d’Investigation (optionnel)</Text>
                    <View style={styles.iconInputRow}>
                      <AppIcon name="globe" size={14} color="#64748b" style={styles.inputLeftIcon} />
                      <TextInput
                        style={[styles.input, styles.inputWithIcon]}
                        placeholder="https://votre-media.info"
                        placeholderTextColor="#64748b"
                        value={website}
                        onChangeText={setWebsite}
                        keyboardType="url"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  {/* PACTE DÉONTOLOGIQUE DU CHEF DE RÉDACTION */}
                  <View style={styles.charterCard}>
                    <View style={styles.charterHeader}>
                      <AppIcon name="shield-checkmark" size={16} color="#06b6d4" style={{ marginRight: 6 }} />
                      <Text style={styles.charterTitle}>Pacte de Vérification & Déontologie</Text>
                    </View>
                    <Text style={styles.charterText}>
                      En fondant cette maison de presse sur PURGE, vous assumez le titre de <Text style={styles.highlightText}>Chef de Rédaction</Text>. Vous vous engagez à :
                    </Text>
                    <View style={styles.charterList}>
                      <Text style={styles.charterItem}>• Respecter scrupuleusement la vérité factuelle et le recoupement des preuves.</Text>
                      <Text style={styles.charterItem}>• Protéger de façon inviolable l’anonymat et l'intégrité de vos sources citoyennes.</Text>
                      <Text style={styles.charterItem}>• Bannir toute diffamation non vérifiable et toute inféodation d'intérêts financiers occultes.</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.charterCheckboxRow}
                      onPress={() => setCharterAccepted(!charterAccepted)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.checkbox, charterAccepted && styles.checkboxActive]}>
                        {charterAccepted && <AppIcon name="checkmark" size={12} color="#000000" />}
                      </View>
                      <Text style={styles.charterCheckboxText}>
                        Je m’engage solennellement au respect de la charte d’indépendance de PURGE.
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* ================================================= */}
              {/* BARRE D'ACTIONS INFÉRIEURE & NAVIGATION ÉTAPES */}
              {/* ================================================= */}
              <View style={styles.footerNav}>
                {/* Récapitulatif de conformité */}
                <View style={styles.validationRow}>
                  <View style={styles.checkItem}>
                    <AppIcon
                      name={isNameValid ? 'checkmark-circle' : 'close-circle'}
                      size={12}
                      color={isNameValid ? '#06b6d4' : '#64748b'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.checkText, isNameValid && styles.checkTextActive]}>
                      Nom (≥ 3)
                    </Text>
                  </View>

                  <View style={styles.checkItem}>
                    <AppIcon
                      name={isDescValid ? 'checkmark-circle' : 'close-circle'}
                      size={12}
                      color={isDescValid ? '#06b6d4' : '#64748b'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.checkText, isDescValid && styles.checkTextActive]}>
                      Ligne (≥ 10)
                    </Text>
                  </View>

                  <View style={styles.checkItem}>
                    <AppIcon
                      name={isSpecialtiesValid ? 'checkmark-circle' : 'close-circle'}
                      size={12}
                      color={isSpecialtiesValid ? '#06b6d4' : '#64748b'}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.checkText, isSpecialtiesValid && styles.checkTextActive]}>
                      Thématiques (≥ 1)
                    </Text>
                  </View>
                </View>

                {/* Boutons Suivant / Précédent / Créer */}
                <View style={styles.actionButtonsRow}>
                  {currentStep > 1 && (
                    <TouchableOpacity
                      style={styles.prevBtn}
                      onPress={() => setCurrentStep((prev) => (prev - 1) as CreateHouseStep)}
                      activeOpacity={0.8}
                      disabled={loading}
                    >
                      <AppIcon name="chevron-back" size={14} color="#94a3b8" style={{ marginRight: 4 }} />
                      <Text style={styles.prevBtnText}>Précédent</Text>
                    </TouchableOpacity>
                  )}

                  {currentStep < 3 ? (
                    <TouchableOpacity
                      style={styles.nextBtn}
                      onPress={() => {
                        if (currentStep === 1 && (!isNameValid || !isDescValid)) {
                          Alert.alert(
                            'Éléments requis',
                            'Veuillez renseigner le nom (min. 3 car.) et la ligne éditoriale (min. 10 car.) pour continuer.'
                          );
                          return;
                        }
                        setCurrentStep((prev) => (prev + 1) as CreateHouseStep);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.nextBtnText}>
                        {currentStep === 1 ? 'Suivant : Visuels & Thèmes' : 'Suivant : Siège & Accord'}
                      </Text>
                      <AppIcon name="arrow-forward" size={14} color="#000000" style={{ marginLeft: 6 }} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.bigSubmitBtn, (!isFormReady || loading) && styles.bigSubmitBtnDisabled]}
                      onPress={handleSubmit}
                      disabled={!isFormReady || loading}
                      activeOpacity={0.8}
                    >
                      {loading ? (
                        <ActivityIndicator color="#000000" size="small" />
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                          <AppIcon name="shield-checkmark" size={16} color="#000000" style={{ marginRight: 8 }} />
                          <Text style={styles.bigSubmitBtnText}>FONDER LA MAISON DE PRESSE</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        {/* Modal Sélecteur d'image (Galerie + URL + Presets) */}
        {imagePickerType && (
          <ImageSelectModal
            visible={!!imagePickerType}
            title={
              imagePickerType === 'logo'
                ? 'Choisir le logo officiel de la Rédaction'
                : 'Choisir la photo de couverture (16:9)'
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
    backgroundColor: '#070d1e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(6, 182, 212, 0.25)',
  },
  headerCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  headerCloseText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTag: {
    color: '#06b6d4',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 1,
  },
  headerActionBtn: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  headerActionBtnDisabled: {
    opacity: 0.35,
  },
  headerActionBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  bannerCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderRadius: 16,
    padding: 14,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  bannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },
  bannerSub: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  previewToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
  },
  previewToggleText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 10,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  stepContainer: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    gap: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 10,
  },
  stepBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepBadgeText: {
    color: '#06b6d4',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionHeading: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  inputGroup: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  subLabel: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 4,
  },
  charCounter: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  validCounter: {
    color: '#06b6d4',
  },
  counterBadge: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: '800',
  },
  input: {
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  inputValid: {
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  iconInputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputLeftIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 2,
  },
  inputWithIcon: {
    paddingLeft: 34,
  },
  textArea: {
    minHeight: 90,
  },
  slugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  slugText: {
    color: '#64748b',
    fontSize: 11,
  },
  slugHighlight: {
    color: '#06b6d4',
    fontWeight: '700',
  },
  helpText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  suggestionsWrap: {
    gap: 6,
    marginTop: 2,
  },
  sloganPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeSloganPill: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: '#06b6d4',
  },
  sloganPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontStyle: 'italic',
  },
  activeSloganPillText: {
    color: '#06b6d4',
    fontWeight: '700',
  },
  templatesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  templateBtn: {
    backgroundColor: '#0b1329',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  templateBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeChip: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
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
  visualStudioBox: {
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  visualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  visualTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  visualSub: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 1,
  },
  changeImgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  changeImgBtnText: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '700',
  },
  logoSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  currentLogoWrap: {
    width: 60,
    height: 60,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#06b6d4',
    overflow: 'hidden',
    position: 'relative',
  },
  currentLogoImg: {
    width: '100%',
    height: '100%',
  },
  activeCheckBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetLogosGrid: {
    flex: 1,
  },
  presetLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 6,
  },
  presetThumbnailsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetThumbWrap: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  selectedThumbWrap: {
    borderColor: '#06b6d4',
    borderWidth: 2,
  },
  presetThumb: {
    width: '100%',
    height: '100%',
  },
  currentCoverWrap: {
    width: '100%',
    height: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    position: 'relative',
  },
  currentCoverImg: {
    width: '100%',
    height: '100%',
  },
  coverRatioBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(2, 5, 18, 0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverRatioText: {
    color: '#94a3b8',
    fontSize: 8,
    fontWeight: '800',
  },
  presetCoversRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetCoverThumb: {
    flex: 1,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    position: 'relative',
  },
  selectedCoverThumb: {
    borderColor: '#06b6d4',
    borderWidth: 2,
  },
  presetCoverImg: {
    width: '100%',
    height: '100%',
  },
  presetCoverTitle: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(2, 5, 18, 0.75)',
    color: '#ffffff',
    fontSize: 8,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 2,
  },
  charterCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderRadius: 14,
    padding: 14,
  },
  charterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  charterTitle: {
    color: '#06b6d4',
    fontSize: 13,
    fontWeight: '900',
  },
  charterText: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  highlightText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  charterList: {
    gap: 4,
    marginBottom: 12,
  },
  charterItem: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
  },
  charterCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020512',
  },
  checkboxActive: {
    backgroundColor: '#06b6d4',
    borderColor: '#06b6d4',
  },
  charterCheckboxText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  footerNav: {
    gap: 12,
    marginTop: 4,
  },
  validationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#070d1e',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  checkTextActive: {
    color: '#06b6d4',
    fontWeight: '800',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  prevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0b1329',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  prevBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  nextBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#06b6d4',
  },
  nextBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  bigSubmitBtn: {
    flex: 2,
    backgroundColor: '#06b6d4',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigSubmitBtnDisabled: {
    opacity: 0.4,
  },
  bigSubmitBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  limitCard: {
    backgroundColor: '#070d1e',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  limitIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  limitTitle: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  limitDesc: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  limitActiveBox: {
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%',
    alignItems: 'center',
    marginVertical: 6,
  },
  limitActiveLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  limitActiveName: {
    color: '#06b6d4',
    fontSize: 14,
    fontWeight: '900',
  },
  limitCloseBtn: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  limitCloseBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
