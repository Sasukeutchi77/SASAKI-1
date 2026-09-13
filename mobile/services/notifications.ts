import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configuration du comportement d'affichage des notifications en avant-plan
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export const NOTIFICATION_CHANNEL_ID = 'purge-direct-channel';

/**
 * Initialise le gestionnaire de notifications et configure le canal Android requis
 */
export async function initNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'PURGE • Alertes & Dépêches Flash',
        description: 'Alertes urgentes, flash info en direct et notifications d’activités.',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#06b6d4',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
      });
    }
    return true;
  } catch (error) {
    console.warn('[Notifications] Erreur configuration canal Android:', error);
    return false;
  }
}

/**
 * Vérifie et demande les permissions de notifications système auprès de l'utilisateur
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    let isGranted = Boolean((existing as any).granted || (existing as any).status === 'granted');

    if (!isGranted) {
      const requested = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      isGranted = Boolean((requested as any).granted || (requested as any).status === 'granted');
    }

    if (isGranted) {
      await initNotifications();
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[Notifications] Erreur demande permission:', error);
    return false;
  }
}

/**
 * Vérifie si les notifications sont actuellement autorisées
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  try {
    const existing = await Notifications.getPermissionsAsync();
    return Boolean((existing as any).granted || (existing as any).status === 'granted');
  } catch {
    return false;
  }
}

/**
 * Déclenche une notification locale avec son et vibration
 */
export async function triggerLocalNotification(options: {
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<string | null> {
  try {
    const granted = await requestNotificationPermission();
    if (!granted) {
      console.warn('[Notifications] Permission refusée par le système.');
      return null;
    }

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: options.title,
        body: options.body,
        data: options.data || {},
        sound: true,
        vibrate: [0, 250, 250, 250],
        color: '#06b6d4',
      },
      trigger: null, // Immédiatement
    });

    return id;
  } catch (error) {
    console.warn('[Notifications] Erreur envoi notification locale:', error);
    return null;
  }
}

/**
 * Notification spécifique pour les alertes de dépêches urgentes
 */
export async function triggerBreakingNewsNotification(articleTitle: string, categoryName?: string) {
  return triggerLocalNotification({
    title: `🚨 FLASH INFO DIRECT • ${categoryName ? categoryName.toUpperCase() : 'PURGE'}`,
    body: articleTitle,
    data: { type: 'breaking_news', title: articleTitle },
  });
}

/**
 * Écouteur pour les notifications reçues pendant que l'application est ouverte
 */
export function addNotificationReceivedListener(callback: (notification: any) => void) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Écouteur pour le clic / tap sur une notification par l'utilisateur
 */
export function addNotificationResponseReceivedListener(callback: (response: any) => void) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
