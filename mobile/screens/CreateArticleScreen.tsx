import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category, Article, MediaHouse, User } from '../types';
import { api } from '../services/api';
import {
  pickImageFromGallery,
  uploadPickedImageToCloudinary,
  PickImageResult,
} from '../services/imagePicker';
import { ImageSelectModal } from '../components/ImageSelectModal';
import { AppIcon } from '../components/AppIcon';

interface CreateArticleScreenProps {
  onBack: () => void;
  onArticleCreated: (article: Article) => void;
  initialMediaHouseId?: string;
  initialMediaHouseName?: string;
  currentUser?: User | null;
}

export const CreateArticleScreen: React.FC<CreateArticleScreenProps> = ({
  onBack,
  onArticleCreated,
  initialMediaHouseId,
  initialMediaHouseName,
  currentUser,
}) => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [targetMediaHouseId, setTargetMediaHouseId] = useState<string | undefined>(
    initialMediaHouseId || currentUser?.mediaId
  );
  const [targetMediaHouseName, setTargetMediaHouseName] = useState<string | undefined>(
    initialMediaHouseName || currentUser?.mediaName
  );
  const [availableHouses, setAvailableHouses] = useState<MediaHouse[]>([]);
  const [showHousePicker, setShowHousePicker] = useState<boolean>(false);
  const [pickedImage, setPickedImage] = useState<PickImageResult | null>(null);
  const [directCoverUrl, setDirectCoverUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [includePoll, setIncludePoll] = useState<boolean>(false);
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOption1, setPollOption1] = useState<string>('D’accord / Favorable');
  const [pollOption2, setPollOption2] = useState<string>('Opposé / Défavorable');
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  // Sauvegarde automatique du brouillon local
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const [hasPendingDraft, setHasPendingDraft] = useState<boolean>(false);
  const [pendingDraftData, setPendingDraftData] = useState<any>(null);

  // Vérifier s'il y a un brouillon non publié au chargement
  useEffect(() => {
    const checkDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem('@purge_article_draft');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.title || parsed.content || parsed.summary) {
            setPendingDraftData(parsed);
            setHasPendingDraft(true);
          }
        }
      } catch (e) {
        console.warn('Erreur lecture brouillon:', e);
      }
    };
    checkDraft();
  }, []);

  // Sauvegarde automatique périodique si l'utilisateur saisit du texte
  useEffect(() => {
    if (!title.trim() && !content.trim() && !summary.trim()) return;

    const timer = setTimeout(async () => {
      try {
        const timeStr = new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const draftPayload = {
          title,
          summary,
          content,
          selectedCategoryId,
          targetMediaHouseId,
          targetMediaHouseName,
          directCoverUrl,
          savedAt: timeStr,
        };
        await AsyncStorage.setItem('@purge_article_draft', JSON.stringify(draftPayload));
        setDraftSavedAt(timeStr);
      } catch (e) {
        console.warn('Erreur sauvegarde automatique du brouillon:', e);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [
    title,
    summary,
    content,
    selectedCategoryId,
    targetMediaHouseId,
    targetMediaHouseName,
    directCoverUrl,
  ]);

  const handleRestoreDraft = () => {
    if (pendingDraftData) {
      if (pendingDraftData.title) setTitle(pendingDraftData.title);
      if (pendingDraftData.summary) setSummary(pendingDraftData.summary);
      if (pendingDraftData.content) setContent(pendingDraftData.content);
      if (pendingDraftData.selectedCategoryId) setSelectedCategoryId(pendingDraftData.selectedCategoryId);
      if (pendingDraftData.targetMediaHouseId) setTargetMediaHouseId(pendingDraftData.targetMediaHouseId);
      if (pendingDraftData.targetMediaHouseName) setTargetMediaHouseName(pendingDraftData.targetMediaHouseName);
      if (pendingDraftData.directCoverUrl) setDirectCoverUrl(pendingDraftData.directCoverUrl);
      setDraftSavedAt(pendingDraftData.savedAt || 'restauré');
    }
    setHasPendingDraft(false);
  };

  const handleDiscardDraft = async () => {
    try {
      await AsyncStorage.removeItem('@purge_article_draft');
    } catch {}
    setHasPendingDraft(false);
    setPendingDraftData(null);
    setDraftSavedAt(null);
  };

  useEffect(() => {
    if (initialMediaHouseId) {
      setTargetMediaHouseId(initialMediaHouseId);
    } else if (currentUser?.mediaId) {
      setTargetMediaHouseId(currentUser.mediaId);
    }

    if (initialMediaHouseName) {
      setTargetMediaHouseName(initialMediaHouseName);
    } else if (currentUser?.mediaName) {
      setTargetMediaHouseName(currentUser.mediaName);
    }
  }, [initialMediaHouseId, initialMediaHouseName, currentUser]);

  useEffect(() => {
    api.getCategories()
      .then((res) => {
        if (res.categories && res.categories.length > 0) {
          setCategories(res.categories);
          setSelectedCategoryId(res.categories[0].id);
        }
      })
      .catch((err) => console.warn('Erreur catégories:', err));

    api.getMediaHouses()
      .then((res) => {
        if (res?.mediaHouses) {
          setAvailableHouses(res.mediaHouses);
        }
      })
      .catch(() => {});
  }, []);

  const handleSelectCover = async (result: { url?: string; pickedResult?: PickImageResult }) => {
    if (result.pickedResult) {
      setPickedImage(result.pickedResult);
      setDirectCoverUrl(null);
    } else if (result.url) {
      setDirectCoverUrl(result.url);
      setPickedImage(null);
    }
  };

  const handlePublish = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Veuillez saisir un titre percutant.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('Validation', 'Le corps de l’article ne peut pas être vide.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Validation', 'Veuillez sélectionner une catégorie.');
      return;
    }

    setSubmitting(true);
    setUploadStatus("Préparation de l'article...");

    try {
      let coverImageUrl: string | undefined;

      // Si une image a été sélectionnée depuis la galerie ou la caméra, on l'uploade vers Cloudinary
      if (pickedImage) {
        setUploadStatus('Téléversement Cloudinary en cours...');
        const uploaded = await uploadPickedImageToCloudinary(pickedImage, 'article_cover');
        coverImageUrl = uploaded.url;
      } else if (directCoverUrl) {
        coverImageUrl = directCoverUrl;
      }

      setUploadStatus('Publication de l’enquête...');
      const pollPayload = includePoll && pollQuestion.trim()
        ? {
            id: `poll_${Date.now()}`,
            question: pollQuestion.trim(),
            options: [
              { id: 'opt_1', text: pollOption1.trim() || 'Pour', votesCount: 0, votes: 0 },
              { id: 'opt_2', text: pollOption2.trim() || 'Contre', votesCount: 0, votes: 0 },
            ],
            totalVotes: 0,
          }
        : undefined;

      const res = await api.createArticle({
        title: title.trim(),
        summary: summary.trim() || undefined,
        content: content.trim(),
        categoryId: selectedCategoryId,
        coverImage: coverImageUrl,
        videoUrl: videoUrl.trim() || undefined,
        poll: pollPayload,
        mediaHouseId: targetMediaHouseId,
        mediaHouseName: targetMediaHouseName,
        status: 'published',
      });

      Alert.alert(
        'Succès',
        targetMediaHouseName
          ? `Votre article a été publié avec succès au nom de « ${targetMediaHouseName} » !`
          : 'Votre article a été publié avec succès !'
      );
      try {
        await AsyncStorage.removeItem('@purge_article_draft');
      } catch {}
      onArticleCreated(res.article);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de publier l’article.');
    } finally {
      setSubmitting(false);
      setUploadStatus(null);
    }
  };

  const currentCoverDisplay = pickedImage?.uri || directCoverUrl;

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onBack} disabled={submitting}>
          <Text style={styles.cancelBtnText}>ANNULER</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleCenter}>
          <Text style={styles.headerTitle}>RÉDACTION D'ENQUÊTE</Text>
          {draftSavedAt && (
            <Text style={styles.draftSavedNotice}>
              ● Brouillon auto-enregistré ({draftSavedAt})
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.publishBtn, submitting && styles.publishBtnDisabled]}
          onPress={handlePublish}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.publishBtnText}>PUBLIER</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Bannière de restauration de brouillon */}
        {hasPendingDraft && (
          <View style={styles.draftRecoveryBanner}>
            <View style={styles.draftRecoveryInfo}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <AppIcon name="document-text" size={14} color="#f59e0b" style={{ marginRight: 6 }} />
                <Text style={styles.draftRecoveryTitle}>Brouillon antérieur détecté</Text>
              </View>
              <Text style={styles.draftRecoverySub}>
                Un travail en cours ({pendingDraftData?.title ? `« ${pendingDraftData.title.slice(0, 30)}... »` : 'texte non titré'}) a été sauvegardé.
              </Text>
            </View>
            <View style={styles.draftRecoveryActions}>
              <TouchableOpacity
                style={styles.draftRestoreBtn}
                onPress={handleRestoreDraft}
              >
                <Text style={styles.draftRestoreBtnText}>Restaurer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.draftDiscardBtn}
                onPress={handleDiscardDraft}
              >
                <Text style={styles.draftDiscardBtnText}>Ignorer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {uploadStatus && (
          <View style={styles.statusBar}>
            <ActivityIndicator size="small" color="#00d2ff" />
            <Text style={styles.statusText}>{uploadStatus}</Text>
          </View>
        )}

        {/* Affiliation Maison de Presse Éditrice */}
        <View style={styles.houseCardSection}>
          <View style={styles.houseCardHeader}>
            <View style={styles.houseCardIconBox}>
              <AppIcon name="business" size={18} color="#00d2ff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.houseCardLabel}>MAISON DE PRESSE ÉDITRICE</Text>
              <Text style={styles.houseCardName}>
                {targetMediaHouseName ? `« ${targetMediaHouseName} »` : 'Journaliste Indépendant'}
              </Text>
            </View>
            {targetMediaHouseName && (
              <View style={styles.houseCardBadge}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <AppIcon name="checkmark" size={10} color="#10b981" style={{ marginRight: 3 }} />
                  <Text style={styles.houseCardBadgeText}>ÉDITION OFFICIELLE</Text>
                </View>
              </View>
            )}
          </View>
          <Text style={styles.houseCardNote}>
            {targetMediaHouseName
              ? `Cette enquête sera directement archivée et diffusée sous la bannière éditoriale de « ${targetMediaHouseName} ».`
              : "L'article sera publié sous votre nom d'auteur indépendant."}
          </Text>

          {availableHouses.length > 0 && (
            <TouchableOpacity
              style={styles.changeHouseBtn}
              onPress={() => setShowHousePicker(true)}
              activeOpacity={0.8}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <AppIcon name="refresh" size={12} color="#00d2ff" style={{ marginRight: 5 }} />
                <Text style={styles.changeHouseBtnText}>Changer ou vérifier la maison d'édition ›</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Sélection d'image de couverture */}
        <View style={styles.section}>
          <Text style={styles.label}>PHOTO DE COUVERTURE (16:9)</Text>
          {currentCoverDisplay ? (
            <View style={styles.imagePreviewWrapper}>
              <Image source={{ uri: currentCoverDisplay }} style={styles.coverPreview} resizeMode="cover" />
              <View style={styles.coverActionsRow}>
                <TouchableOpacity
                  style={styles.changeCoverBtn}
                  onPress={() => setShowImageModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppIcon name="camera" size={12} color="#00d2ff" style={{ marginRight: 4 }} />
                    <Text style={styles.changeCoverText}>Modifier l'image</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removeCoverBtn}
                  onPress={() => {
                    setPickedImage(null);
                    setDirectCoverUrl(null);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppIcon name="close" size={12} color="#ef4444" style={{ marginRight: 4 }} />
                    <Text style={styles.removeCoverText}>Supprimer</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.uploadPlaceholder}
              onPress={() => setShowImageModal(true)}
              activeOpacity={0.8}
            >
              <AppIcon name="camera" size={28} color="#00d2ff" style={{ marginBottom: 6 }} />
              <Text style={styles.uploadTitle}>Ajouter une photo de couverture</Text>
              <Text style={styles.uploadSub}>Galerie photo, appareil photo, lien direct ou modèles d'enquête</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Titre */}
        <View style={styles.section}>
          <Text style={styles.label}>TITRE DE L'ENQUÊTE *</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Saisissez un titre révélateur..."
            placeholderTextColor="#64748b"
            value={title}
            onChangeText={setTitle}
            maxLength={180}
          />
        </View>

        {/* Choix de la Catégorie */}
        <View style={styles.section}>
          <Text style={styles.label}>CATÉGORIE *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
            {categories.map((cat) => {
              const isSelected = selectedCategoryId === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catOption, isSelected && styles.activeCatOption]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.catOptionText, isSelected && styles.activeCatOptionText]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Résumé / Chapeau */}
        <View style={styles.section}>
          <Text style={styles.label}>CHAPEAU / RÉSUMÉ (ACCROCHE)</Text>
          <TextInput
            style={styles.summaryInput}
            placeholder="En 2 ou 3 phrases, posez le contexte factuel..."
            placeholderTextColor="#64748b"
            value={summary}
            onChangeText={setSummary}
            multiline
            maxLength={350}
          />
        </View>

        {/* Corps de l'article */}
        <View style={styles.section}>
          <Text style={styles.label}>CORPS DE L'ARTICLE *</Text>
          <TextInput
            style={styles.contentInput}
            placeholder="Rédigez l'enquête complète, citez les sources, détaillez les éléments d'investigation..."
            placeholderTextColor="#64748b"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Section Reportage Vidéo (Support jusqu'à 90 Mo) */}
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={styles.label}>REPORTAGE VIDÉO (MAX 90 MO)</Text>
            <Text style={{ color: '#00f3ff', fontSize: 10, fontWeight: '700' }}>MP4 • WEBM • CLOUD</Text>
          </View>
          <TextInput
            style={styles.summaryInput}
            placeholder="Lien vidéo direct MP4 / WebM ou Cloudinary (ex: https://.../reportage.mp4)"
            placeholderTextColor="#64748b"
            value={videoUrl}
            onChangeText={setVideoUrl}
            autoCapitalize="none"
          />
          <Text style={{ color: '#64748b', fontSize: 10, marginTop: 4 }}>
            💡 Les reportages vidéo jusqu'à 90 Mo sont directement diffusés avec le lecteur immersif de l'application.
          </Text>
        </View>

        {/* Section Sondage Citoyen Interactif */}
        <View style={styles.section}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#0c1228',
              padding: 12,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: includePoll ? '#a855f7' : 'rgba(255, 255, 255, 0.1)',
            }}
            onPress={() => setIncludePoll(!includePoll)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <AppIcon name="bar-chart" size={16} color={includePoll ? '#a855f7' : '#94a3b8'} style={{ marginRight: 8 }} />
              <View>
                <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
                  {includePoll ? '✓ Sondage d’opinion activé' : '+ Ajouter un sondage citoyen'}
                </Text>
                <Text style={{ color: '#64748b', fontSize: 10 }}>
                  Recueillir les votes et l’avis direct des lecteurs sur cette publication
                </Text>
              </View>
            </View>
            <Text style={{ color: includePoll ? '#a855f7' : '#64748b', fontSize: 11, fontWeight: 'bold' }}>
              {includePoll ? 'Désactiver' : 'Activer'}
            </Text>
          </TouchableOpacity>

          {includePoll && (
            <View style={{ marginTop: 10, padding: 12, backgroundColor: '#070b1a', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)' }}>
              <Text style={{ color: '#c084fc', fontSize: 10, fontWeight: '800', marginBottom: 6 }}>
                QUESTION DU SONDAGE
              </Text>
              <TextInput
                style={[styles.summaryInput, { height: 44, marginBottom: 10 }]}
                placeholder="Ex : Approuvez-vous les mesures annoncées dans ce dossier ?"
                placeholderTextColor="#64748b"
                value={pollQuestion}
                onChangeText={setPollQuestion}
              />
              <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>
                OPTION 1
              </Text>
              <TextInput
                style={[styles.summaryInput, { height: 38, marginBottom: 8 }]}
                placeholder="Option 1 (ex: Favorable)"
                placeholderTextColor="#64748b"
                value={pollOption1}
                onChangeText={setPollOption1}
              />
              <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>
                OPTION 2
              </Text>
              <TextInput
                style={[styles.summaryInput, { height: 38 }]}
                placeholder="Option 2 (ex: Défavorable)"
                placeholderTextColor="#64748b"
                value={pollOption2}
                onChangeText={setPollOption2}
              />
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal Universel de sélection d'image de couverture */}
      <ImageSelectModal
        visible={showImageModal}
        title="Photo de Couverture de l'Enquête"
        mode="cover"
        currentImageUrl={currentCoverDisplay || undefined}
        onSelectImage={handleSelectCover}
        onClose={() => setShowImageModal(false)}
      />

      {/* Modal Sélecteur de Maison d'Édition */}
      <Modal visible={showHousePicker} transparent animationType="fade" onRequestClose={() => setShowHousePicker(false)}>
        <View style={styles.pickerBackdrop}>
          <View style={styles.pickerDialog}>
            <Text style={styles.pickerDialogTitle}>Sélectionner la Rédaction d'Édition</Text>
            <Text style={styles.pickerDialogSub}>
              Choisissez sous quelle maison de presse agréée sera publiée cette enquête.
            </Text>

            <ScrollView style={{ maxHeight: 280, marginVertical: 12 }}>
              {/* Option Indépendant */}
              <TouchableOpacity
                style={[
                  styles.pickerOptionItem,
                  !targetMediaHouseId && styles.activePickerOptionItem,
                ]}
                onPress={() => {
                  setTargetMediaHouseId(undefined);
                  setTargetMediaHouseName(undefined);
                  setShowHousePicker(false);
                }}
              >
                <AppIcon name="create" size={18} color="#94a3b8" style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pickerOptionTitle}>Journaliste Indépendant</Text>
                  <Text style={styles.pickerOptionDesc}>Publication à titre individuel</Text>
                </View>
                {!targetMediaHouseId && <AppIcon name="checkmark" size={16} color="#00d2ff" />}
              </TouchableOpacity>

              {availableHouses.map((h) => {
                const isSelected = targetMediaHouseId === h.id || targetMediaHouseName === h.name;
                return (
                  <TouchableOpacity
                    key={h.id}
                    style={[
                      styles.pickerOptionItem,
                      isSelected && styles.activePickerOptionItem,
                    ]}
                    onPress={() => {
                      setTargetMediaHouseId(h.id);
                      setTargetMediaHouseName(h.name);
                      setShowHousePicker(false);
                    }}
                  >
                    <AppIcon name="business" size={18} color="#00d2ff" style={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerOptionTitle}>{h.name}</Text>
                      <Text style={styles.pickerOptionDesc} numberOfLines={1}>
                        {h.motto || 'Maison de presse agréée'}
                      </Text>
                    </View>
                    {isSelected && <AppIcon name="checkmark" size={16} color="#00d2ff" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.closePickerBtn}
              onPress={() => setShowHousePicker(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.closePickerBtnText}>FERMER</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020512',
  },
  headerBar: {
    height: 52,
    backgroundColor: '#020512',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitleCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },
  draftSavedNotice: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '700',
    marginTop: 2,
  },
  draftRecoveryBanner: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    padding: 14,
    flexDirection: 'column',
    gap: 10,
  },
  draftRecoveryInfo: {
    gap: 4,
  },
  draftRecoveryTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '800',
  },
  draftRecoverySub: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  draftRecoveryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  draftRestoreBtn: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  draftRestoreBtnText: {
    color: '#020512',
    fontSize: 11,
    fontWeight: '800',
  },
  draftDiscardBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  draftDiscardBtnText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  cancelBtn: {
    padding: 6,
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  publishBtn: {
    backgroundColor: '#1d68ff',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  statusText: {
    color: '#00d2ff',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 16,
  },
  label: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  titleInput: {
    backgroundColor: '#0c1228',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catRow: {
    flexDirection: 'row',
    gap: 8,
  },
  catOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#0c1228',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  activeCatOption: {
    borderColor: '#00d2ff',
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
  },
  catOptionText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeCatOptionText: {
    color: '#00d2ff',
    fontWeight: '800',
  },
  summaryInput: {
    backgroundColor: '#0c1228',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    minHeight: 60,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  contentInput: {
    backgroundColor: '#0c1228',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
    minHeight: 220,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  uploadPlaceholder: {
    backgroundColor: '#0c1228',
    borderRadius: 10,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  uploadTitle: {
    color: '#00d2ff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  uploadSub: {
    color: '#64748b',
    fontSize: 11,
  },
  imagePreviewWrapper: {
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    height: 180,
  },
  coverPreview: {
    width: '100%',
    height: '100%',
  },
  coverActionsRow: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  changeCoverBtn: {
    backgroundColor: 'rgba(2, 5, 18, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  changeCoverText: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: '700',
  },
  removeCoverBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  removeCoverText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  houseCardSection: {
    backgroundColor: '#0c1228',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  houseCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  houseCardIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  houseCardIcon: {
    fontSize: 18,
  },
  houseCardLabel: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  houseCardName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  houseCardBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  houseCardBadgeText: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  houseCardNote: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  changeHouseBtn: {
    marginTop: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  changeHouseBtnText: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: '700',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 5, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerDialog: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#0c1228',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  pickerDialogTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  pickerDialogSub: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
  },
  pickerOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#131b38',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 12,
  },
  activePickerOptionItem: {
    borderColor: '#00d2ff',
    backgroundColor: 'rgba(0, 210, 255, 0.1)',
  },
  pickerOptionIcon: {
    fontSize: 22,
  },
  pickerOptionTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pickerOptionDesc: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  checkIcon: {
    color: '#00d2ff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closePickerBtn: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  closePickerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
