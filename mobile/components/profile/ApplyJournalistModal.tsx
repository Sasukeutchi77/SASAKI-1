import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AppIcon } from '../AppIcon';

interface ApplyJournalistModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: {
    category?: 'journalist' | 'citizen' | 'media';
    mediaName: string;
    pressCardNumber: string;
    motivation: string;
    documentUrl: string;
  }) => Promise<void>;
}

export const ApplyJournalistModal: React.FC<ApplyJournalistModalProps> = ({
  visible,
  onClose,
  onSubmit,
}) => {
  const [category, setCategory] = useState<'journalist' | 'citizen'>('journalist');
  const [mediaName, setMediaName] = useState('');
  const [pressCardNumber, setPressCardNumber] = useState('');
  const [motivation, setMotivation] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isCitizen = category === 'citizen';

  const handleSubmit = async () => {
    if (!motivation.trim() || motivation.trim().length < 15) {
      Alert.alert(
        'Motivation requise',
        'Veuillez détailler vos thématiques et motivations déontologiques (minimum 15 caractères).'
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        category,
        mediaName: mediaName.trim() || (isCitizen ? 'Citoyen Indépendant' : 'Média Indépendant'),
        pressCardNumber: pressCardNumber.trim() || (isCitizen ? 'Vérification d’Identité Citoyenne' : 'Candidat Journaliste / Enquêteur'),
        motivation: motivation.trim(),
        documentUrl: documentUrl.trim(),
      });
      setMediaName('');
      setPressCardNumber('');
      setMotivation('');
      setDocumentUrl('');
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de transmettre la candidature.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>
                {isCitizen ? 'Certification Citoyen Vérifié' : 'Accréditation Journaliste Titulaire'}
              </Text>
              <Text style={styles.sub}>
                {isCitizen ? 'Badge officiel d’identité citoyenne' : 'Accréditation de presse & publication d’articles'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <AppIcon name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
            {/* Sélecteur de type de certification */}
            <View style={{ marginBottom: 14 }}>
              <Text style={styles.label}>Type de certification demandée :</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: category === 'journalist' ? 'rgba(6, 182, 212, 0.15)' : '#020512',
                    borderWidth: 1,
                    borderColor: category === 'journalist' ? '#06b6d4' : '#1e293b',
                    alignItems: 'center',
                  }}
                  onPress={() => setCategory('journalist')}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: category === 'journalist' ? '#06b6d4' : '#94a3b8', fontSize: 11, fontWeight: '800' }}>
                    ✍️ Presse / Journaliste
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 9, marginTop: 2, textAlign: 'center' }}>
                    Badge Bleu • Publier des articles
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: category === 'citizen' ? 'rgba(16, 185, 129, 0.15)' : '#020512',
                    borderWidth: 1,
                    borderColor: category === 'citizen' ? '#10b981' : '#1e293b',
                    alignItems: 'center',
                  }}
                  onPress={() => setCategory('citizen')}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: category === 'citizen' ? '#10b981' : '#94a3b8', fontSize: 11, fontWeight: '800' }}>
                    🛡️ Citoyen Vérifié
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 9, marginTop: 2, textAlign: 'center' }}>
                    Badge Vert • Scrutins & Débats
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {!isCitizen && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Média ou Collectif d’appartenance</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Le Canard Libre, Radio Citoyenne, Indépendant"
                  placeholderTextColor="#64748b"
                  value={mediaName}
                  onChangeText={setMediaName}
                />
              </View>
            )}

            {!isCitizen && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Numéro Carte de Presse ou Référence d’enquête</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: CP-78493 ou Enquêteur Citoyen"
                  placeholderTextColor="#64748b"
                  value={pressCardNumber}
                  onChangeText={setPressCardNumber}
                />
              </View>
            )}

            {isCitizen && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Titre ou Statut Civique (optionnel)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Débatteur Actif, Juriste, Acteur Local, Étudiant"
                  placeholderTextColor="#64748b"
                  value={mediaName}
                  onChangeText={setMediaName}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isCitizen ? 'Motivation & Démarche d’authenticité *' : 'Motivation & Thématiques d’investigation *'}
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder={
                  isCitizen
                    ? 'Expliquez votre souhait d’authentifier votre profil citoyen, vos centres d’intérêt civiques et votre engagement pour des débats constructifs...'
                    : 'Expliquez vos sujets d’enquête, votre méthode de vérification des faits et votre engagement déontologique...'
                }
                placeholderTextColor="#64748b"
                value={motivation}
                onChangeText={setMotivation}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {isCitizen ? 'Lien vers document d’identité / justificatif (optionnel)' : 'Lien vers portfolio / articles (optionnel)'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder="https://mon-portfolio.fr ou lien document"
                placeholderTextColor="#64748b"
                value={documentUrl}
                onChangeText={setDocumentUrl}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.ethicsNotice}>
              <AppIcon name="shield-checkmark" size={14} color="#06b6d4" style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={styles.ethicsText}>
                {isCitizen
                  ? 'La certification citoyenne confère le badge officiel attestant de l’authenticité de votre compte contre les faux profils et l’usurpation.'
                  : 'En postulant, vous vous engagez à respecter la charte de vérité factuelle et d’indépendance journalistique de PURGE.'}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>Annuler</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, submitting && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Transmettre le dossier</Text>
              )}
            </TouchableOpacity>
          </View>
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
    backgroundColor: '#070d1e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
  },
  sub: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scroll: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    color: '#ffffff',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textArea: {
    minHeight: 90,
  },
  ethicsNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  ethicsText: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0b1329',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#06b6d4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  disabledBtn: {
    opacity: 0.5,
  },
});
