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
import { User, isJournalistRole, isAdminRole, VerificationRequest, MediaHouse, Article } from '../types';
import { api } from '../services/api';
import { uploadPickedImageToCloudinary } from '../services/imagePicker';
import {
  requestNotificationPermission,
  areNotificationsEnabled,
} from '../services/notifications';
import { EditProfileModal } from '../components/EditProfileModal';
import { CreateHouseModal } from '../components/CreateHouseModal';
import { ImageSelectModal } from '../components/ImageSelectModal';
import { JournalistHouseSection } from '../components/JournalistHouseSection';
import { MediaHouseDetailModal } from '../components/MediaHouseDetailModal';
import { AppIcon } from '../components/AppIcon';

// Sous-composants modulaires du profil
import { ProfileHeaderCard } from '../components/profile/ProfileHeaderCard';
import { ProfileSegmentedTabs, ProfileTabKey } from '../components/profile/ProfileSegmentedTabs';
import { CitizenDashboardSection } from '../components/profile/CitizenDashboardSection';
import { PressAccreditationSection } from '../components/profile/PressAccreditationSection';
import { ProfileSecuritySection } from '../components/profile/ProfileSecuritySection';
import { ApplyJournalistModal } from '../components/profile/ApplyJournalistModal';
import { PasswordResetModal } from '../components/profile/PasswordResetModal';

interface ProfileScreenProps {
  currentUser: User | null;
  onUserUpdated: (user: User | null) => void;
  onOpenCreateArticle?: (houseId?: string, houseName?: string) => void;
  onOpenNotifications?: () => void;
  onSelectArticle?: (article: Article) => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  onUserUpdated,
  onOpenCreateArticle,
  onOpenNotifications,
  onSelectArticle,
}) => {
  // Navigation par onglets dans le profil
  const [profileTab, setProfileTab] = useState<ProfileTabKey>('activity');

  // Authentification (non connecté)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notificationsActive, setNotificationsActive] = useState<boolean>(false);

  // Modals profil & médias
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [showCreateHouseModal, setShowCreateHouseModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedHouseForDetail, setSelectedHouseForDetail] = useState<MediaHouse | null>(null);

  // Modal candidature journaliste
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Modal réinitialisation mot de passe
  const [showPasswordResetModal, setShowPasswordResetModal] = useState(false);

  // Administration des demandes
  const [adminRequests, setAdminRequests] = useState<VerificationRequest[]>([]);
  const [loadingAdminRequests, setLoadingAdminRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [refreshingStatus, setRefreshingStatus] = useState(false);

  useEffect(() => {
    checkNotifStatus();
  }, []);

  useEffect(() => {
    if (currentUser && isAdminRole(currentUser.role)) {
      loadAdminRequests();
    }
  }, [currentUser?.role]);

  const checkNotifStatus = async () => {
    const enabled = await areNotificationsEnabled();
    setNotificationsActive(enabled);
  };

  const loadAdminRequests = async () => {
    if (!currentUser || !isAdminRole(currentUser.role)) return;
    setLoadingAdminRequests(true);
    try {
      const res = await api.getVerificationRequests('pending');
      setAdminRequests(res.requests || []);
    } catch (err) {
      console.warn('[ProfileScreen] Erreur chargement demandes:', err);
    } finally {
      setLoadingAdminRequests(false);
    }
  };

  const handleAuthSubmit = async () => {
    setErrorMessage(null);

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Veuillez renseigner votre adresse email et votre mot de passe.');
      return;
    }

    if (authMode === 'register' && !name.trim()) {
      setErrorMessage('Veuillez renseigner votre nom complet ou pseudonyme.');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'login') {
        const res = await api.login({ email: cleanEmail, password: cleanPassword });
        if (res && res.user) {
          onUserUpdated(res.user);
          Alert.alert('Connexion réussie', `Bienvenue de retour, ${res.user.name} !`);
        } else {
          throw new Error('Identifiants incorrects ou compte introuvable.');
        }
      } else {
        const res = await api.register({
          name: name.trim(),
          email: cleanEmail,
          password: cleanPassword,
        });
        if (res && res.user) {
          onUserUpdated(res.user);
          Alert.alert(
            'Compte citoyen créé',
            `Bienvenue sur PURGE, ${res.user.name} ! Votre compte Citoyen est actif.`
          );
        } else {
          throw new Error('Échec de la création du compte.');
        }
      }
    } catch (err: any) {
      const msg = err.message || "Échec de l'opération d'authentification.";
      setErrorMessage(msg);
      Alert.alert(authMode === 'login' ? 'Erreur de connexion' : 'Erreur d’inscription', msg);
    } finally {
      setLoading(false);
    }
  };

  // Raccourcis de connexion rapide pour démonstration
  const handleSelectPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setAuthMode('login');
  };

  // Soumission de la demande d'accréditation Journaliste par un Citoyen
  const handleApplySubmit = async (data: {
    mediaName: string;
    pressCardNumber: string;
    motivation: string;
    documentUrl: string;
  }) => {
    if (!currentUser) return;
    await api.requestVerification(data);
    const updatedUser: User = {
      ...currentUser,
      verificationStatus: 'pending',
    };
    onUserUpdated(updatedUser);
    Alert.alert(
      'Demande transmise',
      'Votre candidature au statut Journaliste a été enregistrée avec succès. Les administrateurs examineront votre dossier sous peu.'
    );
  };

  // Décision administrative sur une demande (Approuver / Rejeter)
  const handleReviewRequest = (reqId: string, applicantName: string | undefined, decision: 'approved' | 'rejected') => {
    const nameStr = applicantName || 'ce candidat';
    Alert.alert(
      decision === 'approved' ? 'Valider l’accréditation' : 'Refuser la demande',
      decision === 'approved'
        ? `Confirmez-vous l'attribution du statut Journaliste Officiel à "${nameStr}" ?`
        : `Voulez-vous refuser la demande d'accréditation de "${nameStr}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: decision === 'approved' ? 'Valider' : 'Refuser',
          style: decision === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            setProcessingRequestId(reqId);
            try {
              await api.reviewVerificationRequest(reqId, decision);
              Alert.alert(
                'Opération confirmée',
                decision === 'approved'
                  ? `"${nameStr}" est désormais Journaliste agréé avec badge officiel.`
                  : `La demande de "${nameStr}" a été refusée.`
              );
              await loadAdminRequests();
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Échec du traitement administratif.');
            } finally {
              setProcessingRequestId(null);
            }
          },
        },
      ]
    );
  };

  // Synchronisation du profil pour vérifier le statut de candidature
  const handleRefreshStatus = async () => {
    setRefreshingStatus(true);
    try {
      const res = await api.getMe();
      if (res && res.user) {
        onUserUpdated(res.user);
        if (isJournalistRole(res.user.role)) {
          Alert.alert('Accréditation validée !', 'Félicitations ! Les administrateurs ont approuvé votre statut Journaliste. Vous pouvez désormais publier des enquêtes.');
        } else if (res.user.verificationStatus === 'rejected') {
          Alert.alert('Statut', 'Votre précédente demande n’a pas été retenue par l’administration.');
        } else if (res.user.verificationStatus === 'pending') {
          Alert.alert('Examen en cours', 'Votre dossier est toujours en cours d’évaluation par la Rédaction en Chef.');
        } else {
          Alert.alert('Statut Citoyen', 'Vous êtes enregistré en tant que Citoyen Débattant.');
        }
      }
    } catch {
      Alert.alert('Information', 'Impossible de rafraîchir le statut. Vérifiez votre connexion.');
    } finally {
      setRefreshingStatus(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter de votre compte PURGE ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Déconnexion',
        style: 'destructive',
        onPress: async () => {
          await api.clearSession();
          onUserUpdated(null);
        },
      },
    ]);
  };

  const handleSelectAvatar = async (result: { url?: string; pickedResult?: any }) => {
    try {
      setUpdatingAvatar(true);
      let finalUrl = result.url;
      if (result.pickedResult) {
        const uploaded = await uploadPickedImageToCloudinary(result.pickedResult, 'avatar');
        finalUrl = uploaded.url;
      }
      if (finalUrl) {
        const updated = await api.updateProfile({ avatar: finalUrl });
        onUserUpdated(updated.user);
        Alert.alert('Photo mise à jour', 'Votre photo de profil a été mise à jour avec succès !');
      }
    } catch (err: any) {
      Alert.alert('Erreur photo', err.message || 'Impossible de mettre à jour la photo de profil.');
    } finally {
      setUpdatingAvatar(false);
      setShowAvatarModal(false);
    }
  };

  const handleToggleNotifications = async () => {
    try {
      const granted = await requestNotificationPermission();
      setNotificationsActive(granted);

      if (granted) {
        Alert.alert(
          'Notifications activées',
          'Vous recevrez en direct les dépêches urgentes, les décrets officiels et les révélations certifiées.'
        );
      } else {
        Alert.alert(
          'Autorisation requise',
          'Veuillez activer les notifications dans les paramètres de votre appareil.'
        );
      }
    } catch (err: any) {
      console.warn('[ProfileScreen] Erreur permissions notifications:', err);
    }
  };

  // ==========================================
  // VUE 1 : UTILISATEUR NON CONNECTÉ
  // ==========================================
  if (!currentUser) {
    return (
      <ScrollView contentContainerStyle={styles.scrollAuth} keyboardShouldPersistTaps="handled">
        <View style={styles.authCard}>
          <Image source={require('../assets/icon.png')} style={styles.authLogo} resizeMode="contain" />
          <Text style={styles.authBrand}>PURGE • ARÈNE CIVIQUE</Text>
          <Text style={styles.authTitle}>ESPACE CITOYEN & JOURNALISTE</Text>
          <Text style={styles.authSub}>
            Accédez aux enquêtes vérifiées, participez aux scrutins et suivez vos rédacteurs favoris.
          </Text>

          {/* Onglets Connexion / Inscription */}
          <View style={styles.authTabs}>
            <TouchableOpacity
              style={[styles.authTabBtn, authMode === 'login' && styles.activeAuthTabBtn]}
              onPress={() => {
                setAuthMode('login');
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.authTabText, authMode === 'login' && styles.activeAuthTabText]}>
                CONNEXION
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.authTabBtn, authMode === 'register' && styles.activeAuthTabBtn]}
              onPress={() => {
                setAuthMode('register');
                setErrorMessage(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.authTabText, authMode === 'register' && styles.activeAuthTabText]}>
                INSCRIPTION
              </Text>
            </TouchableOpacity>
          </View>

          {/* Message d'erreur */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <AppIcon name="alert-circle" size={14} color="#ef4444" style={{ marginRight: 6 }} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Formulaire */}
          <View style={styles.formGroup}>
            {authMode === 'register' && (
              <View style={styles.inputWrap}>
                <Text style={styles.inputLabel}>Nom complet ou Pseudonyme</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Alexis de Tocqueville"
                  placeholderTextColor="#64748b"
                  value={name}
                  onChangeText={setName}
                />
              </View>
            )}

            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Adresse Email</Text>
              <TextInput
                style={styles.input}
                placeholder="citoyen@purge.info"
                placeholderTextColor="#64748b"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputWrap}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.inputLabel}>Mot de Passe</Text>
                {authMode === 'login' && (
                  <TouchableOpacity onPress={() => setShowPasswordResetModal(true)}>
                    <Text style={styles.forgotPassText}>Oublié ?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.disabledBtn]}
              onPress={handleAuthSubmit}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#000000" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>
                  {authMode === 'login' ? 'SE CONNECTER' : 'CRÉER MON COMPTE CITOYEN'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Raccourcis comptes de test */}
          <View style={styles.presetSection}>
            <Text style={styles.presetTitle}>ACCÈS RAPIDES DE DÉMONSTRATION :</Text>
            <View style={styles.presetGrid}>
              <TouchableOpacity
                style={styles.presetPill}
                onPress={() => handleSelectPreset('citoyen@purge.info', 'citoyen123')}
              >
                <Text style={styles.presetPillText}>👤 Citoyen</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetPill}
                onPress={() => handleSelectPreset('itachi@purge.info', 'journaliste123')}
              >
                <Text style={styles.presetPillText}>✍️ Journaliste</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.presetPill}
                onPress={() => handleSelectPreset('admin@purge.info', 'admin123')}
              >
                <Text style={styles.presetPillText}>🛡️ Admin</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Modal Réinitialisation */}
        <PasswordResetModal
          visible={showPasswordResetModal}
          onClose={() => setShowPasswordResetModal(false)}
          defaultEmail={email}
        />
      </ScrollView>
    );
  }

  // ==========================================
  // VUE 2 : UTILISATEUR CONNECTÉ
  // ==========================================
  const isAdmin = isAdminRole(currentUser.role);
  const isJournalist = isJournalistRole(currentUser.role) || isAdmin;

  return (
    <ScrollView style={styles.scrollMain} contentContainerStyle={styles.scrollMainContent}>
      {/* 1. CARTE EN-TÊTE PROFIL */}
      <ProfileHeaderCard
        currentUser={currentUser}
        onOpenEditProfile={() => setShowEditProfileModal(true)}
        onOpenAvatarPicker={() => setShowAvatarModal(true)}
        updatingAvatar={updatingAvatar}
      />

      {/* 2. ONGLETS DE NAVIGATION DANS LE PROFIL */}
      <ProfileSegmentedTabs
        activeTab={profileTab}
        onChangeTab={setProfileTab}
        pendingRequestsCount={isAdmin ? adminRequests.length : 0}
      />

      {/* 3. CONTENU SELON L'ONGLET ACTIF */}
      {profileTab === 'activity' && (
        <CitizenDashboardSection
          currentUser={currentUser}
          onSelectArticle={onSelectArticle}
        />
      )}

      {profileTab === 'press' && (
        <View style={{ gap: 16 }}>
          {/* Carte officielle / Candidature & Centre d'administration */}
          <PressAccreditationSection
            currentUser={currentUser}
            isAdmin={isAdmin}
            isJournalist={isJournalist}
            adminRequests={adminRequests}
            loadingRequests={loadingAdminRequests}
            processingRequestId={processingRequestId}
            onRefreshRequests={loadAdminRequests}
            onReviewRequest={handleReviewRequest}
            onOpenApplyModal={() => setShowApplyModal(true)}
            onOpenCreateArticle={onOpenCreateArticle}
            onOpenCreateHouse={() => setShowCreateHouseModal(true)}
            onRefreshProfileStatus={handleRefreshStatus}
            refreshingStatus={refreshingStatus}
          />

          {/* Section Maison de Presse */}
          <JournalistHouseSection
            currentUser={currentUser}
            onOpenCreateArticleForHouse={(houseId, houseName) => {
              if (onOpenCreateArticle) {
                onOpenCreateArticle(houseId, houseName);
              }
            }}
            onOpenHouseModal={(h) => setSelectedHouseForDetail(h)}
            onSelectArticle={onSelectArticle}
            onCreateHouse={() => setShowCreateHouseModal(true)}
            onUserUpdated={onUserUpdated}
          />
        </View>
      )}

      {profileTab === 'security' && (
        <ProfileSecuritySection
          currentUser={currentUser}
          notificationsActive={notificationsActive}
          onToggleNotifications={handleToggleNotifications}
          onOpenPasswordReset={() => setShowPasswordResetModal(true)}
          onLogout={handleLogout}
        />
      )}

      {/* ========================================== */}
      {/* MODALES D'INTERACTION */}
      {/* ========================================== */}

      {/* 1. Modification du Profil */}
      <EditProfileModal
        visible={showEditProfileModal}
        currentUser={currentUser}
        onClose={() => setShowEditProfileModal(false)}
        onUserUpdated={(updatedUser: User) => {
          onUserUpdated(updatedUser);
          setShowEditProfileModal(false);
          Alert.alert('Profil mis à jour', 'Vos informations ont été enregistrées.');
        }}
      />

      {/* 2. Sélection / Upload Photo de Profil */}
      <ImageSelectModal
        visible={showAvatarModal}
        title="Changer ma photo de profil"
        mode="avatar"
        currentImageUrl={currentUser.avatar}
        onClose={() => setShowAvatarModal(false)}
        onSelectImage={handleSelectAvatar}
      />

      {/* 3. Fondation d'une Maison de Presse */}
      <CreateHouseModal
        visible={showCreateHouseModal}
        currentUser={currentUser}
        onClose={() => setShowCreateHouseModal(false)}
        onSuccess={(newHouse: MediaHouse) => {
          setShowCreateHouseModal(false);
          const updatedUser: User = {
            ...currentUser,
            mediaId: newHouse.id,
            mediaName: newHouse.name,
            mediaHouseRole: 'Chef de Rédaction',
            role: currentUser.role === 'admin' ? 'admin' : 'journalist',
            isVerified: true,
          };
          onUserUpdated(updatedUser);
          Alert.alert('Félicitations', `Vous avez fondé la maison de presse « ${newHouse.name} ».`);
        }}
      />

      {/* 4. Détail d'une Maison de Presse */}
      <MediaHouseDetailModal
        visible={Boolean(selectedHouseForDetail)}
        house={selectedHouseForDetail}
        currentUser={currentUser}
        onClose={() => setSelectedHouseForDetail(null)}
        onSelectArticle={(art) => {
          setSelectedHouseForDetail(null);
          if (onSelectArticle) onSelectArticle(art);
        }}
      />

      {/* 5. Candidature Journaliste */}
      <ApplyJournalistModal
        visible={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        onSubmit={handleApplySubmit}
      />

      {/* 6. Réinitialisation / Changement de Mot de Passe */}
      <PasswordResetModal
        visible={showPasswordResetModal}
        onClose={() => setShowPasswordResetModal(false)}
        defaultEmail={currentUser.email}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollAuth: {
    padding: 16,
    paddingTop: 24,
    backgroundColor: '#020512',
    minHeight: '100%',
  },
  authCard: {
    backgroundColor: '#070d1e',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    alignItems: 'center',
  },
  authLogo: {
    width: 60,
    height: 60,
    marginBottom: 12,
  },
  authBrand: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 4,
  },
  authTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  authSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  authTabs: {
    flexDirection: 'row',
    backgroundColor: '#020512',
    borderRadius: 10,
    padding: 3,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeAuthTabBtn: {
    backgroundColor: '#06b6d4',
  },
  authTabText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeAuthTabText: {
    color: '#000000',
    fontWeight: '900',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 11,
    flex: 1,
  },
  formGroup: {
    width: '100%',
    gap: 12,
  },
  inputWrap: {
    gap: 6,
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '800',
  },
  forgotPassText: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: '700',
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
  submitBtn: {
    backgroundColor: '#06b6d4',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  presetSection: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  presetTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  presetGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  presetPill: {
    backgroundColor: '#0b1329',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  presetPillText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  scrollMain: {
    flex: 1,
    backgroundColor: '#020512',
  },
  scrollMainContent: {
    padding: 16,
    paddingBottom: 40,
  },
});
