import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';

interface Props {
  onBack: () => void;
}

export const TimerScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic, triggerSound } = usePreferences();

  // Configured duration
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);

  // Runtime state
  const [totalSeconds, setTotalSeconds] = useState(300);
  const [remainingSeconds, setRemainingSeconds] = useState(300);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isRunning && remainingSeconds > 0) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval!);
            setIsRunning(false);
            triggerSound('win');
            triggerHaptic('success');
            Alert.alert('Timer Complete', 'Time has expired!');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, remainingSeconds]);

  const handleStart = () => {
    triggerHaptic('medium');
    if (remainingSeconds === 0) {
      const total = hours * 3600 + minutes * 60 + seconds;
      if (total <= 0) return;
      setTotalSeconds(total);
      setRemainingSeconds(total);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    triggerHaptic('light');
    setIsRunning(false);
  };

  const handleReset = () => {
    triggerHaptic('light');
    setIsRunning(false);
    const total = hours * 3600 + minutes * 60 + seconds;
    setTotalSeconds(total);
    setRemainingSeconds(total);
  };

  const updateSetting = (type: 'h' | 'm' | 's', delta: number) => {
    triggerHaptic('light');
    setIsRunning(false);
    let newH = hours;
    let newM = minutes;
    let newS = seconds;

    if (type === 'h') newH = Math.max(0, Math.min(23, hours + delta));
    if (type === 'm') newM = Math.max(0, Math.min(59, minutes + delta));
    if (type === 's') newS = Math.max(0, Math.min(59, seconds + delta));

    setHours(newH);
    setMinutes(newM);
    setSeconds(newS);

    const total = newH * 3600 + newM * 60 + newS;
    setTotalSeconds(total);
    setRemainingSeconds(total);
  };

  const h = Math.floor(remainingSeconds / 3600);
  const m = Math.floor((remainingSeconds % 3600) / 60);
  const s = remainingSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');

  const progressPercent = totalSeconds > 0 ? (remainingSeconds / totalSeconds) * 100 : 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Countdown Timer"
        onBack={onBack}
        subtitle="Custom interval alert & timer"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Visual Progress Dial */}
        <View
          style={[
            styles.timerRing,
            {
              backgroundColor: theme.surface,
              borderColor: isRunning ? theme.primary : theme.border,
            },
          ]}
        >
          <Text style={[styles.timerDigits, { color: theme.text }]}>
            {pad(h)}:{pad(m)}:{pad(s)}
          </Text>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${progressPercent}%`, backgroundColor: theme.primary },
              ]}
            />
          </View>
        </View>

        {/* Stepper Inputs */}
        {!isRunning && (
          <View style={[styles.stepperCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.stepperHeader, { color: theme.text }]}>Set Duration</Text>

            <View style={styles.steppersRow}>
              {/* Hours */}
              <View style={styles.stepperCol}>
                <TouchableOpacity onPress={() => updateSetting('h', 1)} style={styles.stepBtn}>
                  <Ionicons name="chevron-up" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.stepperVal, { color: theme.text }]}>{pad(hours)}</Text>
                <Text style={[styles.stepperUnit, { color: theme.textMuted }]}>Hours</Text>
                <TouchableOpacity onPress={() => updateSetting('h', -1)} style={styles.stepBtn}>
                  <Ionicons name="chevron-down" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.colon, { color: theme.border }]}>:</Text>

              {/* Minutes */}
              <View style={styles.stepperCol}>
                <TouchableOpacity onPress={() => updateSetting('m', 1)} style={styles.stepBtn}>
                  <Ionicons name="chevron-up" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.stepperVal, { color: theme.text }]}>{pad(minutes)}</Text>
                <Text style={[styles.stepperUnit, { color: theme.textMuted }]}>Mins</Text>
                <TouchableOpacity onPress={() => updateSetting('m', -1)} style={styles.stepBtn}>
                  <Ionicons name="chevron-down" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.colon, { color: theme.border }]}>:</Text>

              {/* Seconds */}
              <View style={styles.stepperCol}>
                <TouchableOpacity onPress={() => updateSetting('s', 5)} style={styles.stepBtn}>
                  <Ionicons name="chevron-up" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.stepperVal, { color: theme.text }]}>{pad(seconds)}</Text>
                <Text style={[styles.stepperUnit, { color: theme.textMuted }]}>Secs</Text>
                <TouchableOpacity onPress={() => updateSetting('s', -5)} style={styles.stepBtn}>
                  <Ionicons name="chevron-down" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Action Controls */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={handleReset}
            style={[styles.actionBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.actionBtnText, { color: theme.text }]}>Reset</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={isRunning ? handlePause : handleStart}
            style={[styles.actionBtn, { backgroundColor: isRunning ? theme.warning : theme.primary, borderColor: isRunning ? theme.warning : theme.primary }]}
          >
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>
              {isRunning ? 'Pause' : 'Start'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  timerRing: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 3,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    elevation: 4,
    padding: 20,
  },
  timerDigits: {
    fontSize: 42,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    marginBottom: 16,
  },
  progressTrack: {
    width: 140,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  stepperCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 24,
  },
  stepperHeader: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  steppersRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  stepperCol: {
    alignItems: 'center',
  },
  stepBtn: {
    padding: 8,
  },
  stepperVal: {
    fontSize: 32,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  stepperUnit: {
    fontSize: 11,
    fontWeight: '600',
  },
  colon: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
