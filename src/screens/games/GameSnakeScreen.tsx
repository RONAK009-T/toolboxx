import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
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

interface Point {
  x: number;
  y: number;
}

const GRID_SIZE = 16;

export const GameSnakeScreen: React.FC<Props> = ({ onBack, onGameOver }) => {
  const { theme } = useTheme();
  const { triggerHaptic, triggerSound } = usePreferences();

  const [snake, setSnake] = useState<Point[]>([
    { x: 8, y: 8 },
    { x: 8, y: 9 },
    { x: 8, y: 10 },
  ]);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('UP');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const directionRef = useRef<'UP' | 'DOWN' | 'LEFT' | 'RIGHT'>('UP');
  directionRef.current = direction;

  useEffect(() => {
    loadHighScore();
    spawnFood();
  }, []);

  const loadHighScore = async () => {
    const scores = await getHighScores();
    setHighScore(scores['game_snake'] || 0);
  };

  const spawnFood = () => {
    const x = Math.floor(Math.random() * GRID_SIZE);
    const y = Math.floor(Math.random() * GRID_SIZE);
    setFood({ x, y });
  };

  const restartGame = () => {
    setSnake([
      { x: 8, y: 8 },
      { x: 8, y: 9 },
      { x: 8, y: 10 },
    ]);
    setDirection('UP');
    directionRef.current = 'UP';
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    spawnFood();
  };

  // Game Loop
  useEffect(() => {
    if (isGameOver || isPaused) return;

    // Speed increases as score increases
    const speed = Math.max(90, 180 - Math.floor(score / 5) * 10);

    const interval = setInterval(() => {
      setSnake((prevSnake) => {
        const head = { ...prevSnake[0] };
        const dir = directionRef.current;

        if (dir === 'UP') head.y -= 1;
        if (dir === 'DOWN') head.y += 1;
        if (dir === 'LEFT') head.x -= 1;
        if (dir === 'RIGHT') head.x += 1;

        // Collision with walls
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          handleDeath();
          return prevSnake;
        }

        // Collision with self
        for (let i = 0; i < prevSnake.length; i++) {
          if (prevSnake[i].x === head.x && prevSnake[i].y === head.y) {
            handleDeath();
            return prevSnake;
          }
        }

        const newSnake = [head, ...prevSnake];

        // Eat food
        if (head.x === food.x && head.y === food.y) {
          triggerHaptic('light');
          triggerSound('score');
          const nextScore = score + 10;
          setScore(nextScore);
          if (nextScore > highScore) {
            setHighScore(nextScore);
            saveHighScore('game_snake', nextScore);
          }
          spawnFood();
        } else {
          newSnake.pop();
        }

        return newSnake;
      });
    }, speed);

    return () => clearInterval(interval);
  }, [food, score, isGameOver, isPaused, highScore]);

  const handleDeath = () => {
    setIsGameOver(true);
    triggerSound('gameover');
    triggerHaptic('error');
    saveHighScore('game_snake', score);
    if (onGameOver) onGameOver(score);
  };

  const changeDirection = (newDir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') => {
    triggerHaptic('light');
    const current = directionRef.current;
    if (newDir === 'UP' && current === 'DOWN') return;
    if (newDir === 'DOWN' && current === 'UP') return;
    if (newDir === 'LEFT' && current === 'RIGHT') return;
    if (newDir === 'RIGHT' && current === 'LEFT') return;
    setDirection(newDir);
  };

  const boardSize = Math.min(Dimensions.get('window').width - 32, 330);
  const cellSize = boardSize / GRID_SIZE;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Retro Snake"
        onBack={onBack}
        subtitle="Eat food, avoid walls & beat your high score"
        rightAction={{
          icon: isPaused ? 'play' : 'pause',
          onPress: () => {
            triggerHaptic('light');
            setIsPaused(!isPaused);
          },
        }}
      />

      {/* Score Header */}
      <View style={styles.scoreRow}>
        <View style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.badgeTitle, { color: theme.textSecondary }]}>SCORE</Text>
          <Text style={[styles.badgeVal, { color: theme.text }]}>{score}</Text>
        </View>

        <View style={[styles.badge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.badgeTitle, { color: theme.textSecondary }]}>BEST</Text>
          <Text style={[styles.badgeVal, { color: theme.primary }]}>{highScore}</Text>
        </View>
      </View>

      {/* Game Board Canvas */}
      <View
        style={[
          styles.board,
          {
            width: boardSize,
            height: boardSize,
            backgroundColor: theme.isDark ? '#0F172A' : '#1E293B',
            borderColor: theme.border,
          },
        ]}
      >
        {/* Render Snake */}
        {snake.map((part, index) => (
          <View
            key={`snake-${index}`}
            style={[
              styles.cell,
              {
                width: cellSize - 1,
                height: cellSize - 1,
                left: part.x * cellSize,
                top: part.y * cellSize,
                backgroundColor: index === 0 ? '#34D399' : theme.primary,
                borderRadius: index === 0 ? 4 : 2,
              },
            ]}
          />
        ))}

        {/* Render Food */}
        <View
          style={[
            styles.cell,
            {
              width: cellSize - 1,
              height: cellSize - 1,
              left: food.x * cellSize,
              top: food.y * cellSize,
              backgroundColor: '#EF4444',
              borderRadius: cellSize / 2,
            },
          ]}
        />

        {/* Game Over Overlay */}
        {isGameOver && (
          <View style={styles.overlay}>
            <Text style={styles.overTitle}>Crash!</Text>
            <Text style={styles.overScore}>Score: {score}</Text>
            <TouchableOpacity onPress={restartGame} style={[styles.overBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.overBtnText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* D-Pad Controls */}
      <View style={styles.dpad}>
        <TouchableOpacity onPress={() => changeDirection('UP')} style={[styles.dpadBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="caret-up" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.dpadRow}>
          <TouchableOpacity onPress={() => changeDirection('LEFT')} style={[styles.dpadBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="caret-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeDirection('DOWN')} style={[styles.dpadBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="caret-down" size={24} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => changeDirection('RIGHT')} style={[styles.dpadBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="caret-forward" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  scoreRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 14,
  },
  badge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 90,
  },
  badgeTitle: { fontSize: 10, fontWeight: '700' },
  badgeVal: { fontSize: 18, fontWeight: '800' },
  board: {
    borderRadius: 16,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  cell: {
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overTitle: { fontSize: 26, fontWeight: '800', color: '#EF4444', marginBottom: 6 },
  overScore: { fontSize: 16, color: '#FFF', marginBottom: 16 },
  overBtn: { paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10 },
  overBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  dpad: {
    marginTop: 20,
    alignItems: 'center',
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 6,
  },
  dpadBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
});
