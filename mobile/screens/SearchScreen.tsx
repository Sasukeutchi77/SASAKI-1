import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { Article, Category, MediaHouse, User } from '../types';
import { api } from '../services/api';
import { ArticleCard } from '../components/ArticleCard';
import { CreateHouseModal } from '../components/CreateHouseModal';

interface SearchScreenProps {
  onSelectArticle: (article: Article) => void;
  currentUser?: User | null;
  onUserUpdated?: (user: User) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onSelectArticle,
  currentUser,
  onUserUpdated,
}) => {
  const [activeSegment, setActiveSegment] = useState<'articles' | 'houses'>('articles');

  // Search state for articles
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Houses state
  const [houses, setHouses] = useState<MediaHouse[]>([]);
  const [houseQuery, setHouseQuery] = useState('');
  const [loadingHouses, setLoadingHouses] = useState(false);
  const [showCreateHouseModal, setShowCreateHouseModal] = useState(false);

  useEffect(() => {
    api.getCategories()
      .then((res) => {
        if (res.categories) setCategories(res.categories);
      })
      .catch((e) => console.warn('Erreur catégories:', e));

    loadMediaHouses();
  }, []);

  const loadMediaHouses = async () => {
    setLoadingHouses(true);
    try {
      const res = await api.getMediaHouses();
      if (res?.mediaHouses) {
        setHouses(res.mediaHouses);
      }
    } catch (e) {
      console.warn('Erreur chargement maisons:', e);
    } finally {
      setLoadingHouses(false);
    }
  };

  const handleSearch = async (text: string, cat?: string) => {
    const q = text.trim();
    const c = cat !== undefined ? cat : selectedCategory;

    if (!q && !c) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);
    try {
      const res = await api.getArticles({
        search: q || undefined,
        category: c || undefined,
        limit: 20,
      });
      if (res.articles) {
        setResults(res.articles);
      }
    } catch (e) {
      console.warn('Erreur recherche:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryPress = (catId: string) => {
    const newCat = selectedCategory === catId ? '' : catId;
    setSelectedCategory(newCat);
    handleSearch(query, newCat);
  };

  const filteredHouses = houses.filter((h) => {
    if (!houseQuery.trim()) return true;
    const q = houseQuery.toLowerCase();
    return (
      h.name.toLowerCase().includes(q) ||
      h.motto?.toLowerCase().includes(q) ||
      h.description?.toLowerCase().includes(q) ||
      h.specialties?.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <View style={styles.container}>
      {/* Top Segment Switcher */}
      <View style={styles.segmentBar}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'articles' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('articles')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.segmentBtnText, activeSegment === 'articles' && styles.segmentBtnTextActive]}
          >
            📰 ARTICLES & SUJETS
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'houses' && styles.segmentBtnActive]}
          onPress={() => setActiveSegment('houses')}
          activeOpacity={0.7}
        >
          <Text
            style={[styles.segmentBtnText, activeSegment === 'houses' && styles.segmentBtnTextActive]}
          >
            🏛️ MAISONS DE PRESSE
          </Text>
        </TouchableOpacity>
      </View>

      {activeSegment === 'articles' ? (
        <>
          {/* Barre de recherche Articles */}
          <View style={styles.searchBarWrapper}>
            <View style={styles.inputContainer}>
              <Text style={styles.searchIcon}>🔍</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Rechercher par titre, mot-clé, sujet..."
                placeholderTextColor="#64748b"
                value={query}
                onChangeText={(text: string) => {
                  setQuery(text);
                  handleSearch(text);
                }}
                returnKeyType="search"
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setQuery('');
                    handleSearch('', selectedCategory);
                  }}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Grille des catégories si aucune recherche */}
          {!hasSearched && query.length === 0 && !selectedCategory && (
            <ScrollView contentContainerStyle={styles.exploreSection}>
              <Text style={styles.sectionTitle}>Explorer par Thématiques</Text>
              <View style={styles.categoryGrid}>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={styles.catCard}
                    onPress={() => handleCategoryPress(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.catCardName}>{cat.name}</Text>
                    {cat.description ? (
                      <Text style={styles.catCardDesc} numberOfLines={1}>
                        {cat.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          )}

          {/* État de chargement */}
          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#00d2ff" />
              <Text style={styles.loadingText}>Recherche en cours...</Text>
            </View>
          ) : hasSearched && results.length === 0 ? (
            <View style={styles.centerContainer}>
              <Text style={styles.noResultsTitle}>Aucun résultat trouvé</Text>
              <Text style={styles.noResultsSub}>
                Essayez d'autres mots-clés ou explorez une catégorie différente.
              </Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item: Article) => item.id}
              renderItem={({ item }: { item: Article }) => (
                <ArticleCard article={item} onPress={() => onSelectArticle(item)} />
              )}
              contentContainerStyle={styles.listContent}
            />
          )}
        </>
      ) : (
        /* VUE MAISONS DE PRESSE (CRÉATION ET EXPLORATION ANDROID) */
        <ScrollView contentContainerStyle={styles.housesContainer} keyboardShouldPersistTaps="handled">
          {/* Banner Création de Maison de Presse */}
          <View style={styles.createHouseBanner}>
            <View style={styles.createHouseBadge}>
              <Text style={styles.createHouseBadgeText}>RÉSEAU ÉDITORIAL</Text>
            </View>
            <Text style={styles.createHouseBannerTitle}>🏛️ Fonder une Maison de Presse</Text>
            <Text style={styles.createHouseBannerDesc}>
              Créez votre propre rédaction indépendante, publiez vos investigations officielles, recrutez des journalistes et développez votre audience.
            </Text>
            <TouchableOpacity
              style={styles.createHouseBannerBtn}
              onPress={() => {
                if (!currentUser) {
                  Alert.alert('Connexion requise', 'Veuillez vous connecter pour fonder une maison de presse.');
                  return;
                }
                setShowCreateHouseModal(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.createHouseBannerBtnText}>+ FONDER UNE MAISON DE PRESSE</Text>
            </TouchableOpacity>
          </View>

          {/* Barre de recherche pour les maisons */}
          <View style={styles.searchBarWrapper}>
            <View style={styles.inputContainer}>
              <Text style={styles.searchIcon}>🏛️</Text>
              <TextInput
                style={styles.searchInput}
                placeholder="Chercher une maison de presse, devise, domaine..."
                placeholderTextColor="#64748b"
                value={houseQuery}
                onChangeText={setHouseQuery}
              />
              {houseQuery.length > 0 && (
                <TouchableOpacity onPress={() => setHouseQuery('')}>
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Liste des maisons de presse */}
          <View style={styles.housesListSection}>
            <Text style={styles.sectionTitle}>
              Maisons de Presse Agréées ({filteredHouses.length})
            </Text>

            {loadingHouses ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#00d2ff" />
                <Text style={styles.loadingText}>Chargement des rédactions...</Text>
              </View>
            ) : filteredHouses.length === 0 ? (
              <View style={styles.centerContainer}>
                <Text style={styles.noResultsTitle}>Aucune maison trouvée</Text>
                <Text style={styles.noResultsSub}>
                  Soyez le premier à fonder votre propre maison de presse avec le bouton ci-dessus !
                </Text>
              </View>
            ) : (
              filteredHouses.map((house) => (
                <View key={house.id} style={styles.houseCard}>
                  {house.coverImage ? (
                    <Image source={{ uri: house.coverImage }} style={styles.houseCover} resizeMode="cover" />
                  ) : null}
                  <View style={styles.houseBody}>
                    <View style={styles.houseHeaderRow}>
                      <Image
                        source={{ uri: house.logo || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=150&auto=format&fit=crop&q=80' }}
                        style={styles.houseLogo}
                      />
                      <View style={styles.houseTitleCol}>
                        <View style={styles.houseNameRow}>
                          <Text style={styles.houseName}>{house.name}</Text>
                          {house.isVerified && <Text style={styles.verifiedBadge}> ✓</Text>}
                        </View>
                        <Text style={styles.houseMotto}>« {house.motto || 'Information Indépendante'} »</Text>
                      </View>
                    </View>

                    {house.description ? (
                      <Text style={styles.houseDesc} numberOfLines={2}>
                        {house.description}
                      </Text>
                    ) : null}

                    {/* Spécialités */}
                    {house.specialties && house.specialties.length > 0 && (
                      <View style={styles.specialtiesRow}>
                        {house.specialties.map((spec, i) => (
                          <View key={i} style={styles.specBadge}>
                            <Text style={styles.specBadgeText}>{spec}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Stats & badges */}
                    <View style={styles.houseFooter}>
                      <View style={styles.houseStatCol}>
                        <Text style={styles.houseStatVal}>{house.articlesCount || 0}</Text>
                        <Text style={styles.houseStatLbl}>Enquêtes</Text>
                      </View>
                      <View style={styles.houseStatCol}>
                        <Text style={styles.houseStatVal}>{house.followersCount || 0}</Text>
                        <Text style={styles.houseStatLbl}>Abonnés</Text>
                      </View>
                      <View style={styles.houseStatCol}>
                        <Text style={[styles.houseStatVal, { color: '#10b981' }]}>
                          {house.trustScore || 95}%
                        </Text>
                        <Text style={styles.houseStatLbl}>Confiance</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {/* Modal Création Maison de Presse */}
      {currentUser && (
        <CreateHouseModal
          visible={showCreateHouseModal}
          currentUser={currentUser}
          onSuccess={(newHouse) => {
            loadMediaHouses();
            if (onUserUpdated) {
              const updatedUser: User = {
                ...currentUser,
                mediaId: newHouse.id,
                mediaName: newHouse.name,
                mediaHouseRole: 'Chef de Rédaction',
                role: currentUser.role === 'admin' ? 'admin' : 'journalist',
                accountType: currentUser.role === 'admin' ? ('admin' as any) : 'journalist',
                isVerified: true,
              };
              onUserUpdated(updatedUser);
            }
          }}
          onClose={() => setShowCreateHouseModal(false)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020512',
  },
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: '#070d1e',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  segmentBtnActive: {
    borderBottomColor: '#00d2ff',
    backgroundColor: 'rgba(0, 210, 255, 0.05)',
  },
  segmentBtnText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  segmentBtnTextActive: {
    color: '#00d2ff',
  },
  searchBarWrapper: {
    padding: 16,
    backgroundColor: '#020512',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0c1228',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.2)',
    height: 46,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  clearIcon: {
    color: '#94a3b8',
    fontSize: 16,
    padding: 4,
  },
  exploreSection: {
    padding: 16,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 14,
    letterSpacing: 0.5,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  catCard: {
    width: '48%',
    backgroundColor: '#0c1228',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  catCardName: {
    color: '#00d2ff',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 4,
  },
  catCardDesc: {
    color: '#94a3b8',
    fontSize: 11,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 180,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 12,
  },
  noResultsTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
  },
  noResultsSub: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 16,
  },
  // Style Maisons de Presse
  housesContainer: {
    paddingBottom: 40,
  },
  createHouseBanner: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: '#081126',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
  },
  createHouseBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 210, 255, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  createHouseBadgeText: {
    color: '#00d2ff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  createHouseBannerTitle: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 6,
  },
  createHouseBannerDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  createHouseBannerBtn: {
    backgroundColor: '#00d2ff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createHouseBannerBtnText: {
    color: '#020512',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  housesListSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  houseCard: {
    backgroundColor: '#0c1228',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  houseCover: {
    width: '100%',
    height: 100,
  },
  houseBody: {
    padding: 16,
  },
  houseHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  houseLogo: {
    width: 48,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 210, 255, 0.3)',
    marginRight: 12,
  },
  houseTitleCol: {
    flex: 1,
  },
  houseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  houseName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  verifiedBadge: {
    color: '#00d2ff',
    fontWeight: '800',
    fontSize: 14,
  },
  houseMotto: {
    color: '#00d2ff',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  houseDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  specialtiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  specBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  specBadgeText: {
    color: '#cbd5e1',
    fontSize: 11,
  },
  houseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  houseStatCol: {
    alignItems: 'center',
  },
  houseStatVal: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  houseStatLbl: {
    color: '#64748b',
    fontSize: 10,
    textTransform: 'uppercase',
    marginTop: 2,
  },
});
