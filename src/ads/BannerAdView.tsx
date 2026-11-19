import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AD_UNIT_IDS } from './AdService';
import { useTheme } from '../hooks/useTheme';

// Safely attempt to require native Google Mobile Ads
let NativeBannerAd: any = null;
let BannerAdSize: any = null;
try {
  const gma = require('react-native-google-mobile-ads');
  NativeBannerAd = gma.BannerAd;
  BannerAdSize = gma.BannerAdSize;
} catch {
  // Not linked in current runtime (Expo Go or Web)
}

interface BannerAdProps {
  isOnline: boolean;
  position?: 'bottom' | 'inline';
}

export const BannerAdView: React.FC<BannerAdProps> = ({ isOnline, position = 'bottom' }) => {
  const { theme } = useTheme();
  const [nativeFailed, setNativeFailed] = useState(false);

  // Requirement: if offline, ads are completely hidden and never block UI
  if (!isOnline) {
    return null;
  }

  // If native AdMob is available and hasn't failed, render it
  if (NativeBannerAd && BannerAdSize && !nativeFailed) {
    return (
      <View style={[styles.container, position === 'bottom' && styles.bottomContainer]}>
        <NativeBannerAd
          unitId={AD_UNIT_IDS.BANNER}
          size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{ requestNonPersonalizedAdsOnly: true }}
          onAdFailedToLoad={() => setNativeFailed(true)}
        />
      </View>
    );
  }

  // Graceful Test Ad Banner preview (for Expo Go / dev / web preview)
  return (
    <View
      style={[
        styles.container,
        position === 'bottom' && styles.bottomContainer,
        { backgroundColor: theme.isDark ? '#111827' : '#E2E8F0', borderColor: theme.border },
      ]}
    >
      <View style={styles.adBadgeRow}>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Ad</Text>
        </View>
        <Text style={[styles.adTitle, { color: theme.textSecondary }]}>
          Google AdMob Test Placement
        </Text>
        <TouchableOpacity
          onPress={() => Linking.openURL('https://support.google.com/admob/answer/6128543')}
          style={styles.adChoices}
        >
          <Ionicons name="information-circle-outline" size={14} color={theme.textMuted} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.adSubtitle, { color: theme.textMuted }]}>
        Non-intrusive banner monetizing free offline tools & games
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 52,
  },
  bottomContainer: {
    width: '100%',
  },
  adBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  adBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '700',
  },
  adTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  adChoices: {
    marginLeft: 4,
    padding: 2,
  },
  adSubtitle: {
    fontSize: 10,
    marginTop: 2,
  },
});
