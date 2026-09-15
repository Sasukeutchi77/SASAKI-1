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
  const [readingId, setReadingId] = useState<string | null>(null);

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

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    await api.markAllNotificationsRead();
  };

  const handleDeleteNotification = (id: string, title?: string) => {
    Alert.alert(
      'Supprimer la notification',
      `Voulez-vous supprimer ${title ? `« ${title} »` : 'cette notification'} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            if (readingId === id) setReadingId(null);
            await api.deleteNotification(id);
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Effacer toutes les notifications',
      'Voulez-vous vraiment supprimer toutes les notifications de votre historique ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            const allIds = notifications.map((n) => n.id);
            setNotifications([]);
            setReadingId(null);
            await api.clearAllNotifications(allIds);
          },
        },
      ]
    );
  };

  const handleEnablePermissions = async () => {
    try {
      const granted = await requestNotificationPermission();
      setSystemPermissionGranted(granted);
      if (granted) {
        Alert.alert('Notifications activées', 'Votre appareil recevra désormais les alertes urgentes.');
      }
    } catch {
      // Ignorer
    }
  };

  const renderItem = ({ item }: { item: Notification }) => {
    const isBreaking = item.type === 'breaking_news';
    const isReading = readingId === item.id;
    const isRead = item.read;

    return (
      <View style={[styles.notifCard, !isRead && styles.unreadCard, isReading && styles.readingCard]}>
        {/* Zone principale cliquable pour lire la notification */}
        <TouchableOpacity
          onPress={() => {
            if (!isRead) {
              setNotifications((prev) =>
                prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
              );
              api.markNotificationRead(item.id);
            }
            setReadingId(isReading ? null : item.id);
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

            <View style={styles.headerRightActions}>
              <Text style={styles.timeText}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>

              {/* Bouton de suppression rapide en tête de carte */}
              <TouchableOpacity
                style={styles.quickDeleteBtn}
                onPress={() => handleDeleteNotification(item.id, item.title)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                activeOpacity={0.6}
              >
                <Text style={styles.quickDeleteText}>🗑️</Text>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.notifTitle}>{item.title}</Text>
          <Text style={styles.notifMessage}>{item.message}</Text>

          {!isRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>

        {/* Barre d'action quand l'utilisateur lit ou a ouvert la notification */}
        {isReading && (
          <View style={styles.readingActionsRow}>
            <View style={styles.readingStatus}>
              <Text style={styles.readingStatusText}>✓ Notification lue</Text>
            </View>
            <View style={styles.readingButtonsGroup}>
              <TouchableOpacity
                style={styles.deleteActionBtn}
                onPress={() => handleDeleteNotification(item.id, item.title)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteActionBtnText}>🗑️ Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
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

          {/* Action Bar (Tout Marquer Lu & Tout Effacer) */}
          <View style={styles.actionsBar}>
            <View style={styles.actionsBarInfo}>
              <Text style={styles.actionsBarTitle}>
                {notifications.length > 0 ? `${notifications.length} notification(s)` : 'Boîte de réception'}
              </Text>
            </View>

            <View style={styles.topRightActions}>
              {notifications.some((n) => !n.read) && (
                <TouchableOpacity onPress={handleMarkAllRead} activeOpacity={0.7} style={styles.actionLinkBtn}>
                  <Text style={styles.markReadText}>Tout marquer lu</Text>
                </TouchableOpacity>
              )}

              {notifications.length > 0 && (
                <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7} style={styles.actionLinkBtn}>
                  <Text style={styles.clearAllText}>Tout effacer</Text>
                </TouchableOpacity>
              )}
            </View>
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
                Toutes vos alertes ont été traitées ou supprimées.
              </Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item: Notification) => item.id}
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
  actionsBarInfo: {
    justifyContent: 'center',
  },
  actionsBarTitle: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionLinkBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  markReadText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  clearAllText: {
    color: '#f87171',
    fontSize: 12,
    fontWeight: '700',
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
  readingCard: {
    borderColor: '#06b6d4',
    backgroundColor: '#091530',
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickDeleteBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  quickDeleteText: {
    fontSize: 11,
  },
  readingActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  readingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readingStatusText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  readingButtonsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#450a0a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteActionBtnText: {
    color: '#fca5a5',
    fontSize: 11,
    fontWeight: '800',
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
