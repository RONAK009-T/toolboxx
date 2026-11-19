import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SearchBar } from '../../components/SearchBar';
import { ItemCard } from '../../components/ItemCard';
import { APP_ITEMS } from '../../constants/items';
import { AppItem } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { BannerAdView } from '../../ads/BannerAdView';

interface Props {
  isOnline: boolean;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSelectItem: (item: AppItem) => void;
}

type FilterMode = 'all' | 'offline' | 'online';

export const ToolsHubScreen: React.FC<Props> = ({
  isOnline,
  favorites,
  onToggleFavorite,
  onSelectItem,
}) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [search, setSearch] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const tools = useMemo(() => {
    let list = APP_ITEMS.filter((i) => !i.isGame);

    if (filterMode === 'offline') {
      list = list.filter((i) => !i.isOnline);
    } else if (filterMode === 'online') {
      list = list.filter((i) => i.isOnline);
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }

    return list;
  }, [search, filterMode]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="construct-outline" size={22} color={theme.primary} style={{ marginRight: 8 }} />
          <Text style={[styles.title, { color: theme.text }]}>Tools Suite</Text>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Everyday calculators, file utilities, converters and AI tools
        </Text>
      </View>

      {/* Search */}
      <SearchBar
        value={search}
        onChangeText={setSearch}
        onClear={() => setSearch('')}
        placeholder="Search tools..."
      />

      {/* Filter Tabs */}
      <View style={styles.filtersRow}>
        {(['all', 'offline', 'online'] as FilterMode[]).map((f) => {
          const isSel = filterMode === f;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => {
                triggerHaptic('light');
                setFilterMode(f);
              }}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: isSel ? theme.primary : theme.surface,
                  borderColor: isSel ? theme.primary : theme.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  { color: isSel ? '#FFFFFF' : theme.textSecondary },
                ]}
              >
                {f === 'all' ? 'All Tools' : f === 'offline' ? 'Offline Only' : 'Online Only'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tools List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tools.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyText, { color: theme.text }]}>No tools match filter</Text>
          </View>
        ) : (
          tools.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              isFavorite={favorites.includes(item.id)}
              onPress={() => onSelectItem(item)}
              onToggleFavorite={() => onToggleFavorite(item.id)}
            />
          ))
        )}

        {/* Inline Banner Ad at bottom of tools list */}
        <BannerAdView isOnline={isOnline} position="inline" />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  filtersRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
