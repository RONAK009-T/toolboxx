import React, { useState, useEffect } from 'react';
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
import { getHighScores, saveHighScore } from '../../storage/storage';

interface Props {
  onBack: () => void;
  onGameOver?: (score: number) => void;
}

interface Question {
  text: string;
  correct: number;
  options: number[];
}

export const GameMathSprintScreen: React.FC<Props> = ({ onBack, onGameOver }) => {
  const { theme } = useTheme();
  const { triggerHaptic, triggerSound } = usePreferences();

  const [question, setQuestion] = useState<Question | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    loadHighScore();
  }, []);

  const loadHighScore = async () => {
    const scores = await getHighScores();
    setHighScore(scores['game_math_challenge'] || 0);
  };

  const generateQuestion = (): Question => {
    const operators = ['+', '-', '×', '÷'];
    const op = operators[Math.floor(Math.random() * operators.length)];
    let a = Math.floor(Math.random() * 20) + 2;
    let b = Math.floor(Math.random() * 20) + 2;
    let correct = 0;

    if (op === '+') {
      correct = a + b;
    } else if (op === '-') {
      if (a < b) [a, b] = [b, a];
      correct = a - b;
    } else if (op === '×') {
      a = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 10) + 2;
      correct = a * b;
    } else {
      // Division: clean integers
      b = Math.floor(Math.random() * 10) + 2;
      correct = Math.floor(Math.random() * 10) + 2;
      a = b * correct;
    }

    const wrong1 = correct + (Math.random() < 0.5 ? 2 : -2);
    const wrong2 = correct + (Math.random() < 0.5 ? 5 : -5);
    const wrong3 = Math.max(1, correct + (Math.random() < 0.5 ? 10 : -3));

    const options = Array.from(new Set([correct, wrong1, wrong2, wrong3]));
    while (options.length < 4) {
      options.push(correct + options.length * 3);
    }
    const shuffled = options.sort(() => Math.random() - 0.5);

    return {
      text: `${a} ${op} ${b}`,
      correct,
      options: shuffled,
    };
  };

  const startGame = () => {
    triggerHaptic('medium');
    setScore(0);
    setStreak(0);
    setTimeLeft(30);
    setIsPlaying(true);
    setGameOver(false);
    setQuestion(generateQuestion());
  };

  useEffect(() => {
    let timer: any = null;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer!);
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, timeLeft]);

  const endGame = () => {
    setIsPlaying(false);
    setGameOver(true);
    triggerSound('gameover');
    triggerHaptic('error');
    if (score > highScore) {
      setHighScore(score);
      saveHighScore('game_math_challenge', score);
    }
    if (onGameOver) onGameOver(score);
  };

  const handleSelectOption = (opt: number) => {
    if (!isPlaying || !question) return;

    if (opt === question.correct) {
      triggerSound('score');
      triggerHaptic('light');
      const newScore = score + 10 + streak * 2;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);
      setQuestion(generateQuestion());
    } else {
      triggerHaptic('error');
      setStreak(0);
      setQuestion(generateQuestion());
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Math Sprint Challenge"
        onBack={onBack}
        subtitle="Speed arithmetic against a 30s timer"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Game Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statTitle, { color: theme.textSecondary }]}>TIME</Text>
            <Text style={[styles.statVal, { color: timeLeft < 10 ? '#EF4444' : theme.text }]}>
              {timeLeft}s
            </Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statTitle, { color: theme.textSecondary }]}>SCORE</Text>
            <Text style={[styles.statVal, { color: theme.primary }]}>{score}</Text>
          </View>

          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statTitle, { color: theme.textSecondary }]}>STREAK</Text>
            <Text style={[styles.statVal, { color: '#F59E0B' }]}>🔥 {streak}</Text>
          </View>
        </View>

        {!isPlaying && !gameOver && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="infinite" size={54} color={theme.primary} />
            <Text style={[styles.cardHeading, { color: theme.text }]}>Ready for Math Sprint?</Text>
            <Text style={[styles.cardSub, { color: theme.textSecondary }]}>
              Answer as many arithmetic problems as you can before time expires. Streaks grant multiplier bonuses!
            </Text>
            <TouchableOpacity onPress={startGame} style={[styles.startBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.startBtnText}>Start Sprint</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPlaying && question && (
          <View style={[styles.questionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.questionText, { color: theme.text }]}>
              {question.text} = ?
            </Text>

            <View style={styles.optionsGrid}>
              {question.options.map((opt, idx) => (
                <TouchableOpacity
                  key={`opt-${idx}`}
                  activeOpacity={0.7}
                  onPress={() => handleSelectOption(opt)}
                  style={[styles.optBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                >
                  <Text style={[styles.optBtnText, { color: theme.text }]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {gameOver && (
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.overTitle, { color: theme.primary }]}>Time's Up!</Text>
            <Text style={[styles.finalScore, { color: theme.text }]}>Final Score: {score}</Text>
            <Text style={[styles.highScoreText, { color: theme.textSecondary }]}>
              Best Record: {Math.max(score, highScore)}
            </Text>
            <TouchableOpacity onPress={startGame} style={[styles.startBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.startBtnText}>Play Again</Text>
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
    marginBottom: 20,
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
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  cardHeading: { fontSize: 20, fontWeight: '800' },
  cardSub: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  startBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  startBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  questionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 44,
    fontWeight: '900',
    marginBottom: 24,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  optBtn: {
    width: '47%',
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  optBtnText: { fontSize: 24, fontWeight: '800' },
  overTitle: { fontSize: 24, fontWeight: '800' },
  finalScore: { fontSize: 32, fontWeight: '900' },
  highScoreText: { fontSize: 14, marginBottom: 12 },
});
