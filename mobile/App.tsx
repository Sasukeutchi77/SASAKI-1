import React, { useState, useEffect, useCallback, Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

interface ErrorBoundaryProps {
  children: ReactNode;
  autoReload?: boolean;
  autoReloadDelay?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  countdown: number;
  autoReloadPaused: boolean;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private timer: any = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    const delay = props.autoReloadDelay !== undefined ? props.autoReloadDelay : 6;
    this.state = {
      hasError: false,
      error: null,
      countdown: delay,
      autoReloadPaused: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[PURGE Crash Guard]', error, errorInfo);
    if (this.props.autoReload !== false) {
      this.startAutoReloadCountdown();
    }
  }

  componentWillUnmount() {
    this.clearAutoReloadTimer();
  }

  private clearAutoReloadTimer = () => {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  };

  private startAutoReloadCountdown = () => {
    this.clearAutoReloadTimer();
    const delay = this.props.autoReloadDelay !== undefined ? this.props.autoReloadDelay : 6;
    this.setState({ countdown: delay, autoReloadPaused: false });

    this.timer = setInterval(() => {
      this.setState((prev) => {
        if (prev.autoReloadPaused) return null;
        if (prev.countdown <= 1) {
          this.clearAutoReloadTimer();
          this.handleReset();
          return { countdown: 0 } as Pick<ErrorBoundaryState, 'countdown'>;
        }
        return { countdown: prev.countdown - 1 } as Pick<ErrorBoundaryState, 'countdown'>;
      });
    }, 1000);
  };

  handleReset = () => {
    this.clearAutoReloadTimer();
    this.setState({ hasError: false, error: null, autoReloadPaused: false });
  };

  handlePauseAutoReload = () => {
    this.clearAutoReloadTimer();
    this.setState({ autoReloadPaused: true });
  };

  render() {
    if (this.state.hasError) {
      const { countdown, autoReloadPaused } = this.state;
      const { autoReload = true } = this.props;

      return (
        <SafeAreaView style={styles.errorContainer}>
          <StatusBar style="light" backgroundColor="#020512" />
          <View style={styles.errorContent}>
            <Text style={styles.errorLogo}>PURGE</Text>
            <Text style={styles.errorTitle}>Interruption Temporaire</Text>
            <Text style={styles.errorDescription}>
              L'application a rencontré un imprévu mais vos données sont protégées.
            </Text>

            {autoReload && !autoReloadPaused && countdown > 0 && (
              <View style={styles.countdownBox}>
                <Text style={styles.countdownText}>
                  Relance automatique dans <Text style={styles.countdownHighlight}>{countdown}s</Text>
                </Text>
              </View>
            )}

            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.errorButton}
                onPress={this.handleReset}
                activeOpacity={0.85}
              >
                <Text style={styles.errorButtonText}>Relancer PURGE</Text>
              </TouchableOpacity>

              {autoReload && !autoReloadPaused && countdown > 0 && (
                <TouchableOpacity
                  style={styles.errorSecondaryButton}
                  onPress={this.handlePauseAutoReload}
                  activeOpacity={0.7}
                >
                  <Text style={styles.errorSecondaryButtonText}>Suspendre le compte à rebours</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}

import { NavigationTab, Article, User, isJournalistRole, isAdminRole } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { NotificationsModal } from './components/NotificationsModal';
import { HomeScreen } from './screens/HomeScreen';
import { ArticleDetailScreen } from './screens/ArticleDetailScreen';
import { SearchScreen } from './screens/SearchScreen';
import { RankingsScreen } from './screens/RankingsScreen';
import { BookmarksScreen } from './screens/BookmarksScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { HouseScreen } from './screens/HouseScreen';
import { CreateArticleScreen } from './screens/CreateArticleScreen';
import { TrustSystemModal } from './components/TrustSystemModal';
import {
  initNotifications,
  requestNotificationPermission,
  addNotificationReceivedListener,
  addNotificationResponseReceivedListener,
} from './services/notifications';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('feed');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isCreatingArticle, setIsCreatingArticle] = useState<boolean>(false);
  const [creatingArticleHouse, setCreatingArticleHouse] = useState<{ id?: string; name?: string } | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unreadBookmarks, setUnreadBookmarks] = useState<number>(0);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState<number>(2);
  const [showTrustModal, setShowTrustModal] = useState<boolean>(false);

  // Initialisation au démarrage : Authentification & Notifications
  useEffect(() => {
    const initApp = async () => {
      // 1. Initialiser le canal de notifications Android & demander la permission
      try {
        await initNotifications();
        await requestNotificationPermission();
      } catch (err) {
        console.warn('[App] Initialisation notifications:', err);
      }

      // 2. Restauration de session utilisateur
      try {
        const cachedUser = await api.getUser();
        if (cachedUser) {
          setCurrentUser(cachedUser);
        }
        const me = await api.getMe();
        if (me && me.user) {
          setCurrentUser(me.user);
          if (typeof me.bookmarksCount === 'number') {
            setUnreadBookmarks(me.bookmarksCount);
          }
          if (typeof me.unreadNotifs === 'number') {
            setUnreadNotificationsCount(me.unreadNotifs);
          }
        }
      } catch {
        // Mode hors-ligne ou session expirée
      }
    };

    initApp();

    // 3. Écouteurs de notifications Expo
    const receivedSub = addNotificationReceivedListener((notification) => {
      setUnreadNotificationsCount((prev) => prev + 1);
    });

    const responseSub = addNotificationResponseReceivedListener((response) => {
      setShowNotificationsModal(true);
    });

    return () => {
      try {
        receivedSub?.remove?.();
        responseSub?.remove?.();
      } catch {}
    };
  }, []);

  // Gestion matérielle de la touche "Retour" sur Android
  useEffect(() => {
    const onBackPress = () => {
      if (showNotificationsModal) {
        setShowNotificationsModal(false);
        return true;
      }
      if (isCreatingArticle) {
        setIsCreatingArticle(false);
        return true;
      }
      if (selectedArticle) {
        setSelectedArticle(null);
        return true;
      }
      if (activeTab !== 'feed') {
        setActiveTab('feed');
        return true;
      }
      return false; // Quitte l'application
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [showNotificationsModal, isCreatingArticle, selectedArticle, activeTab]);

  const handleSelectArticle = useCallback((article: Article) => {
    setSelectedArticle(article);
  }, []);

  const handleOpenCreateArticle = useCallback((houseId?: string, houseName?: string) => {
    if (houseId || houseName) {
      setCreatingArticleHouse({ id: houseId, name: houseName });
    } else if (currentUser?.mediaId || currentUser?.mediaName) {
      setCreatingArticleHouse({ id: currentUser.mediaId, name: currentUser.mediaName });
    } else {
      setCreatingArticleHouse(null);
    }
    setIsCreatingArticle(true);
  }, [currentUser]);

  const handleArticleCreated = useCallback((newArticle: Article) => {
    setIsCreatingArticle(false);
    setCreatingArticleHouse(null);
    setSelectedArticle(newArticle);
  }, []);

  return (
    <ErrorBoundary autoReload={true} autoReloadDelay={6}>
      <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" backgroundColor="#020512" />

        {/* Modal des Notifications */}
        <NotificationsModal
          visible={showNotificationsModal}
          onClose={() => {
            setShowNotificationsModal(false);
            setUnreadNotificationsCount(0);
          }}
        />

        {/* Écran d'écriture d'article en plein écran */}
        {isCreatingArticle ? (
          <CreateArticleScreen
            initialMediaHouseId={creatingArticleHouse?.id}
            initialMediaHouseName={creatingArticleHouse?.name}
            currentUser={currentUser}
            onBack={() => {
              setIsCreatingArticle(false);
              setCreatingArticleHouse(null);
            }}
            onArticleCreated={handleArticleCreated}
          />
        ) : selectedArticle ? (
          /* Écran de lecture détaillée d'un article */
          <ArticleDetailScreen
            article={selectedArticle}
            currentUser={currentUser}
            onBack={() => setSelectedArticle(null)}
            onOpenAuth={() => {
              setSelectedArticle(null);
              setActiveTab('profile');
            }}
          />
        ) : (
          /* Vue Principale avec En-tête et Barre de Navigation */
          <View style={styles.mainContainer}>
            <Header
              title={
                activeTab === 'feed'
                  ? 'LE QUOTIDIEN FACTUEL'
                  : activeTab === 'search'
                  ? 'EXPLORATEUR DE DÉPÊCHES'
                  : activeTab === 'rankings'
                  ? 'INDICE DE NOTORIÉTÉ'
                  : activeTab === 'house'
                  ? (currentUser?.mediaName ? currentUser.mediaName.toUpperCase() : 'ESPACE RÉDACTIONS')
                  : activeTab === 'bookmarks'
                  ? 'ARCHIVES PERSONNELLES'
                  : 'ESPACE COMPTE'
              }
              user={currentUser}
              unreadNotificationsCount={unreadNotificationsCount}
              onOpenNotifications={() => setShowNotificationsModal(true)}
              onOpenCreateArticle={() => handleOpenCreateArticle()}
              onOpenSearch={() => setActiveTab('search')}
              onOpenProfile={() => setActiveTab('profile')}
              onOpenTrustSystem={() => setShowTrustModal(true)}
            />

            <View style={styles.screenBody}>
              {activeTab === 'feed' && (
                <HomeScreen
                  onSelectArticle={handleSelectArticle}
                  onRequireAuth={() => setActiveTab('profile')}
                  onOpenNotifications={() => setShowNotificationsModal(true)}
                  onOpenTrustSystem={() => setShowTrustModal(true)}
                  currentUser={currentUser}
                />
              )}

              {activeTab === 'search' && (
                <SearchScreen
                  onSelectArticle={handleSelectArticle}
                  currentUser={currentUser}
                  onUserUpdated={setCurrentUser}
                />
              )}

              {activeTab === 'rankings' && (
                <RankingsScreen
                  onSelectArticle={handleSelectArticle}
                  currentUser={currentUser}
                  onOpenAuth={() => setActiveTab('profile')}
                />
              )}

              {activeTab === 'house' && (
                <HouseScreen
                  currentUser={currentUser}
                  onSelectArticle={handleSelectArticle}
                  onOpenCreateArticle={handleOpenCreateArticle}
                  onRequireAuth={() => setActiveTab('profile')}
                  onUserUpdated={setCurrentUser}
                />
              )}

              {activeTab === 'bookmarks' && (
                <BookmarksScreen
                  currentUser={currentUser}
                  onSelectArticle={handleSelectArticle}
                  onOpenFeed={() => setActiveTab('feed')}
                  onOpenAuth={() => setActiveTab('profile')}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileScreen
                  currentUser={currentUser}
                  onUserUpdated={setCurrentUser}
                  onOpenCreateArticle={handleOpenCreateArticle}
                  onOpenNotifications={() => setShowNotificationsModal(true)}
                  onSelectArticle={handleSelectArticle}
                />
              )}
            </View>

            <BottomNavBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unreadBookmarks={unreadBookmarks}
              isJournalist={currentUser ? isJournalistRole(currentUser.role) || isAdminRole(currentUser.role) : false}
              hasHouse={Boolean(currentUser?.mediaId || currentUser?.mediaName)}
            />

            {/* Modale Système de Confiance & Charte Déontologique */}
            <TrustSystemModal
              visible={showTrustModal}
              onClose={() => setShowTrustModal(false)}
              onOpenAuth={() => {
                setShowTrustModal(false);
                setActiveTab('profile');
              }}
            />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020512',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#020512',
  },
  screenBody: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#020512',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 360,
  },
  errorLogo: {
    fontSize: 28,
    fontWeight: '900',
    color: '#06b6d4',
    letterSpacing: 4,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  errorButton: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    width: '100%',
  },
  errorButtonText: {
    color: '#020512',
    fontSize: 15,
    fontWeight: '700',
  },
  countdownBox: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  countdownText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  countdownHighlight: {
    color: '#06b6d4',
    fontWeight: '700',
  },
  errorActions: {
    width: '100%',
    gap: 10,
    alignItems: 'center',
  },
  errorSecondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  errorSecondaryButtonText: {
    color: '#64748b',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
});
