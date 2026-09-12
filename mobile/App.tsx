import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  BackHandler,
  Platform,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

// URL par défaut de la plateforme PURGE
const DEFAULT_APP_URL = 'https://ais-dev-ijf4z7bgmjai2zqxses2p3-897333779097.europe-west2.run.app';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Gestion du bouton retour physique sous Android
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      const onBackPress = () => {
        if (canGoBack && webViewRef.current) {
          webViewRef.current.goBack();
          return true;
        }
        return false;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }
  }, [canGoBack]);

  const handleReload = () => {
    setHasError(false);
    setLoading(true);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" backgroundColor="#020512" translucent={false} />
      <View style={styles.container}>
        {/* En-tête natif discret */}
        <View style={styles.nativeHeader}>
          <Image
            source={require('./assets/icon.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>
            PURGE <Text style={styles.headerAccent}>• LIVE</Text>
          </Text>
        </View>

        {/* Vue Web Ultra-Fluide */}
        <WebView
          ref={webViewRef}
          source={{ uri: DEFAULT_APP_URL }}
          style={styles.webview}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setHasError(true);
          }}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          allowsBackForwardNavigationGestures={true}
          pullToRefreshEnabled={true}
          renderLoading={() => (
            <View style={styles.loadingOverlay}>
              <Image
                source={require('./assets/icon.png')}
                style={styles.splashLogo}
                resizeMode="contain"
              />
              <ActivityIndicator size="large" color="#00d2ff" style={{ marginTop: 24 }} />
              <Text style={styles.loadingText}>Connexion au réseau PURGE...</Text>
            </View>
          )}
        />

        {/* Écran d'erreur en cas d'absence de réseau */}
        {hasError && (
          <View style={styles.errorContainer}>
            <Image
              source={require('./assets/icon.png')}
              style={styles.splashLogo}
              resizeMode="contain"
            />
            <Text style={styles.errorTitle}>Signal Hors Ligne</Text>
            <Text style={styles.errorMessage}>
              Impossible de joindre le serveur PURGE. Vérifiez votre connexion Internet.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleReload} activeOpacity={0.8}>
              <Text style={styles.retryButtonText}>RÉESSAYER LA CONNEXION</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020512',
  },
  container: {
    flex: 1,
    backgroundColor: '#020512',
  },
  nativeHeader: {
    height: 44,
    backgroundColor: '#020512',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 210, 255, 0.15)',
  },
  headerLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginRight: 10,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  headerAccent: {
    color: '#00d2ff',
    fontSize: 12,
    fontWeight: '700',
  },
  webview: {
    flex: 1,
    backgroundColor: '#020512',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020512',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  splashLogo: {
    width: 140,
    height: 140,
    borderRadius: 24,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
    fontFamily: 'monospace',
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#020512',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 20,
  },
  errorTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 20,
  },
  errorMessage: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: '#1d68ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00d2ff',
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
});
