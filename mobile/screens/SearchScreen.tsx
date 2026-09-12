import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Article, Category } from '../types';
import { api } from '../services/api';
import { ArticleCard } from '../components/ArticleCard';

interface SearchScreenProps {
  onSelectArticle: (article: Article) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({ onSelectArticle }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    api.getCategories()
      .then((res) => {
        if (res.categories) setCategories(res.categories);
      })
      .catch((e) => console.warn('Erreur catégories:', e));
  }, []);

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

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchBarWrapper}>
        <View style={styles.inputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par titre, mot-clé, sujet..."
            placeholderTextColor="#64748b"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              handleSearch(text);
            }}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); handleSearch('', selectedCategory); }}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Grille des catégories si aucune recherche */}
      {!hasSearched && query.length === 0 && !selectedCategory && (
        <View style={styles.exploreSection}>
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
        </View>
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
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ArticleCard article={item} onPress={() => onSelectArticle(item)} />
          )}
          contentContainerStyle={styles.listContent}
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
  searchBarWrapper: {
    padding: 16,
    backgroundColor: '#020512',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
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
});
