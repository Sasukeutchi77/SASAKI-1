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
import { User, isJournalistRole, isAdminRole, VerificationRequest } from '../types';
import { api } from '../services/api';
import { pickImageFromGallery, uploadPickedImageToCloudinary } from '../services/imagePicker';
import {
  triggerLocalNotification,
  requestNotificationPermission,
  areNotificationsEnabled,
} from '../services/notifications';

interface ProfileScreenProps {
  currentUser: User | null;
  onUserUpdated: (user: User | null) => void;
  onOpenCreateArticle?: () => void;
  onOpenNotifications?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  onUserUpdated,
  onOpenCreateArticle,
  onOpenNotifications,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [notificationsActive, setNotificationsActive] = useState<boolean>(false);

  // État du formulaire de candidature journaliste (Citoyen -> Journaliste)
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyMediaName, setApplyMediaName] = useState('');
  const [applyPressCard, setApplyPressCard] = useState('');
  const [applyMotivation, setApplyMotivation] = useState('');
  const [applyPortfolioUrl, setApplyPortfolioUrl] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);

  // État de gestion administrative des demandes (Réservé aux Administrateurs)
  const [adminRequests, setAdminRequests] = useState<VerificationRequest[]>([]);
  const [loadingAdminRequests, setLoadingAdminRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);

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
    setSuccessMessage(null);

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
        // Enregistrement strictement Citoyen par défaut
        const res = await api.register({
          name: name.trim(),
          email: cleanEmail,
          password: cleanPassword,
        });
        if (res && res.user) {
          onUserUpdated(res.user);
          Alert.alert(
            'Compte citoyen créé avec succès',
            `Bienvenue sur PURGE, ${res.user.name} !\n\nVotre compte Citoyen est actif. Pour devenir Journaliste accrédité et publier des enquêtes, vous pourrez soumettre votre demande depuis votre profil pour validation par l'administration.`
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

  // Soumission de la demande d'accréditation Journaliste par un Citoyen
  const handleApplySubmit = async () => {
    if (!currentUser) return;
    if (!applyMotivation.trim() || applyMotivation.trim().length < 15) {
      Alert.alert(
        'Motivation requise',
        'Veuillez détailler vos thématiques d’investigation et votre motivation (minimum 15 caractères).'
      );
      return;
    }

    setSubmittingApply(true);
    try {
      await api.requestVerification({
        mediaName: applyMediaName.trim() || 'Média Indépendant',
        pressCardNumber: applyPressCard.trim() || 'Candidat Citoyen / Enquêteur',
        motivation: applyMotivation.trim(),
        documentUrl: applyPortfolioUrl.trim() || undefined,
      });

      const updatedUser: User = {
        ...currentUser,
        verificationStatus: 'pending',
      };
      onUserUpdated(updatedUser);
      setShowApplyModal(false);
      setApplyMediaName('');
      setApplyPressCard('');
      setApplyMotivation('');
      setApplyPortfolioUrl('');

      Alert.alert(
        'Demande transmise',
        'Votre candidature au statut Journaliste a été enregistrée avec succès. Les administrateurs de PURGE examineront votre dossier sous peu.'
      );
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d’envoyer la demande.');
    } finally {
      setSubmittingApply(false);
    }
  };

  // Décision administrative sur une demande (Réservé aux Admins)
  const handleReviewRequest = (reqId: string, applicantName: string, decision: 'approved' | 'rejected') => {
    Alert.alert(
      decision === 'approved' ? 'Valider l’accréditation' : 'Refuser la demande',
      decision === 'approved'
        ? `Confirmez-vous l'attribution du statut Journaliste Officiel à "${applicantName}" ?`
        : `Voulez-vous refuser la demande d'accréditation de "${applicantName}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: decision === 'approved' ? 'Valider ✓' : 'Refuser ✕',
          style: decision === 'approved' ? 'default' : 'destructive',
          onPress: async () => {
            setProcessingRequestId(reqId);
            try {
              await api.reviewVerificationRequest(reqId, decision);
              Alert.alert(
                'Opération confirmée',
                decision === 'approved'
                  ? `"${applicantName}" est désormais Journaliste agréé avec badge de vérification.`
                  : `La demande de "${applicantName}" a été refusée.`
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

  // Synchronisation du profil pour un citoyen vérifiant son statut
  const handleRefreshStatus = async () => {
    setLoading(true);
    try {
      const res = await api.getMe();
      if (res && res.user) {
        onUserUpdated(res.user);
        if (isJournalistRole(res.user.role)) {
          Alert.alert('🎉 Accréditation validée !', 'Félicitations ! Les administrateurs ont approuvé votre statut Journaliste. Vous pouvez désormais publier des enquêtes.');
        } else if (res.user.verificationStatus === 'rejected') {
          Alert.alert('Statut', 'Votre précédente demande n’a pas été retenue par l’administration.');
        } else if (res.user.verificationStatus === 'pending') {
          Alert.alert('Examen en cours', 'Votre dossier est toujours entre les mains de la Rédaction en Chef.');
        } else {
          Alert.alert('Statut Citoyen', 'Vous êtes enregistré en tant que Citoyen Débattant.');
        }
      }
    } catch {
      Alert.alert('Information', 'Impossible de rafraîchir le statut. Vérifiez votre connexion.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string, demoPass: string, demoName?: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    if (demoName) setName(demoName);
    setErrorMessage(null);
  };

  const handleLogout = async () => {
    Alert.alert('Déconnexion', 'Voulez-vous vraiment vous déconnecter de PURGE ?', [
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

  const handleChangeAvatar = async () => {
    try {
      const picked = await pickImageFromGallery([1, 1]);
      if (!picked) return;

      setUpdatingAvatar(true);
      const uploaded = await uploadPickedImageToCloudinary(picked, 'avatar');
      const updated = await api.updateProfile({ avatar: uploaded.url });
      onUserUpdated(updated.user);
      Alert.alert('Succès', 'Votre photo de profil a été mise à jour.');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de mettre à jour la photo.');
    } finally {
      setUpdatingAvatar(false);
    }
  };

  const handleTestNotification = async () => {
    try {
      const granted = await requestNotificationPermission();
      setNotificationsActive(granted);

      if (!granted) {
        Alert.alert(
          'Autorisation requise',
          'Veuillez activer les notifications dans les paramètres Android de l’application pour recevoir les alertes.'
        );
        return;
      }

      await triggerLocalNotification({
        title: '🚨 DÉPÊCHE OFFICIELLE • PURGE',
        body: 'Le système de notifications est actif et certifié sur cet appareil.',
        data: { origin: 'profile_test' },
      });
      Alert.alert('Notification envoyée', 'Une alerte a été émise sur votre barre de statut Android.');
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d’émettre la notification.');
    }
  };

  // VUE NON CONNECTÉ : Formulaire d'authentification robuste
  if (!currentUser) {
    return (
      <ScrollView contentContainerStyle={styles.scrollAuth} keyboardShouldPersistTaps="handled">
        <View style={styles.authCard}>
          <Image source={require('../assets/icon.png')} style={styles.authLogo} resizeMode="contain" />
          <Text style={styles.authBrand}>PURGE • RÉSEAU OFFICIEL</Text>
          <Text style={styles.authTitle}>ESPACE CITOYEN & JOURNALISTE</Text>
          <Text style={styles.authSub}>
            Accédez aux dépêches exclusives, participez aux débats certifiés et suivez vos rédacteurs favoris.
          </Text>

          {/* Badge Cloud Direct */}
          <View style={styles.cloudBadge}>
            <View style={styles.cloudDot} />
            <Text style={styles.cloudBadgeText}>Connexion Sécurisée Firebase Directe</Text>
          </View>

          {/* Onglets Connexion / Inscription */}
          <View style={styles.authTabs}>
            <TouchableOpacity
              style={[styles.authTabBtn, authMode === 'login' && styles.activeAuthTabBtn]}
              onPress={() => {
                setAuthMode('login');
                setErrorMessage(null);
              }}
              activeOpacity={0.7}
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
              activeOpacity={0.7}
            >
              <Text style={[styles.authTabText, authMode === 'register' && styles.activeAuthTabText]}>
                INSCRIPTION
              </Text>
            </TouchableOpacity>
          </View>

          {/* Message d'erreur visible */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Formulaire Inscription : Nom */}
          {authMode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom complet ou Pseudonyme</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Marcus Vance"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          )}

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Adresse Email</Text>
            <TextInput
              style={styles.input}
              placeholder="citoyen@purge.info"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Mot de passe */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mot de passe (6 caractères min.)</Text>
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

          {/* Règle PURGE : Inscription citoyenne sécurisée */}
          {authMode === 'register' && (
            <View style={styles.citizenNoticeCard}>
              <View style={styles.citizenNoticeHeader}>
                <Text style={styles.citizenNoticeIcon}>🛡️</Text>
                <Text style={styles.citizenNoticeTitle}>Statut Citoyen Garanti</Text>
              </View>
              <Text style={styles.citizenNoticeText}>
                Toute inscription s'effectue sous le statut Citoyen. L'accès Journaliste s'obtient sur candidature motivée et après validation par les Administrateurs.
              </Text>
            </View>
          )}

          {/* Bouton de validation */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.disabledBtn]}
            onPress={handleAuthSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {authMode === 'login' ? 'SE CONNECTER' : 'CRÉER MON COMPTE'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Raccourcis de test immédiat */}
          <View style={styles.quickAccessSection}>
            <Text style={styles.quickAccessLabel}>Accès rapide pour essai :</Text>
            <View style={styles.quickBtnRow}>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => handleQuickFill('naruto455t@gmail.com', 'admin123', 'Naruto Uzumaki')}
                activeOpacity={0.7}
              >
                <Text style={styles.quickBtnText}>👑 Démo Admin</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => handleQuickFill('citoyen.direct@purge.info', 'citoyen2026', 'Citoyen Engagé')}
                activeOpacity={0.7}
              >
                <Text style={styles.quickBtnText}>👤 Démo Citoyen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bloc Notifications pour les non connectés */}
        <View style={styles.notifPromptCard}>
          <View style={styles.notifPromptHeader}>
            <Text style={styles.notifPromptTitle}>🔔 Système de Notifications</Text>
            <View
              style={[
                styles.notifStatusPill,
                { backgroundColor: notificationsActive ? '#10b981' : '#f59e0b' },
              ]}
            >
              <Text style={styles.notifStatusPillText}>
                {notificationsActive ? 'Actif' : 'En attente'}
              </Text>
            </View>
          </View>
          <Text style={styles.notifPromptSub}>
            Recevez instantanément les alertes des décrets officiels et dépêches d’urgence.
          </Text>
          <TouchableOpacity
            style={styles.testNotifBtn}
            onPress={handleTestNotification}
            activeOpacity={0.8}
          >
            <Text style={styles.testNotifBtnText}>TESTER UNE NOTIFICATION ANDROID</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // VUE CONNECTÉ
  const isJournalist = isJournalistRole(currentUser.role);
  const isAdmin = isAdminRole(currentUser.role);

  return (
    <ScrollView contentContainerStyle={styles.scrollProfile}>
      {/* Carte Profil */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeaderRow}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleChangeAvatar}
            disabled={updatingAvatar}
            activeOpacity={0.8}
          >
            {currentUser.avatar ? (
              <Image source={{ uri: currentUser.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <View style={styles.cameraIconBadge}>
              <Text style={styles.cameraIconText}>📷</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.nameSection}>
            <View style={styles.titleRow}>
              <Text style={styles.userName}>{currentUser.name}</Text>
              {currentUser.isVerified && <Text style={styles.verified}> ✓</Text>}
            </View>
            <Text style={styles.userEmail}>{currentUser.email}</Text>

            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {isAdmin
                  ? 'ADMINISTRATEUR PURGE'
                  : isJournalist
                  ? 'JOURNALISTE AGRÉÉ'
                  : 'CITOYEN DÉBATTANT'}
              </Text>
            </View>
          </View>
        </View>

        {updatingAvatar && (
          <View style={styles.avatarLoadingRow}>
            <ActivityIndicator size="small" color="#06b6d4" />
            <Text style={styles.avatarLoadingText}>Téléversement de la photo...</Text>
          </View>
        )}

        {currentUser.bio ? <Text style={styles.bioText}>{currentUser.bio}</Text> : null}

        {/* Métriques / Statistiques */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{currentUser.articlesCount || 0}</Text>
            <Text style={styles.statLabel}>Enquêtes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{currentUser.followersCount || 0}</Text>
            <Text style={styles.statLabel}>Abonnés</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{currentUser.followingCount || 0}</Text>
            <Text style={styles.statLabel}>Abonnements</Text>
          </View>
        </View>
      </View>

      {/* ESPACE CITOYEN : Candidature au Statut Journaliste */}
      {!isJournalist && !isAdmin && (
        <View style={styles.accreditationCard}>
          <View style={styles.accreditationHeaderRow}>
            <Text style={styles.accreditationTitle}>✍️ Accréditation Journaliste</Text>
            {currentUser.verificationStatus === 'pending' ? (
              <View style={[styles.statusBadgePill, { backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#f59e0b' }]}>
                <Text style={[styles.statusBadgeText, { color: '#f59e0b' }]}>En examen</Text>
              </View>
            ) : currentUser.verificationStatus === 'rejected' ? (
              <View style={[styles.statusBadgePill, { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444' }]}>
                <Text style={[styles.statusBadgeText, { color: '#ef4444' }]}>Refusée</Text>
              </View>
            ) : (
              <View style={[styles.statusBadgePill, { backgroundColor: 'rgba(6, 182, 212, 0.2)', borderColor: '#06b6d4' }]}>
                <Text style={[styles.statusBadgeText, { color: '#06b6d4' }]}>Sur validation</Text>
              </View>
            )}
          </View>

          {currentUser.verificationStatus === 'pending' ? (
            <View>
              <Text style={styles.accreditationDesc}>
                ⏳ Votre dossier d'accréditation Journaliste a bien été transmis aux administrateurs de PURGE. La Rédaction en Chef examine actuellement vos références déontologiques.
              </Text>
              <TouchableOpacity
                style={styles.refreshStatusBtn}
                onPress={handleRefreshStatus}
                activeOpacity={0.8}
              >
                <Text style={styles.refreshStatusBtnText}>🔄 VÉRIFIER SI VALIDÉ PAR L'ADMIN</Text>
              </TouchableOpacity>
            </View>
          ) : currentUser.verificationStatus === 'rejected' ? (
            <View>
              <Text style={styles.accreditationDesc}>
                Votre précédente demande n'a pas été retenue par l'administration. Vous pouvez déposer un dossier mis à jour avec vos liens de publications.
              </Text>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setShowApplyModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.applyBtnText}>📝 DÉPOSER UNE NOUVELLE CANDIDATURE</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={styles.accreditationDesc}>
                Les articles et enquêtes sur PURGE sont réservés aux journalistes accrédités. Pour publier vos enquêtes et recevoir le badge de vérification, transmettez votre candidature aux administrateurs.
              </Text>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={() => setShowApplyModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.applyBtnText}>POSTULER AU STATUT JOURNALISTE</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* ESPACE ADMINISTRATEUR : Validation des Demandes d'Accréditation */}
      {isAdmin && (
        <View style={styles.adminReviewCard}>
          <View style={styles.adminReviewHeaderRow}>
            <View style={styles.adminTitleCol}>
              <Text style={styles.adminReviewTitle}>🛡️ Gestion des Accréditations</Text>
              <Text style={styles.adminReviewSub}>
                Validation des candidatures journalistes ({adminRequests.length} en attente)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.adminRefreshBtn}
              onPress={loadAdminRequests}
              disabled={loadingAdminRequests}
              activeOpacity={0.7}
            >
              {loadingAdminRequests ? (
                <ActivityIndicator size="small" color="#06b6d4" />
              ) : (
                <Text style={styles.adminRefreshBtnText}>🔄 Actualiser</Text>
              )}
            </TouchableOpacity>
          </View>

          {adminRequests.length === 0 ? (
            <View style={styles.adminEmptyState}>
              <Text style={styles.adminEmptyStateText}>
                ✓ Aucune demande d'accréditation en attente.
              </Text>
              <Text style={styles.adminEmptyStateSub}>
                Les nouvelles demandes soumises par les citoyens apparaîtront ici pour décision.
              </Text>
            </View>
          ) : (
            adminRequests.map((req) => (
              <View key={req.id} style={styles.requestItemCard}>
                <View style={styles.requestItemHeader}>
                  <View style={styles.requestApplicantCol}>
                    <Text style={styles.requestApplicantName}>{req.userName || 'Candidat'}</Text>
                    <Text style={styles.requestApplicantEmail}>{req.userEmail}</Text>
                  </View>
                  <View style={styles.requestDateBadge}>
                    <Text style={styles.requestDateText}>
                      {new Date(req.createdAt).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestDetailsBox}>
                  <Text style={styles.requestDetailRow}>
                    <Text style={styles.requestDetailLabel}>Média : </Text>
                    <Text style={styles.requestDetailValue}>{req.mediaName || 'Non spécifié'}</Text>
                  </Text>
                  <Text style={styles.requestDetailRow}>
                    <Text style={styles.requestDetailLabel}>Référence / CP : </Text>
                    <Text style={styles.requestDetailValue}>{req.pressCardNumber || 'Citoyen d’investigation'}</Text>
                  </Text>
                  <Text style={styles.requestDetailRow}>
                    <Text style={styles.requestDetailLabel}>Motivation : </Text>
                    <Text style={styles.requestDetailValue}>{req.motivation}</Text>
                  </Text>
                  {req.documentUrl ? (
                    <Text style={styles.requestDetailRow}>
                      <Text style={styles.requestDetailLabel}>Lien : </Text>
                      <Text style={styles.requestLinkValue}>{req.documentUrl}</Text>
                    </Text>
                  ) : null}
                </View>

                <View style={styles.requestActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.rejectActionBtn,
                      processingRequestId === req.id && styles.disabledBtn,
                    ]}
                    onPress={() => handleReviewRequest(req.id, req.userName, 'rejected')}
                    disabled={processingRequestId === req.id}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.rejectActionBtnText}>✕ Refuser</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.approveActionBtn,
                      processingRequestId === req.id && styles.disabledBtn,
                    ]}
                    onPress={() => handleReviewRequest(req.id, req.userName, 'approved')}
                    disabled={processingRequestId === req.id}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.approveActionBtnText}>✓ Valider Journaliste</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* Carte Configuration Notifications Système */}
      <View style={styles.settingsCard}>
        <View style={styles.settingsHeaderRow}>
          <Text style={styles.settingsTitle}>🔔 Alertes & Notifications</Text>
          <View
            style={[
              styles.notifStatusPill,
              { backgroundColor: notificationsActive ? '#10b981' : '#f59e0b' },
            ]}
          >
            <Text style={styles.notifStatusPillText}>
              {notificationsActive ? 'Autorisé' : 'Désactivé'}
            </Text>
          </View>
        </View>
        <Text style={styles.settingsSub}>
          Alertes prioritaires émises sur votre appareil lors de la publication de décrets d'urgence.
        </Text>
        <View style={styles.settingsActionRow}>
          <TouchableOpacity
            style={styles.testNotifBtn}
            onPress={handleTestNotification}
            activeOpacity={0.8}
          >
            <Text style={styles.testNotifBtnText}>ÉMETTRE UNE NOTIFICATION TEST</Text>
          </TouchableOpacity>
          {onOpenNotifications && (
            <TouchableOpacity
              style={styles.viewNotifsBtn}
              onPress={onOpenNotifications}
              activeOpacity={0.8}
            >
              <Text style={styles.viewNotifsBtnText}>Historique</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Actions de rédaction si journaliste ou admin */}
      {(isJournalist || isAdmin) && onOpenCreateArticle && (
        <TouchableOpacity
          style={styles.createArticleBtn}
          onPress={onOpenCreateArticle}
          activeOpacity={0.8}
        >
          <Text style={styles.createArticleBtnText}>✍️ RÉDIGER UNE NOUVELLE ENQUÊTE</Text>
        </TouchableOpacity>
      )}

      {/* Bouton de Déconnexion */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Text style={styles.logoutBtnText}>SE DÉCONNECTER</Text>
      </TouchableOpacity>

      {/* Modal de Demande d'Accréditation Journaliste */}
      <Modal
        visible={showApplyModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowApplyModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Candidature Journaliste</Text>
                <Text style={styles.modalSub}>Accréditation officielle PURGE</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowApplyModal(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Média ou Collectif d’appartenance</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex: Le Canard Libre, Radio Citoyenne, Indépendant"
                  placeholderTextColor="#64748b"
                  value={applyMediaName}
                  onChangeText={setApplyMediaName}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Numéro Carte de Presse ou Référence d’enquête</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Ex: CP-78493 ou Enquêteur Citoyen"
                  placeholderTextColor="#64748b"
                  value={applyPressCard}
                  onChangeText={setApplyPressCard}
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Motivation & Thématiques d’investigation *</Text>
                <TextInput
                  style={[styles.modalInput, styles.modalTextArea]}
                  placeholder="Expliquez vos sujets d'enquête, votre rigueur méthodologique et pourquoi vous souhaitez publier sur PURGE..."
                  placeholderTextColor="#64748b"
                  value={applyMotivation}
                  onChangeText={setApplyMotivation}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Lien de référence / Portfolio / Article (Optionnel)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="https://..."
                  placeholderTextColor="#64748b"
                  value={applyPortfolioUrl}
                  onChangeText={setApplyPortfolioUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={styles.modalNoticeBox}>
                <Text style={styles.modalNoticeText}>
                  🛡️ Votre demande sera soumise pour validation manuelle aux administrateurs de PURGE. La validation vous attribuera le badge officiel et les droits de rédaction d'enquêtes.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowApplyModal(false)}
                disabled={submittingApply}
              >
                <Text style={styles.modalCancelBtnText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, submittingApply && styles.disabledBtn]}
                onPress={handleApplySubmit}
                disabled={submittingApply}
              >
                {submittingApply ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Transmettre ma demande</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollAuth: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#020512',
    minHeight: '100%',
    justifyContent: 'center',
  },
  authCard: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
  },
  authLogo: {
    width: 48,
    height: 48,
    alignSelf: 'center',
    marginBottom: 8,
  },
  authBrand: {
    color: '#06b6d4',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  authTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  authSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 16,
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#020512',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 12,
    borderWidth: 0.8,
    borderColor: '#1e293b',
  },
  cloudDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  cloudBadgeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  authTabs: {
    flexDirection: 'row',
    backgroundColor: '#020512',
    borderRadius: 8,
    padding: 4,
    marginBottom: 14,
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeAuthTabBtn: {
    backgroundColor: '#0891b2',
  },
  authTabText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeAuthTabText: {
    color: '#ffffff',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: 14,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  accountTypeBtn: {
    flex: 1,
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeAccountTypeBtn: {
    borderColor: '#06b6d4',
    backgroundColor: '#0c1a38',
  },
  accountTypeText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  activeAccountTypeText: {
    color: '#06b6d4',
  },
  submitBtn: {
    backgroundColor: '#0891b2',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  quickAccessSection: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 12,
  },
  quickAccessLabel: {
    color: '#64748b',
    fontSize: 11,
    marginBottom: 8,
  },
  quickBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#0b1329',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  quickBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  notifPromptCard: {
    backgroundColor: '#070d1e',
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  notifPromptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notifPromptTitle: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  notifPromptSub: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  notifStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  notifStatusPillText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  testNotifBtn: {
    backgroundColor: '#0284c7',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  testNotifBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scrollProfile: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#020512',
  },
  profileCard: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#06b6d4',
  },
  avatarPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0b1329',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#06b6d4',
  },
  avatarInitial: {
    color: '#06b6d4',
    fontSize: 26,
    fontWeight: '900',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#0891b2',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIconText: {
    fontSize: 11,
  },
  nameSection: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
  },
  verified: {
    color: '#06b6d4',
    fontSize: 15,
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    borderWidth: 0.8,
    borderColor: '#06b6d4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleBadgeText: {
    color: '#06b6d4',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  avatarLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  avatarLoadingText: {
    color: '#94a3b8',
    fontSize: 12,
    marginLeft: 8,
  },
  bioText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 12,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 14,
    paddingTop: 12,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  settingsCard: {
    backgroundColor: '#070d1e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  settingsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  settingsTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  settingsSub: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 12,
  },
  settingsActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewNotifsBtn: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewNotifsBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  createArticleBtn: {
    backgroundColor: '#0891b2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 14,
  },
  createArticleBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // Inscription Notice Citoyen
  citizenNoticeCard: {
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  citizenNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  citizenNoticeIcon: {
    fontSize: 15,
    marginRight: 6,
  },
  citizenNoticeTitle: {
    color: '#06b6d4',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  citizenNoticeText: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },

  // Espace Citoyen : Carte Candidature Journaliste
  accreditationCard: {
    backgroundColor: '#070d1e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  accreditationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  accreditationTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  statusBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  accreditationDesc: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  refreshStatusBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshStatusBtnText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  applyBtn: {
    backgroundColor: '#0891b2',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Espace Administrateur : Validation
  adminReviewCard: {
    backgroundColor: '#070d1e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(6, 182, 212, 0.4)',
    marginBottom: 14,
  },
  adminReviewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  adminTitleCol: {
    flex: 1,
  },
  adminReviewTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  adminReviewSub: {
    color: '#06b6d4',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  adminRefreshBtn: {
    backgroundColor: '#0f172a',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  adminRefreshBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  adminEmptyState: {
    backgroundColor: '#020512',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  adminEmptyStateText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
  },
  adminEmptyStateSub: {
    color: '#64748b',
    fontSize: 11,
    textAlign: 'center',
  },
  requestItemCard: {
    backgroundColor: '#020512',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  requestItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestApplicantCol: {
    flex: 1,
  },
  requestApplicantName: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '800',
  },
  requestApplicantEmail: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 1,
  },
  requestDateBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requestDateText: {
    color: '#64748b',
    fontSize: 10,
  },
  requestDetailsBox: {
    backgroundColor: '#090f23',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    gap: 4,
  },
  requestDetailRow: {
    fontSize: 11,
    lineHeight: 16,
  },
  requestDetailLabel: {
    color: '#64748b',
    fontWeight: '700',
  },
  requestDetailValue: {
    color: '#e2e8f0',
  },
  requestLinkValue: {
    color: '#06b6d4',
    textDecorationLine: 'underline',
  },
  requestActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rejectActionBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  rejectActionBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '800',
  },
  approveActionBtn: {
    flex: 1.5,
    backgroundColor: '#10b981',
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  approveActionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
  },

  // Modal Candidature
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContainer: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#06b6d4',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#020512',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  modalSub: {
    color: '#06b6d4',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  modalCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '800',
  },
  modalScroll: {
    padding: 16,
  },
  modalInputGroup: {
    marginBottom: 12,
  },
  modalLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#020512',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 12,
  },
  modalTextArea: {
    minHeight: 80,
  },
  modalNoticeBox: {
    backgroundColor: '#090f23',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  modalNoticeText: {
    color: '#64748b',
    fontSize: 10,
    lineHeight: 14,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#020512',
    gap: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalCancelBtnText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    flex: 2,
    backgroundColor: '#0891b2',
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSubmitBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});
