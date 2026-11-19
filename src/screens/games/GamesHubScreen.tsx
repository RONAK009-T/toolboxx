import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ItemCard } from '../../components/ItemCard';
import { APP_ITEMS } from '../../constants/items';
import { AppItem } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { BannerAdView } from '../../ads/BannerAdView';

interface Props {
  isOnline: boolean;
  favorites: string[];
  highScores: Record<string, number>;
  onToggleFavorite: (id: string) => void;
  onSelectItem: (item: AppItem) => void;
}

export const GamesHubScreen: React.FC<Props> = ({
  isOnline,
  favorites,
  highScores,
  onToggleFavorite,
  onSelectItem,
}) => {
  const { theme } = useTheme();
  const games = APP_ITEMS.filter((i) => i.isGame);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.titleWrap}>
            <Ionicons name="game-controller-outline" size={22} color="#38BDF8" style={{ marginRight: 8 }} />
            <Text style={[styles.title, { color: theme.text }]}>Games Arcade</Text>
          </View>
          <View style={[styles.badge, { borderColor: '#16A34A', backgroundColor: 'rgba(22, 163, 74, 0.1)' }]}>
            <Text style={[styles.badgeText, { color: '#16A34A' }]}>100% OFFLINE</Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          10 offline games • Zero internet needed • Scores stored locally
        </Text>
      </View>

      {/* Games List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {games.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isFavorite={favorites.includes(item.id)}
            onPress={() => onSelectItem(item)}
            onToggleFavorite={() => onToggleFavorite(item.id)}
            highScore={highScores[item.id]}
          />
        ))}

        {/* Inline Banner Ad at bottom of game menu */}
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
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
