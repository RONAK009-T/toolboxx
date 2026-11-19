import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from '@expo/vector-icons';
import { AppItem } from '../types';
import { useTheme } from '../hooks/useTheme';

interface Props {
  item: AppItem;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  highScore?: number;
}

export const ItemCard: React.FC<Props> = ({
  item,
  isFavorite,
  onPress,
  onToggleFavorite,
  highScore,
}) => {
  const { theme } = useTheme();

  const renderIcon = () => {
    const iconColor = item.color || theme.primary;
    const size = 24;

    switch (item.iconFamily) {
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={item.icon as any} size={size} color={iconColor} />;
      case 'FontAwesome5':
        return <FontAwesome5 name={item.icon as any} size={size} color={iconColor} />;
      case 'Feather':
        return <Feather name={item.icon as any} size={size} color={iconColor} />;
      case 'Ionicons':
      default:
        return <Ionicons name={item.icon as any} size={size} color={iconColor} />;
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
      ]}
    >
      <View style={styles.contentRow}>
        {/* Icon with tinted backdrop */}
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: `${item.color || theme.primary}18` },
          ]}
        >
          {renderIcon()}
        </View>

        {/* Text Details */}
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
              {item.title}
            </Text>
            {item.isOnline && (
              <View style={[styles.onlineBadge, { borderColor: theme.accent }]}>
                <Text style={[styles.onlineBadgeText, { color: theme.accent }]}>
                  {item.badge || 'ONLINE'}
                </Text>
              </View>
            )}
            {!item.isOnline && item.isGame && (
              <View style={[styles.offlineBadge, { borderColor: theme.primary }]}>
                <Text style={[styles.offlineBadgeText, { color: theme.primary }]}>
                  OFFLINE
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.description, { color: theme.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>

          {item.isGame && typeof highScore === 'number' && highScore > 0 && (
            <View style={styles.scoreRow}>
              <Ionicons name="trophy" size={12} color="#F59E0B" />
              <Text style={styles.scoreText}>Best: {highScore}</Text>
            </View>
          )}
        </View>

        {/* Favorite Star Button */}
        <TouchableOpacity
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={onToggleFavorite}
          style={styles.favBtn}
        >
          <Ionicons
            name={isFavorite ? 'star' : 'star-outline'}
            size={20}
            color={isFavorite ? '#F59E0B' : theme.textMuted}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  onlineBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.8,
  },
  onlineBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  offlineBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 0.8,
  },
  offlineBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  scoreText: {
    fontSize: 11,
    color: '#F59E0B',
    fontWeight: '700',
  },
  favBtn: {
    padding: 6,
  },
});
