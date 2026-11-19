import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface Props {
  isOnline: boolean;
  isSimulatedOffline?: boolean;
  onPress?: () => void;
}

export const NetworkStatusPill: React.FC<Props> = ({
  isOnline,
  isSimulatedOffline = false,
  onPress,
}) => {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: isOnline
            ? 'rgba(16, 185, 129, 0.12)'
            : 'rgba(245, 158, 11, 0.14)',
          borderColor: isOnline ? '#10B981' : '#F59E0B',
        },
      ]}
    >
      <View
        style={[
          styles.dot,
          { backgroundColor: isOnline ? '#10B981' : '#F59E0B' },
        ]}
      />
      <Text
        style={[
          styles.text,
          { color: isOnline ? '#10B981' : '#F59E0B' },
        ]}
      >
        {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
      </Text>
      {isSimulatedOffline && (
        <Ionicons name="flask-outline" size={12} color="#F59E0B" style={{ marginLeft: 2 }} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
});
