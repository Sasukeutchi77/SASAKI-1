import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Notification } from '../types';
import { api } from '../services/api';
import {
  triggerLocalNotification,
  requestNotificationPermission,
  areNotificationsEnabled,
} from '../services/notifications';

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectNotification?: (notif: Notification) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  visible,
  onClose,
  onSelectNotification,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [systemPermissionGranted, setSystemPermissionGranted] = useState<boolean>(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications || []);
      const enabled = await areNotificationsEnabled();
      setSystemPermissionGranted(enabled);
    } catch (err) {
      console.warn('[NotificationsModal] Erreur chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible]);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleTestNotification = async () => {
    try {
      const granted = await requestNotificationPermission();
      setSystemPermissionGranted(granted);
      if (!granted) {
        Alert.alert(
          'Autorisation requise',
          'Pour recevoir les alertes sur votre téléphone, veuillez autoriser les notifications dans les paramètres Android de l’application.',
          [{ text: 'Compris' }]
        );
        return;
      }

      const id = await triggerLocalNotification({
        title: '🚨 FLASH INFO EN DIRECT • PURGE',
        body: 'Le système de notifications système est désormais actif et opérationnel sur votre appareil !',
        data: { test: true },
      });

      if (id) {
        // Ajouter aussi à la liste locale
        const newNotif: Notification = {
          id: `notif_test_${Date.now()}`,
          userId: 'me',
          type: 'breaking_news',
          title: '🚨 Test de notification réussi',
          message: 'Votre smartphone reçoit les alertes prioritaires de la rédaction PURGE.',
          read: false,
          createdAt: new Date().toISOString(),
        };
        setNotifications((prev) => [newNotif, ...prev]);
        Alert.alert('Notification envoyée', 'Une notification système a été transmise à votre barre d’état.');
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible d’émettre la notification.');
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const isBreaking = item.type === 'breaking_news';
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.read && styles.unreadCard]}
        onPress={() => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
          );
          if (onSelectNotification) {
            onSelectNotification(item);
          }
        }}
        activeOpacity={0.75}
      >
        <View style={styles.notifHeaderRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {isBreaking ? '🚨 ALERTE DIRECT' : 'INFO SYSTÈME'}
            </Text>
          </View>
          <Text style={styles.timeText}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <Text style={styles.notifTitle}>{item.title}</Text>
        <Text style={styles.notifMessage}>{item.message}</Text>

        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>VOS NOTIFICATIONS</Text>
              <Text style={styles.headerSub}>Dépêches urgentes & alertes de la rédaction</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Action Bar (Test & Tout Marquer Lu) */}
          <View style={styles.actionsBar}>
            <TouchableOpacity
              style={styles.testBtn}
              onPress={handleTestNotification}
              activeOpacity={0.8}
            >
              <Text style={styles.testBtnText}>🔔 TESTER UNE NOTIFICATION</Text>
            </TouchableOpacity>

            {notifications.some((n) => !n.read) && (
              <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7}>
                <Text style={styles.markReadText}>Tout marquer lu</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Statut permission système */}
          <View style={styles.permissionStatusBox}>
            <View
              style={[
                styles.statusIndicator,
                { backgroundColor: systemPermissionGranted ? '#10b981' : '#f59e0b' },
              ]}
            />
            <Text style={styles.permissionStatusText}>
              {systemPermissionGranted
                ? 'Notifications Android autorisées sur cet appareil'
                : 'Notifications Android bloquées ou en attente d’autorisation'}
            </Text>
          </View>

          {/* Liste */}
          {loading ? (
            <View style={styles.centered}>
              <ActivityIndicator size="large" color="#06b6d4" />
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptySub}>
                Vous serez alerté dès qu’un décret ou une dépêche urgente sera publié.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: '85%',
    backgroundColor: '#030712',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  headerSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  testBtn: {
    backgroundColor: '#0891b2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  testBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  markReadText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  permissionStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    marginHorizontal: 20,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  permissionStatusText: {
    color: '#cbd5e1',
    fontSize: 11,
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  notifCard: {
    backgroundColor: '#0b1329',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 14,
    marginBottom: 10,
    position: 'relative',
  },
  unreadCard: {
    borderColor: '#0284c7',
    backgroundColor: '#0c1a38',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  timeText: {
    color: '#64748b',
    fontSize: 11,
  },
  notifTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  notifMessage: {
    color: '#94a3b8',
    fontSize: 12,
    lineHeight: 18,
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#06b6d4',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
