import React, { useState } from 'react';
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
import { User, isJournalistRole, isAdminRole } from '../types';
import { api } from '../services/api';
import { pickImageFromGallery, uploadPickedImageToCloudinary } from '../services/imagePicker';

interface ProfileScreenProps {
  currentUser: User | null;
  onUserUpdated: (user: User | null) => void;
  onOpenCreateArticle?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  currentUser,
  onUserUpdated,
  onOpenCreateArticle,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<'citoyen' | 'journaliste'>('citoyen');
  const [loading, setLoading] = useState(false);
  const [updatingAvatar, setUpdatingAvatar] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAuthSubmit = async () => {
    setErrorMessage(null);
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    if (authMode === 'register' && !name.trim()) {
      setErrorMessage('Veuillez renseigner votre nom complet.');
      return;
    }

    setLoading(true);
    try {
      if (authMode === 'login') {
        const res = await api.login({ email: email.trim(), password });
        onUserUpdated(res.user);
      } else {
        const res = await api.register({
          name: name.trim(),
          email: email.trim(),
          password,
          accountType,
        });
        onUserUpdated(res.user);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Échec de l'authentification.");
    } finally {
      setLoading(false);
    }
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

  if (!currentUser) {
    return (
      <ScrollView contentContainerStyle={styles.scrollAuth} keyboardShouldPersistTaps="handled">
        <View style={styles.authCard}>
          <Image source={require('../assets/icon.png')} style={styles.authLogo} resizeMode="contain" />
          <Text style={styles.authTitle}>ESPACE CITOYEN & JOURNALISTE</Text>
          <Text style={styles.authSub}>
            Accédez aux dépêches exclusives, participez aux débats et suivez vos rédacteurs favoris.
          </Text>

          {/* Onglets Connexion / Inscription */}
          <View style={styles.authTabs}>
            <TouchableOpacity
              style={[styles.authTabBtn, authMode === 'login' && styles.activeAuthTabBtn]}
              onPress={() => setAuthMode('login')}
              activeOpacity={0.7}
            >
              <Text style={[styles.authTabText, authMode === 'login' && styles.activeAuthTabText]}>
                CONNEXION
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.authTabBtn, authMode === 'register' && styles.activeAuthTabBtn]}
              onPress={() => setAuthMode('register')}
              activeOpacity={0.7}
            >
              <Text style={[styles.authTabText, authMode === 'register' && styles.activeAuthTabText]}>
                INSCRIPTION
              </Text>
            </TouchableOpacity>
          </View>

          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Formulaire */}
          {authMode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nom complet ou Nom de plume</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Alexis de Tocqueville"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Adresse Email</Text>
            <TextInput
              style={styles.input}
              placeholder="votre.email@domaine.fr"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mot de passe</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••••••"
              placeholderTextColor="#64748b"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          {authMode === 'register' && (
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Type de compte</Text>
              <View style={styles.accountTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.accountTypeBtn,
                    accountType === 'citoyen' && styles.activeAccountTypeBtn,
                  ]}
                  onPress={() => setAccountType('citoyen')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.accountTypeText, accountType === 'citoyen' && styles.activeAccountTypeText]}>
                    👤 Citoyen
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.accountTypeBtn,
                    accountType === 'journaliste' && styles.activeAccountTypeBtn,
                  ]}
                  onPress={() => setAccountType('journaliste')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.accountTypeText, accountType === 'journaliste' && styles.activeAccountTypeText]}>
                    🖋 Journaliste
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={handleAuthSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {authMode === 'login' ? 'SE CONNECTER' : 'CRÉER MON COMPTE'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  const isJournalist = isJournalistRole(currentUser.role);
  const isAdmin = isAdminRole(currentUser.role);

  return (
    <ScrollView contentContainerStyle={styles.scrollProfile}>
      {/* Carte Profil Utilisateur */}
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handleChangeAvatar}
            disabled={updatingAvatar}
            activeOpacity={0.8}
          >
            {currentUser.avatar ? (
              <Image source={{ uri: currentUser.avatar }} style={styles.avatarImg} />
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

            {/* Badge Rôle */}
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
            <ActivityIndicator size="small" color="#00d2ff" />
            <Text style={styles.avatarLoadingText}>Téléversement de la photo...</Text>
          </View>
        )}

        {currentUser.bio ? (
          <Text style={styles.bioText}>{currentUser.bio}</Text>
        ) : null}

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
    backgroundColor: '#0c1228',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.2)',
  },
  authLogo: {
    width: 48,
    height: 48,
    alignSelf: 'center',
    marginBottom: 12,
  },
  authTitle: {
    color: '#00d2ff',
    fontSize: 13,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 1,
  },
  authSub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 10,
    lineHeight: 16,
  },
  authTabs: {
    flexDirection: 'row',
    backgroundColor: '#020512',
    borderRadius: 8,
    padding: 4,
    marginVertical: 14,
  },
  authTabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeAuthTabBtn: {
    backgroundColor: '#1d68ff',
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
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    marginBottom: 14,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 12,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#020512',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  accountTypeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  accountTypeBtn: {
    flex: 1,
    backgroundColor: '#020512',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeAccountTypeBtn: {
    borderColor: '#00d2ff',
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
  },
  accountTypeText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  activeAccountTypeText: {
    color: '#00d2ff',
    fontWeight: '800',
  },
  submitBtn: {
    backgroundColor: '#1d68ff',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  scrollProfile: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#020512',
  },
  profileCard: {
    backgroundColor: '#0c1228',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: '#00d2ff',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#00d2ff',
  },
  avatarInitial: {
    color: '#00d2ff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  cameraIconBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#020512',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d2ff',
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
    fontWeight: '800',
  },
  verified: {
    color: '#00d2ff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#94a3b8',
    fontSize: 12,
    marginVertical: 2,
  },
  roleBadge: {
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  roleBadgeText: {
    color: '#00d2ff',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  avatarLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  avatarLoadingText: {
    color: '#00d2ff',
    fontSize: 12,
  },
  bioText: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 14,
    fontStyle: 'italic',
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 16,
    paddingTop: 14,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
  },
  createArticleBtn: {
    backgroundColor: '#1d68ff',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00d2ff',
    marginBottom: 12,
  },
  createArticleBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logoutBtn: {
    backgroundColor: '#0c1228',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  logoutBtnText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
