declare module 'react-native-safe-area-context' {
  export const SafeAreaProvider: any;
  export const SafeAreaView: any;
  export const useSafeAreaInsets: () => { top: number; bottom: number; left: number; right: number };
}

declare module 'expo-status-bar' {
  import React from 'react';
  export const StatusBar: React.FC<any>;
}

declare module '@react-native-async-storage/async-storage' {
  const AsyncStorage: {
    getItem: (key: string) => Promise<string | null>;
    setItem: (key: string, value: string) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    clear: () => Promise<void>;
    getAllKeys: () => Promise<string[]>;
    multiGet: (keys: string[]) => Promise<[string, string | null][]>;
    multiSet: (keyValuePairs: [string, string][]) => Promise<void>;
    multiRemove: (keys: string[]) => Promise<void>;
  };
  export default AsyncStorage;
}

declare module 'expo-notifications' {
  export const requestPermissionsAsync: (options?: any) => Promise<any>;
  export const getPermissionsAsync: () => Promise<any>;
  export const setNotificationHandler: (handler: any) => void;
  export const scheduleNotificationAsync: (request: any) => Promise<string>;
  export const cancelAllScheduledNotificationsAsync: () => Promise<void>;
  export const getExpoPushTokenAsync: (options?: any) => Promise<{ data: string }>;
  export const setNotificationChannelAsync: (channelId: string, channel: any) => Promise<any>;
  export const addNotificationReceivedListener: (listener: (notification: any) => void) => any;
  export const addNotificationResponseReceivedListener: (listener: (response: any) => void) => any;
  export const AndroidImportance: {
    MAX: number;
    HIGH: number;
    DEFAULT: number;
    LOW: number;
    MIN: number;
    NONE: number;
  };
}
