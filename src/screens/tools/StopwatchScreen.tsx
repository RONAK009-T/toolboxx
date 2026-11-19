import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';

interface Props {
  onBack: () => void;
}

interface Lap {
  index: number;
  timeMs: number;
  diffMs: number;
}

export const StopwatchScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [elapsedMs, setElapsedMs] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [laps, setLaps] = useState<Lap[]>([]);

  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      startTimeRef.current = Date.now() - elapsedMs;

      const tick = () => {
        setElapsedMs(Date.now() - startTimeRef.current);
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      animationFrameRef.current = requestAnimationFrame(tick);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isRunning]);

  const handleStartStop = () => {
    triggerHaptic('medium');
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    triggerHaptic('light');
    setIsRunning(false);
    setElapsedMs(0);
    setLaps([]);
  };

  const handleLap = () => {
    triggerHaptic('light');
    const lastLapTime = laps.length > 0 ? laps[0].timeMs : 0;
    const diffMs = elapsedMs - lastLapTime;
    const newLap: Lap = {
      index: laps.length + 1,
      timeMs: elapsedMs,
      diffMs,
    };
    setLaps([newLap, ...laps]);
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const centiseconds = Math.floor((ms % 1000) / 10);

    const pad = (n: number) => n.toString().padStart(2, '0');
    return {
      min: pad(minutes),
      sec: pad(seconds),
      centi: pad(centiseconds),
    };
  };

  const time = formatTime(elapsedMs);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Stopwatch"
        onBack={onBack}
        subtitle="Millisecond accuracy & lap recording"
      />

      <View style={styles.content}>
        {/* Main Digital Clock */}
        <View style={[styles.timerCircle, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.digitsRow}>
            <Text style={[styles.mainDigits, { color: theme.text }]}>{time.min}:</Text>
            <Text style={[styles.mainDigits, { color: theme.text }]}>{time.sec}</Text>
            <Text style={[styles.smallDigits, { color: theme.primary }]}>.{time.centi}</Text>
          </View>
        </View>

        {/* Control Buttons */}
        <View style={styles.controlsRow}>
          <TouchableOpacity
            disabled={elapsedMs === 0}
            onPress={isRunning ? handleLap : handleReset}
            style={[
              styles.controlBtn,
              {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                opacity: elapsedMs === 0 ? 0.4 : 1,
              },
            ]}
          >
            <Text style={[styles.controlBtnText, { color: theme.text }]}>
              {isRunning ? 'Lap' : 'Reset'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleStartStop}
            style={[
              styles.controlBtn,
              {
                backgroundColor: isRunning ? theme.error : theme.primary,
                borderColor: isRunning ? theme.error : theme.primary,
              },
            ]}
          >
            <Text style={[styles.controlBtnText, { color: '#FFF' }]}>
              {isRunning ? 'Pause' : 'Start'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Laps List */}
        <ScrollView style={styles.lapsScroll}>
          {laps.map((lap) => {
            const lapTime = formatTime(lap.timeMs);
            const lapDiff = formatTime(lap.diffMs);
            return (
              <View
                key={lap.index}
                style={[styles.lapRow, { borderBottomColor: theme.border }]}
              >
                <Text style={[styles.lapIndex, { color: theme.textSecondary }]}>
                  Lap {lap.index}
                </Text>
                <Text style={[styles.lapDiff, { color: theme.textMuted }]}>
                  +{lapDiff.min}:{lapDiff.sec}.{lapDiff.centi}
                </Text>
                <Text style={[styles.lapTime, { color: theme.text }]}>
                  {lapTime.min}:{lapTime.sec}.{lapTime.centi}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 20 },
  timerCircle: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 24,
    elevation: 4,
  },
  digitsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  mainDigits: {
    fontSize: 48,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  smallDigits: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    width: 44,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  controlBtn: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  controlBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  lapsScroll: {
    flex: 1,
  },
  lapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lapIndex: {
    fontSize: 14,
    fontWeight: '600',
  },
  lapDiff: {
    fontSize: 13,
  },
  lapTime: {
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
