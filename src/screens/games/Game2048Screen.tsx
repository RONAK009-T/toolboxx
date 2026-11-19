import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Modal,
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

type Board = number[][];

const BOARD_SIZE = 4;

export const Game2048Screen: React.FC<Props> = ({ onBack, onGameOver }) => {
  const { theme } = useTheme();
  const { triggerHaptic, triggerSound } = usePreferences();

  const [board, setBoard] = useState<Board>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [instructionsModal, setInstructionsModal] = useState(false);

  useEffect(() => {
    loadHighScore();
    initGame();
  }, []);

  const loadHighScore = async () => {
    const scores = await getHighScores();
    setHighScore(scores['game_2048'] || 0);
  };

  const getEmptyCells = (grid: Board) => {
    const cells: { r: number; c: number }[] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (grid[r][c] === 0) cells.push({ r, c });
      }
    }
    return cells;
  };

  const addRandomTile = (grid: Board) => {
    const empty = getEmptyCells(grid);
    if (empty.length === 0) return grid;
    const randomCell = empty[Math.floor(Math.random() * empty.length)];
    const newGrid = grid.map((row) => [...row]);
    newGrid[randomCell.r][randomCell.c] = Math.random() < 0.9 ? 2 : 4;
    return newGrid;
  };

  const initGame = () => {
    let grid: Board = Array(BOARD_SIZE)
      .fill(0)
      .map(() => Array(BOARD_SIZE).fill(0));
    grid = addRandomTile(grid);
    grid = addRandomTile(grid);
    setBoard(grid);
    setScore(0);
    setGameOver(false);
    setWon(false);
  };

  const checkGameOver = (grid: Board) => {
    if (getEmptyCells(grid).length > 0) return false;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const val = grid[r][c];
        if (r < BOARD_SIZE - 1 && grid[r + 1][c] === val) return false;
        if (c < BOARD_SIZE - 1 && grid[r][c + 1] === val) return false;
      }
    }
    return true;
  };

  // Sliding & Merging logic
  const slideRowLeft = (row: number[]) => {
    const filtered = row.filter((n) => n !== 0);
    const newRow: number[] = [];
    let scoreGained = 0;

    for (let i = 0; i < filtered.length; i++) {
      if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
        const mergedVal = filtered[i] * 2;
        newRow.push(mergedVal);
        scoreGained += mergedVal;
        if (mergedVal === 2048) setWon(true);
        i++;
      } else {
        newRow.push(filtered[i]);
      }
    }

    while (newRow.length < BOARD_SIZE) {
      newRow.push(0);
    }

    return { row: newRow, scoreGained };
  };

  const moveLeft = (grid: Board) => {
    let changed = false;
    let gained = 0;
    const newGrid = grid.map((r) => {
      const { row, scoreGained } = slideRowLeft(r);
      gained += scoreGained;
      if (row.some((val, idx) => val !== r[idx])) changed = true;
      return row;
    });
    return { grid: newGrid, changed, gained };
  };

  const rotateGridClockwise = (grid: Board): Board => {
    const newGrid: Board = Array(BOARD_SIZE)
      .fill(0)
      .map(() => Array(BOARD_SIZE).fill(0));
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        newGrid[c][BOARD_SIZE - 1 - r] = grid[r][c];
      }
    }
    return newGrid;
  };

  const handleMove = (direction: 'left' | 'right' | 'up' | 'down') => {
    if (gameOver || board.length === 0) return;

    let current = board.map((r) => [...r]);
    let rotations = 0;

    if (direction === 'up') rotations = 3;
    if (direction === 'right') rotations = 2;
    if (direction === 'down') rotations = 1;

    for (let i = 0; i < rotations; i++) {
      current = rotateGridClockwise(current);
    }

    const { grid: moved, changed, gained } = moveLeft(current);

    if (changed) {
      let finalGrid = moved;
      const reverseRotations = (4 - rotations) % 4;
      for (let i = 0; i < reverseRotations; i++) {
        finalGrid = rotateGridClockwise(finalGrid);
      }

      finalGrid = addRandomTile(finalGrid);
      const newScore = score + gained;
      setScore(newScore);
      setBoard(finalGrid);
      triggerHaptic('light');

      if (newScore > highScore) {
        setHighScore(newScore);
        saveHighScore('game_2048', newScore);
      }

      if (checkGameOver(finalGrid)) {
        setGameOver(true);
        triggerSound('gameover');
        triggerHaptic('error');
        saveHighScore('game_2048', newScore);
        if (onGameOver) onGameOver(newScore);
      }
    }
  };

  // Swipe gestures PanResponder
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 10 || Math.abs(gesture.dy) > 10,
      onPanResponderRelease: (_, gesture) => {
        const { dx, dy } = gesture;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        if (Math.max(absX, absY) > 25) {
          if (absX > absY) {
            handleMove(dx > 0 ? 'right' : 'left');
          } else {
            handleMove(dy > 0 ? 'down' : 'up');
          }
        }
      },
    })
  ).current;

  // Colors for 2048 tiles
  const getTileColor = (val: number) => {
    switch (val) {
      case 2:
        return { bg: '#EEE4DA', text: '#776E65' };
      case 4:
        return { bg: '#EDE0C8', text: '#776E65' };
      case 8:
        return { bg: '#F2B179', text: '#F9F6F2' };
      case 16:
        return { bg: '#F59563', text: '#F9F6F2' };
      case 32:
        return { bg: '#F67C5F', text: '#F9F6F2' };
      case 64:
        return { bg: '#F65E3B', text: '#F9F6F2' };
      case 128:
        return { bg: '#EDCF72', text: '#F9F6F2' };
      case 256:
        return { bg: '#EDCC61', text: '#F9F6F2' };
      case 512:
        return { bg: '#EDC850', text: '#F9F6F2' };
      case 1024:
        return { bg: '#EDC53F', text: '#F9F6F2' };
      case 2048:
        return { bg: '#EDC22E', text: '#F9F6F2' };
      default:
        return { bg: '#3C3A32', text: '#F9F6F2' };
    }
  };

  const boardWidth = Math.min(Dimensions.get('window').width - 32, 340);
  const tileSize = (boardWidth - 40) / 4;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="2048 Puzzle"
        onBack={onBack}
        subtitle="Swipe to merge matching tiles"
        rightAction={{
          icon: 'help-circle-outline',
          onPress: () => setInstructionsModal(true),
        }}
      />

      {/* Score Header */}
      <View style={styles.scoreRow}>
        <View style={[styles.scoreBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.scoreTitle, { color: theme.textSecondary }]}>SCORE</Text>
          <Text style={[styles.scoreVal, { color: theme.text }]}>{score}</Text>
        </View>

        <View style={[styles.scoreBadge, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.scoreTitle, { color: theme.textSecondary }]}>BEST</Text>
          <Text style={[styles.scoreVal, { color: theme.primary }]}>{highScore}</Text>
        </View>

        <TouchableOpacity
          onPress={initGame}
          style={[styles.restartBtn, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="refresh" size={20} color="#FFF" />
          <Text style={styles.restartBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable Game Grid */}
      <View
        {...panResponder.panHandlers}
        style={[
          styles.gridContainer,
          {
            width: boardWidth,
            height: boardWidth,
            backgroundColor: theme.isDark ? '#1E293B' : '#BBADA0',
          },
        ]}
      >
        {board.map((row, rIdx) => (
          <View key={`row-${rIdx}`} style={styles.gridRow}>
            {row.map((cell, cIdx) => {
              const tileColor = cell > 0 ? getTileColor(cell) : null;
              return (
                <View
                  key={`cell-${rIdx}-${cIdx}`}
                  style={[
                    styles.cell,
                    {
                      width: tileSize,
                      height: tileSize,
                      backgroundColor: tileColor
                        ? tileColor.bg
                        : theme.isDark
                        ? '#0F172A'
                        : '#CDC1B4',
                    },
                  ]}
                >
                  {cell > 0 && (
                    <Text
                      style={[
                        styles.cellText,
                        {
                          color: tileColor?.text,
                          fontSize: cell > 512 ? 18 : 22,
                        },
                      ]}
                    >
                      {cell}
                    </Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        {gameOver && (
          <View style={styles.overlay}>
            <Text style={styles.overTitle}>Game Over!</Text>
            <Text style={styles.overScore}>Final Score: {score}</Text>
            <TouchableOpacity onPress={initGame} style={[styles.overBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.overBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* On-screen Directional D-Pad for accessibility */}
      <View style={styles.dpadContainer}>
        <TouchableOpacity onPress={() => handleMove('up')} style={[styles.dpadBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="arrow-up" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.dpadRow}>
          <TouchableOpacity onPress={() => handleMove('left')} style={[styles.dpadBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleMove('down')} style={[styles.dpadBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="arrow-down" size={22} color={theme.text} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleMove('right')} style={[styles.dpadBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="arrow-forward" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Instructions Modal */}
      <Modal visible={instructionsModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>How to Play 2048</Text>
            <Text style={[styles.modalText, { color: theme.textSecondary }]}>
              • Swipe anywhere on the board or tap the arrow buttons to slide tiles.{'\n\n'}
              • When two identical numbers collide, they merge into their sum (2+2=4, 4+4=8...){'\n\n'}
              • Continue merging tiles until you create the 2048 tile!
            </Text>
            <TouchableOpacity onPress={() => setInstructionsModal(false)} style={[styles.modalBtn, { backgroundColor: theme.primary }]}>
              <Text style={styles.modalBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  scoreRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 14,
    alignItems: 'center',
  },
  scoreBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  scoreTitle: { fontSize: 10, fontWeight: '700' },
  scoreVal: { fontSize: 18, fontWeight: '800' },
  restartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  restartBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  gridContainer: {
    borderRadius: 16,
    padding: 8,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cell: {
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cellText: {
    fontWeight: '800',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', marginBottom: 8 },
  overScore: { fontSize: 16, color: '#DDD', marginBottom: 18 },
  overBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  overBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  dpadContainer: {
    marginTop: 18,
    alignItems: 'center',
  },
  dpadRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 6,
  },
  dpadBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalText: { fontSize: 14, lineHeight: 22, marginBottom: 20 },
  modalBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalBtnText: { color: '#FFF', fontWeight: '700' },
});
