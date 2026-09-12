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
} from 'react-native';
import { Category, Article } from '../types';
import { api } from '../services/api';
import {
  pickImageFromGallery,
  uploadPickedImageToCloudinary,
  PickImageResult,
} from '../services/imagePicker';

interface CreateArticleScreenProps {
  onBack: () => void;
  onArticleCreated: (article: Article) => void;
}

export const CreateArticleScreen: React.FC<CreateArticleScreenProps> = ({
  onBack,
  onArticleCreated,
}) => {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [pickedImage, setPickedImage] = useState<PickImageResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    api.getCategories()
      .then((res) => {
        if (res.categories && res.categories.length > 0) {
          setCategories(res.categories);
          setSelectedCategoryId(res.categories[0].id);
        }
      })
      .catch((err) => console.warn('Erreur catégories:', err));
  }, []);

  const handlePickCover = async () => {
    try {
      const result = await pickImageFromGallery([16, 9]);
      if (result) {
        setPickedImage(result);
      }
    } catch (err: any) {
      Alert.alert('Image', err.message || 'Impossible de sélectionner l’image.');
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

      // Si une image a été sélectionnée, on l'uploade vers Cloudinary via le backend PURGE
      if (pickedImage) {
        setUploadStatus('Téléversement Cloudinary en cours...');
        const uploaded = await uploadPickedImageToCloudinary(pickedImage, 'article_cover');
        coverImageUrl = uploaded.url;
      }

      setUploadStatus('Publication de l’enquête...');
      const res = await api.createArticle({
        title: title.trim(),
        summary: summary.trim() || undefined,
        content: content.trim(),
        categoryId: selectedCategoryId,
        coverImage: coverImageUrl,
        status: 'published',
      });

      Alert.alert('Succès', 'Votre article a été publié avec succès !');
      onArticleCreated(res.article);
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de publier l’article.');
    } finally {
      setSubmitting(false);
      setUploadStatus(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onBack} disabled={submitting}>
          <Text style={styles.cancelBtnText}>ANNULER</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>RÉDACTION D'ENQUÊTE</Text>
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
        {uploadStatus && (
          <View style={styles.statusBar}>
            <ActivityIndicator size="small" color="#00d2ff" />
            <Text style={styles.statusText}>{uploadStatus}</Text>
          </View>
        )}

        {/* Sélection d'image de couverture */}
        <View style={styles.section}>
          <Text style={styles.label}>PHOTO DE COUVERTURE (CLOUDINARY)</Text>
          {pickedImage ? (
            <View style={styles.imagePreviewWrapper}>
              <Image source={{ uri: pickedImage.uri }} style={styles.coverPreview} resizeMode="cover" />
              <TouchableOpacity style={styles.changeCoverBtn} onPress={handlePickCover}>
                <Text style={styles.changeCoverText}>Changer la photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadPlaceholder} onPress={handlePickCover} activeOpacity={0.8}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadTitle}>Sélectionner une photo depuis la galerie</Text>
              <Text style={styles.uploadSub}>Format recommandé : 16:9 paysage haute définition</Text>
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
      </ScrollView>
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
  headerTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
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
  changeCoverBtn: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(2, 5, 18, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  changeCoverText: {
    color: '#00d2ff',
    fontSize: 11,
    fontWeight: '700',
  },
});
