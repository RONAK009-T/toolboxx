import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { getHighScores, saveHighScore } from '../../storage/storage';

interface Props {
  onBack: () => void;
  onGameOver?: (score: number) => void;
}

type GameState = 'idle' | 'waiting' | 'ready' | 'result' | 'early';

export const GameReactionScreen: React.FC<Props> = ({ onBack, onGameOver }) => {
  const { theme } = useTheme();
  const { triggerHaptic, triggerSound } = usePreferences();

  const [gameState, setGameState] = useState<GameState>('idle');
  const [reactionTime, setReactionTime] = useState<number | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);

  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<any>(null);

  useEffect(() => {
    loadBestScore();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const loadBestScore = async () => {
    const scores = await getHighScores();
    const best = scores['game_reaction'];
    if (best) setBestTime(best);
  };

  const startTest = () => {
    triggerHaptic('light');
    setGameState('waiting');
    setReactionTime(null);

    // Random delay between 1.8s and 4.5s
    const delay = Math.floor(Math.random() * 2700) + 1800;

    timeoutRef.current = setTimeout(() => {
      setGameState('ready');
      startTimeRef.current = Date.now();
      triggerHaptic('heavy');
    }, delay);
  };

  const handleScreenPress = () => {
    if (gameState === 'idle' || gameState === 'result' || gameState === 'early') {
      startTest();
      return;
    }

    if (gameState === 'waiting') {
      // Tapped too early!
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      triggerHaptic('error');
      setGameState('early');
      return;
    }

    if (gameState === 'ready') {
      const diff = Date.now() - startTimeRef.current;
      triggerSound('win');
      triggerHaptic('success');
      setReactionTime(diff);
      setGameState('result');

      if (!bestTime || diff < bestTime) {
        setBestTime(diff);
        saveHighScore('game_reaction', diff);
      }
      if (onGameOver) onGameOver(diff);
    }
  };

  const getRating = (ms: number) => {
    if (ms < 200) return { title: 'Godlike Reflexes!', color: '#8B5CF6' };
    if (ms < 250) return { title: 'Excellent!', color: '#10B981' };
    if (ms < 300) return { title: 'Good Speed', color: '#38BDF8' };
    if (ms < 400) return { title: 'Average', color: '#F59E0B' };
    return { title: 'Need Coffee!', color: '#EF4444' };
  };

  const getBackgroundColor = () => {
    switch (gameState) {
      case 'waiting':
        return '#DC2626'; // Deep Red
      case 'ready':
        return '#16A34A'; // Vivid Green
      case 'early':
        return '#D97706'; // Amber Warning
      default:
        return theme.background;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <ScreenHeader
        title="Reaction Test"
        onBack={onBack}
        subtitle="Measure your reflex speed in milliseconds"
      />

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleScreenPress}
        style={styles.touchArea}
      >
        {gameState === 'idle' && (
          <View style={styles.contentBox}>
            <Ionicons name="flash-outline" size={72} color={theme.primary} />
            <Text style={[styles.mainTitle, { color: theme.text }]}>Reflex Test</Text>
            <Text style={[styles.mainSubtitle, { color: theme.textSecondary }]}>
              When screen turns GREEN, tap as fast as you can.
            </Text>
            {bestTime && (
              <Text style={[styles.bestBadge, { color: theme.primary }]}>
                Best Record: {bestTime} ms
              </Text>
            )}
            <View style={[styles.actionPrompt, { backgroundColor: theme.primary }]}>
              <Text style={styles.actionPromptText}>Tap Anywhere to Start</Text>
            </View>
          </View>
        )}

        {gameState === 'waiting' && (
          <View style={styles.contentBox}>
            <Ionicons name="hand-right" size={64} color="#FFF" />
            <Text style={styles.waitTitle}>Wait for Green...</Text>
            <Text style={styles.waitSub}>Don't tap yet!</Text>
          </View>
        )}

        {gameState === 'ready' && (
          <View style={styles.contentBox}>
            <Ionicons name="flash" size={80} color="#FFF" />
            <Text style={styles.readyTitle}>TAP NOW!</Text>
          </View>
        )}

        {gameState === 'early' && (
          <View style={styles.contentBox}>
            <Ionicons name="warning" size={64} color="#FFF" />
            <Text style={styles.waitTitle}>Too Soon!</Text>
            <Text style={styles.waitSub}>You tapped before it turned green.</Text>
            <View style={[styles.actionPrompt, { backgroundColor: '#B45309' }]}>
              <Text style={styles.actionPromptText}>Tap to Try Again</Text>
            </View>
          </View>
        )}

        {gameState === 'result' && reactionTime !== null && (
          <View style={styles.contentBox}>
            <Text style={[styles.timeDisplay, { color: theme.text }]}>
              {reactionTime} ms
            </Text>
            <Text style={[styles.ratingTitle, { color: getRating(reactionTime).color }]}>
              {getRating(reactionTime).title}
            </Text>
            {bestTime && (
              <Text style={[styles.bestBadge, { color: theme.textSecondary }]}>
                Personal Best: {bestTime} ms
              </Text>
            )}
            <View style={[styles.actionPrompt, { backgroundColor: theme.primary }]}>
              <Text style={styles.actionPromptText}>Tap to Test Again</Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  touchArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  contentBox: {
    alignItems: 'center',
    gap: 12,
  },
  mainTitle: { fontSize: 28, fontWeight: '800' },
  mainSubtitle: { fontSize: 14, textAlign: 'center', maxWidth: 280 },
  bestBadge: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  actionPrompt: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 18,
  },
  actionPromptText: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  waitTitle: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  waitSub: { fontSize: 16, color: '#FEE2E2' },
  readyTitle: { fontSize: 44, fontWeight: '900', color: '#FFF' },
  timeDisplay: { fontSize: 52, fontWeight: '900', fontVariant: ['tabular-nums'] },
  ratingTitle: { fontSize: 24, fontWeight: '800' },
});
