import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { getSettings } from '../storage/storage';

export const usePreferences = () => {
  const triggerHaptic = useCallback(async (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
    try {
      const settings = await getSettings();
      if (!settings.vibrationEnabled) return;

      switch (type) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch {
      // Haptics unavailable on platform/web
    }
  }, []);

  const triggerSound = useCallback(async (action: 'tap' | 'score' | 'win' | 'gameover') => {
    try {
      const settings = await getSettings();
      if (!settings.soundEnabled) return;
      // Audio trigger placeholder using web audio or haptic cadence
      if (settings.vibrationEnabled) {
        if (action === 'gameover' || action === 'win') {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  return { triggerHaptic, triggerSound };
};
