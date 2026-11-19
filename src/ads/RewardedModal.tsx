import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface Props {
  visible: boolean;
  rewardTitle?: string;
  onRewarded: () => void;
  onClose: () => void;
}

export const RewardedModal: React.FC<Props> = ({
  visible,
  rewardTitle = 'Extra Life',
  onRewarded,
  onClose,
}) => {
  const { theme } = useTheme();
  const [countdown, setCountdown] = useState(5);
  const [rewardGranted, setRewardGranted] = useState(false);

  useEffect(() => {
    if (!visible) {
      setCountdown(5);
      setRewardGranted(false);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setRewardGranted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible]);

  const handleClaim = () => {
    onRewarded();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.adCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Ad</Text>
            </View>
            <Text style={[styles.sponsorText, { color: theme.textMuted }]}>
              Sponsored Video • Google AdMob
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Ad Canvas simulation */}
          <View style={[styles.canvas, { backgroundColor: theme.background }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="gift" size={42} color="#10B981" />
            </View>
            <Text style={[styles.adHeading, { color: theme.text }]}>
              Reward: {rewardTitle}
            </Text>
            <Text style={[styles.adDesc, { color: theme.textSecondary }]}>
              Thank you for supporting ToolBox X! Enjoy your free game bonus.
            </Text>

            {countdown > 0 ? (
              <View style={styles.countdownRow}>
                <ActivityIndicator size="small" color="#10B981" />
                <Text style={[styles.countdownText, { color: theme.textMuted }]}>
                  Reward in {countdown}s...
                </Text>
              </View>
            ) : (
              <View style={styles.rewardedBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.rewardedText}>Reward Unlocked!</Text>
              </View>
            )}
          </View>

          {/* Action */}
          <TouchableOpacity
            disabled={countdown > 0}
            activeOpacity={0.8}
            onPress={handleClaim}
            style={[
              styles.actionBtn,
              { backgroundColor: countdown > 0 ? theme.border : theme.primary },
            ]}
          >
            <Text
              style={[
                styles.actionBtnText,
                { color: countdown > 0 ? theme.textMuted : '#FFFFFF' },
              ]}
            >
              {countdown > 0 ? `Wait ${countdown}s to Claim` : `Claim ${rewardTitle}`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  adCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
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
    color: '#000000',
    fontSize: 10,
    fontWeight: '800',
  },
  sponsorText: {
    fontSize: 12,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  canvas: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  adHeading: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  adDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countdownText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rewardedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rewardedText: {
    color: '#10B981',
    fontWeight: '700',
    fontSize: 13,
  },
  actionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
