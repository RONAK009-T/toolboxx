import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
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

export const GameNumberGuessScreen: React.FC<Props> = ({ onBack, onGameOver }) => {
  const { theme } = useTheme();
  const { triggerHaptic, triggerSound } = usePreferences();

  const [targetNumber, setTargetNumber] = useState(0);
  const [guessInput, setGuessInput] = useState('');
  const [hint, setHint] = useState<string>('Guess a number between 1 and 100');
  const [hintType, setHintType] = useState<'neutral' | 'higher' | 'lower' | 'correct'>('neutral');
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(7);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasWon, setHasWon] = useState(false);
  const [bestScore, setBestScore] = useState(0);

  useEffect(() => {
    loadHighScore();
    initGame();
  }, []);

  const loadHighScore = async () => {
    const scores = await getHighScores();
    setBestScore(scores['game_guess_number'] || 0);
  };

  const initGame = () => {
    const secret = Math.floor(Math.random() * 100) + 1;
    setTargetNumber(secret);
    setGuessInput('');
    setHint('Guess a number between 1 and 100');
    setHintType('neutral');
    setAttempts(0);
    setIsGameOver(false);
    setHasWon(false);
  };

  const handleGuess = () => {
    const num = parseInt(guessInput, 10);
    if (isNaN(num) || num < 1 || num > 100) return;

    triggerHaptic('light');
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setGuessInput('');

    if (num === targetNumber) {
      triggerSound('win');
      triggerHaptic('success');
      setHint(`🎉 Correct! You guessed ${targetNumber} in ${nextAttempts} tries!`);
      setHintType('correct');
      setHasWon(true);
      setIsGameOver(true);

      const score = Math.max(10, (maxAttempts - nextAttempts + 1) * 100);
      if (score > bestScore) {
        setBestScore(score);
        saveHighScore('game_guess_number', score);
      }
      if (onGameOver) onGameOver(score);
    } else if (nextAttempts >= maxAttempts) {
      triggerSound('gameover');
      triggerHaptic('error');
      setHint(`Out of attempts! The number was ${targetNumber}.`);
      setHintType('neutral');
      setIsGameOver(true);
      if (onGameOver) onGameOver(0);
    } else if (num < targetNumber) {
      triggerHaptic('medium');
      setHint(`📈 ${num} is too LOW! Guess higher.`);
      setHintType('higher');
    } else {
      triggerHaptic('medium');
      setHint(`📉 ${num} is too HIGH! Guess lower.`);
      setHintType('lower');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Number Guessing"
        onBack={onBack}
        subtitle="Binary search intuition against the machine"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Score & Attempts Bar */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statTitle, { color: theme.textSecondary }]}>ATTEMPTS</Text>
            <Text style={[styles.statVal, { color: theme.text }]}>{attempts} / {maxAttempts}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statTitle, { color: theme.textSecondary }]}>HIGH SCORE</Text>
            <Text style={[styles.statVal, { color: theme.primary }]}>{bestScore}</Text>
          </View>
        </View>

        {/* Clue / Feedback Card */}
        <View style={[styles.clueCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons
            name={
              hintType === 'correct'
                ? 'trophy'
                : hintType === 'higher'
                ? 'arrow-up-circle'
                : hintType === 'lower'
                ? 'arrow-down-circle'
                : 'help-circle-outline'
            }
            size={48}
            color={
              hintType === 'correct'
                ? '#10B981'
                : hintType === 'higher'
                ? '#38BDF8'
                : hintType === 'lower'
                ? '#F59E0B'
                : theme.textMuted
            }
          />
          <Text style={[styles.clueText, { color: theme.text }]}>{hint}</Text>
        </View>

        {/* Guess Input Card */}
        {!isGameOver ? (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Your Guess (1 - 100)</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={3}
              value={guessInput}
              onChangeText={setGuessInput}
              onSubmitEditing={handleGuess}
              placeholder="e.g. 50"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />

            <TouchableOpacity
              onPress={handleGuess}
              style={[styles.guessBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.guessBtnText}>Submit Guess</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TouchableOpacity onPress={initGame} style={[styles.guessBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.guessBtnText}>Play Next Round</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  statTitle: { fontSize: 11, fontWeight: '700' },
  statVal: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  clueCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  clueText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    width: '60%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 16,
  },
  guessBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  guessBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
