import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { markInterstitialShown } from './AdService';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export const InterstitialModal: React.FC<Props> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const [canSkip, setCanSkip] = useState(false);
  const [skipTimer, setSkipTimer] = useState(3);

  useEffect(() => {
    if (!visible) {
      setCanSkip(false);
      setSkipTimer(3);
      return;
    }

    markInterstitialShown();

    const interval = setInterval(() => {
      setSkipTimer((t) => {
        if (t <= 1) {
          clearInterval(interval);
          setCanSkip(true);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={canSkip ? onClose : undefined}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Ad</Text>
            </View>
            <Text style={[styles.adMobText, { color: theme.textMuted }]}>
              Google AdMob Interstitial
            </Text>
            {canSkip ? (
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close-circle" size={24} color={theme.text} />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.timerText, { color: theme.textMuted }]}>
                Skip in {skipTimer}s
              </Text>
            )}
          </View>

          {/* Ad Creative Simulator */}
          <View style={[styles.creativeArea, { backgroundColor: theme.background }]}>
            <Ionicons name="apps" size={54} color={theme.primary} />
            <Text style={[styles.adTitle, { color: theme.text }]}>
              Discover More Android Utilities
            </Text>
            <Text style={[styles.adBody, { color: theme.textSecondary }]}>
              Fast, lightweight and offline-ready apps built for modern devices.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://play.google.com/store')}
              style={[styles.installBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.installBtnText}>Learn More</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 15,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginRight: 8,
  },
  badgeText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
  },
  adMobText: {
    fontSize: 12,
    flex: 1,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 2,
  },
  creativeArea: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  adTitle: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 8,
  },
  adBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  installBtn: {
    paddingHorizontal: 28,
    paddingVertical: 11,
    borderRadius: 10,
  },
  installBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
