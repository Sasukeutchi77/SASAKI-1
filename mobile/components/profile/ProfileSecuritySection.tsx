import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../../types';
import { AppIcon } from '../AppIcon';

interface ProfileSecuritySectionProps {
  currentUser: User;
  notificationsActive: boolean;
  onToggleNotifications: () => void;
  onOpenPasswordReset: () => void;
  onLogout: () => void;
}

export const ProfileSecuritySection: React.FC<ProfileSecuritySectionProps> = ({
  currentUser,
  notificationsActive,
  onToggleNotifications,
  onOpenPasswordReset,
  onLogout,
}) => {
  const [clearingCache, setClearingCache] = useState(false);

  const handleClearCache = async () => {
    Alert.alert(
      'Nettoyage du Cache',
      'Voulez-vous libérer l’espace de stockage temporaire et les dépêches mises en cache hors-ligne ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider le cache',
          style: 'destructive',
          onPress: async () => {
            setClearingCache(true);
            try {
              // Effacer les clés de cache non essentielles tout en préservant le token et l'utilisateur
              const keysToClear = [
                '@purge_offline_bookmarks_cache',
                'purge_articles_cache',
                'purge_categories_cache',
                'purge_deleted_notif_ids',
              ];
              for (const k of keysToClear) {
                await AsyncStorage.removeItem(k).catch(() => {});
              }
              Alert.alert('Cache vidé', 'Le cache local de l’application a été purgé avec succès.');
            } catch (err: any) {
              Alert.alert('Erreur', 'Impossible de vider le cache local.');
            } finally {
              setClearingCache(false);
            }
          },
        },
      ]
    );
  };

  const handleOpenSourceCharter = () => {
    Alert.alert(
      'Charte Déontologique & Secret des Sources',
      'PURGE garantit le chiffrement des communications entre citoyens lanceurs d’alerte et journalistes accrédités. Aucune métadonnée compromettante n’est transmise à des tiers.'
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Alertes & Notifications Push */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.cardTitle}>NOTIFICATIONS & ALERTES SIRÈNE</Text>
            <Text style={styles.cardSub}>Flashs infos, décrets et urgences sanitaires</Text>
          </View>

          <View style={[styles.statusPill, notificationsActive ? styles.pillActive : styles.pillInactive]}>
            <Text style={[styles.statusPillText, notificationsActive ? styles.pillTextActive : styles.pillTextInactive]}>
              {notificationsActive ? 'ACTIVÉES' : 'EN ATTENTE'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, notificationsActive ? styles.activeActionBtn : styles.primaryActionBtn]}
          onPress={onToggleNotifications}
          activeOpacity={0.8}
        >
          <AppIcon
            name="bell"
            size={13}
            color={notificationsActive ? '#10b981' : '#ffffff'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.actionBtnText, notificationsActive && { color: '#10b981' }]}>
            {notificationsActive ? 'PARAMÈTRES DE NOTIFICATIONS' : 'ACTIVER LES NOTIFICATIONS PUSH'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Sécurité du Compte & Mot de passe */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.cardTitle}>AUTHENTIFICATION & IDENTIFIANTS</Text>
            <Text style={styles.cardSub}>Sécurisation cryptographique de vos accès</Text>
          </View>

          <AppIcon name="lock" size={16} color="#06b6d4" />
        </View>

        <View style={styles.accountInfoBox}>
          <Text style={styles.accountEmailLabel}>Email associé au compte :</Text>
          <Text style={styles.accountEmailVal}>{currentUser.email}</Text>
        </View>

        <TouchableOpacity
          style={styles.secondaryActionBtn}
          onPress={onOpenPasswordReset}
          activeOpacity={0.8}
        >
          <AppIcon name="key" size={13} color="#38bdf8" style={{ marginRight: 6 }} />
          <Text style={styles.secondaryActionBtnText}>Modifier mon mot de passe</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Stockage Local & Cache */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.cardTitle}>DONNÉES HORS-LIGNE & CACHE</Text>
            <Text style={styles.cardSub}>Gestion des ressources stockées sur l’appareil</Text>
          </View>

          <AppIcon name="folder" size={16} color="#94a3b8" />
        </View>

        <TouchableOpacity
          style={styles.cacheBtn}
          onPress={handleClearCache}
          disabled={clearingCache}
          activeOpacity={0.8}
        >
          <AppIcon name="trash" size={13} color="#f59e0b" style={{ marginRight: 6 }} />
          <Text style={styles.cacheBtnText}>Vider le cache hors-ligne</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Déontologie & Protection des Sources */}
      <TouchableOpacity
        style={styles.charterRow}
        onPress={handleOpenSourceCharter}
        activeOpacity={0.7}
      >
        <AppIcon name="shield-checkmark" size={14} color="#06b6d4" style={{ marginRight: 8 }} />
        <Text style={styles.charterText}>Charte Déontologique & Protection des Sources</Text>
        <AppIcon name="arrow-forward" size={13} color="#64748b" style={{ marginLeft: 'auto' }} />
      </TouchableOpacity>

      {/* 5. Bouton Déconnexion */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={onLogout}
        activeOpacity={0.8}
      >
        <AppIcon name="logout" size={14} color="#ef4444" style={{ marginRight: 6 }} />
        <Text style={styles.logoutBtnText}>SE DÉCONNECTER DU COMPTE</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 14,
  },
  card: {
    backgroundColor: '#070d1e',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.2)',
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  cardSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  pillInactive: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    borderColor: '#64748b',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  pillTextActive: {
    color: '#10b981',
  },
  pillTextInactive: {
    color: '#94a3b8',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryActionBtn: {
    backgroundColor: '#0284c7',
  },
  activeActionBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  accountInfoBox: {
    backgroundColor: 'rgba(2, 5, 18, 0.6)',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  accountEmailLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
  },
  accountEmailVal: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  secondaryActionBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  cacheBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    paddingVertical: 10,
    borderRadius: 8,
  },
  cacheBtnText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '800',
  },
  charterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#070d1e',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  charterText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  logoutBtnText: {
    color: '#f87171',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
});
