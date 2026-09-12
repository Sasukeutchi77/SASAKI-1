import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, BackHandler } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { NavigationTab, Article, User } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { BottomNavBar } from './components/BottomNavBar';
import { HomeScreen } from './screens/HomeScreen';
import { ArticleDetailScreen } from './screens/ArticleDetailScreen';
import { SearchScreen } from './screens/SearchScreen';
import { RankingsScreen } from './screens/RankingsScreen';
import { BookmarksScreen } from './screens/BookmarksScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CreateArticleScreen } from './screens/CreateArticleScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('feed');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isCreatingArticle, setIsCreatingArticle] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [unreadBookmarks, setUnreadBookmarks] = useState<number>(0);

  // Restauration de session utilisateur au démarrage
  useEffect(() => {
    const initAuth = async () => {
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
        }
      } catch (err) {
        // Mode hors-ligne ou token expiré
      }
    };

    initAuth();
  }, []);

  // Gestion matérielle de la touche "Retour" sur Android
  useEffect(() => {
    const onBackPress = () => {
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
  }, [isCreatingArticle, selectedArticle, activeTab]);

  const handleSelectArticle = useCallback((article: Article) => {
    setSelectedArticle(article);
  }, []);

  const handleArticleCreated = useCallback((newArticle: Article) => {
    setIsCreatingArticle(false);
    setSelectedArticle(newArticle);
  }, []);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        <StatusBar style="light" backgroundColor="#020512" />

        {/* Écran d'écriture d'article en plein écran */}
        {isCreatingArticle ? (
          <CreateArticleScreen
            onBack={() => setIsCreatingArticle(false)}
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
                  : activeTab === 'bookmarks'
                  ? 'ARCHIVES PERSONNELLES'
                  : 'ESPACE COMPTE'
              }
              user={currentUser}
              onOpenCreateArticle={() => setIsCreatingArticle(true)}
              onOpenSearch={() => setActiveTab('search')}
              onOpenProfile={() => setActiveTab('profile')}
            />

            <View style={styles.screenBody}>
              {activeTab === 'feed' && (
                <HomeScreen
                  onSelectArticle={handleSelectArticle}
                  onRequireAuth={() => setActiveTab('profile')}
                />
              )}

              {activeTab === 'search' && (
                <SearchScreen onSelectArticle={handleSelectArticle} />
              )}

              {activeTab === 'rankings' && <RankingsScreen />}

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
                  onOpenCreateArticle={() => setIsCreatingArticle(true)}
                />
              )}
            </View>

            <BottomNavBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              unreadBookmarks={unreadBookmarks}
            />
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
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
});
