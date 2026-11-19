import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NetworkStatusPill } from '../../components/NetworkStatusPill';
import { SearchBar } from '../../components/SearchBar';
import { CategoryPills } from '../../components/CategoryPills';
import { ItemCard } from '../../components/ItemCard';
import { APP_ITEMS } from '../../constants/items';
import { AppItem, CategoryId } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { TabKey } from '../../components/BottomNav';

interface Props {
  isOnline: boolean;
  isSimulatedOffline: boolean;
  favorites: string[];
  recents: string[];
  highScores: Record<string, number>;
  onToggleFavorite: (id: string) => void;
  onSelectItem: (item: AppItem) => void;
  onSelectTab: (tab: TabKey) => void;
  onClearRecents: () => void;
  onToggleSimulatedOffline: () => void;
}

export const HomeScreen: React.FC<Props> = ({
  isOnline,
  isSimulatedOffline,
  favorites,
  recents,
  highScores,
  onToggleFavorite,
  onSelectItem,
  onSelectTab,
  onClearRecents,
  onToggleSimulatedOffline,
}) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryId>('all');

  // Filtered Items based on search and category
  const filteredItems = useMemo(() => {
    let list = APP_ITEMS;

    // Filter by Category
    if (selectedCategory === 'favorites') {
      list = list.filter((i) => favorites.includes(i.id));
    } else if (selectedCategory === 'games') {
      list = list.filter((i) => i.isGame);
    } else if (selectedCategory === 'calculator') {
      list = list.filter((i) => i.category === 'calculator');
    } else if (selectedCategory === 'ai') {
      list = list.filter((i) => i.category === 'ai');
    } else if (selectedCategory !== 'all') {
      list = list.filter((i) => i.category === selectedCategory);
    }

    // Filter by Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [searchQuery, selectedCategory, favorites]);

  // Section item lists for default home dashboard
  const popularTools = useMemo(
    () => APP_ITEMS.filter((i) => !i.isGame && i.popular),
    []
  );

  const popularGames = useMemo(
    () => APP_ITEMS.filter((i) => i.isGame && i.popular),
    []
  );

  const recentItems = useMemo(
    () =>
      recents
        .map((id) => APP_ITEMS.find((item) => item.id === id))
        .filter((item): item is AppItem => !!item),
    [recents]
  );

  const favoriteItems = useMemo(
    () =>
      favorites
        .map((id) => APP_ITEMS.find((item) => item.id === id))
        .filter((item): item is AppItem => !!item),
    [favorites]
  );

  const isBrowsingAll = !searchQuery.trim() && selectedCategory === 'all';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={[styles.brandTitle, { color: theme.text }]}>TOOLBOX X</Text>
          <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
            Everything you need in one app
          </Text>
        </View>

        <NetworkStatusPill
          isOnline={isOnline}
          isSimulatedOffline={isSimulatedOffline}
          onPress={onToggleSimulatedOffline}
        />
      </View>

      {/* Global Search Bar */}
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        onClear={() => setSearchQuery('')}
        placeholder="Search tools and games..."
      />

      {/* Categories Filter Pills */}
      <CategoryPills
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          triggerHaptic('light');
          setSelectedCategory(cat);
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isBrowsingAll ? (
          <>
            {/* Quick Hub Navigation Cards */}
            <View style={styles.hubRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic('light');
                  onSelectTab('tools');
                }}
                style={[
                  styles.hubCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={[styles.hubIconBg, { backgroundColor: theme.primaryGlow }]}>
                  <Ionicons name="construct-outline" size={24} color={theme.primary} />
                </View>
                <Text style={[styles.hubTitle, { color: theme.text }]}>Tools Suite</Text>
                <Text style={[styles.hubCount, { color: theme.textMuted }]}>
                  {APP_ITEMS.filter((i) => !i.isGame).length} Utility Tools
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic('light');
                  onSelectTab('games');
                }}
                style={[
                  styles.hubCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
              >
                <View style={[styles.hubIconBg, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Ionicons name="game-controller-outline" size={24} color="#38BDF8" />
                </View>
                <Text style={[styles.hubTitle, { color: theme.text }]}>Games Arcade</Text>
                <Text style={[styles.hubCount, { color: theme.textMuted }]}>
                  10 100% Offline Games
                </Text>
              </TouchableOpacity>
            </View>

            {/* Favorites Section */}
            {favoriteItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="star" size={16} color="#F59E0B" style={{ marginRight: 6 }} />
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Favorite Tools</Text>
                  </View>
                </View>
                {favoriteItems.slice(0, 4).map((item) => (
                  <ItemCard
                    key={`fav-${item.id}`}
                    item={item}
                    isFavorite={true}
                    onPress={() => onSelectItem(item)}
                    onToggleFavorite={() => onToggleFavorite(item.id)}
                    highScore={highScores[item.id]}
                  />
                ))}
              </View>
            )}

            {/* Popular Tools Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="flame-outline" size={16} color={theme.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular Tools</Text>
                </View>
                <TouchableOpacity onPress={() => onSelectTab('tools')}>
                  <Text style={[styles.seeAllText, { color: theme.primary }]}>View All Tools</Text>
                </TouchableOpacity>
              </View>
              {popularTools.map((item) => (
                <ItemCard
                  key={`pop-tool-${item.id}`}
                  item={item}
                  isFavorite={favorites.includes(item.id)}
                  onPress={() => onSelectItem(item)}
                  onToggleFavorite={() => onToggleFavorite(item.id)}
                />
              ))}
            </View>

            {/* Popular Games Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name="game-controller-outline" size={16} color="#38BDF8" style={{ marginRight: 6 }} />
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Popular Games</Text>
                </View>
                <TouchableOpacity onPress={() => onSelectTab('games')}>
                  <Text style={[styles.seeAllText, { color: theme.primary }]}>View All Games</Text>
                </TouchableOpacity>
              </View>
              {popularGames.map((item) => (
                <ItemCard
                  key={`pop-game-${item.id}`}
                  item={item}
                  isFavorite={favorites.includes(item.id)}
                  onPress={() => onSelectItem(item)}
                  onToggleFavorite={() => onToggleFavorite(item.id)}
                  highScore={highScores[item.id]}
                />
              ))}
            </View>

            {/* Recently Used Section */}
            {recentItems.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="time-outline" size={16} color={theme.textMuted} style={{ marginRight: 6 }} />
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Recently Used</Text>
                  </View>
                  <TouchableOpacity onPress={onClearRecents}>
                    <Text style={[styles.seeAllText, { color: theme.error }]}>Clear History</Text>
                  </TouchableOpacity>
                </View>
                {recentItems.slice(0, 4).map((item) => (
                  <ItemCard
                    key={`rec-${item.id}`}
                    item={item}
                    isFavorite={favorites.includes(item.id)}
                    onPress={() => onSelectItem(item)}
                    onToggleFavorite={() => onToggleFavorite(item.id)}
                    highScore={highScores[item.id]}
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          /* Filtered Search Results */
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {searchQuery.trim()
                  ? `Search Results (${filteredItems.length})`
                  : `Category: ${selectedCategory.toUpperCase()}`}
              </Text>
            </View>
            {filteredItems.length === 0 ? (
              <View style={styles.emptySearch}>
                <Ionicons name="search-outline" size={44} color={theme.textMuted} />
                <Text style={[styles.emptySearchTitle, { color: theme.text }]}>
                  No tools or games found
                </Text>
                <Text style={[styles.emptySearchSub, { color: theme.textMuted }]}>
                  Try a different search term or category filter.
                </Text>
              </View>
            ) : (
              filteredItems.map((item) => (
                <ItemCard
                  key={`filtered-${item.id}`}
                  item={item}
                  isFavorite={favorites.includes(item.id)}
                  onPress={() => onSelectItem(item)}
                  onToggleFavorite={() => onToggleFavorite(item.id)}
                  highScore={highScores[item.id]}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  hubRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  hubCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  hubIconBg: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  hubTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  hubCount: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptySearch: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptySearchTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySearchSub: {
    fontSize: 13,
  },
});
