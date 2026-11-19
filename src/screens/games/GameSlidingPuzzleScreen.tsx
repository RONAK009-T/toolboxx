import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
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

export const GameSlidingPuzzleScreen: React.FC<Props> = ({ onBack, onGameOver }) => {
  const { theme } = useTheme();
  const { triggerHaptic, triggerSound } = usePreferences();

  // 15 numbers (1-15) and 0 represents the blank slot
  const [tiles, setTiles] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [seconds, setSeconds] = useState<number>(0);
  const [isWon, setIsWon] = useState<boolean>(false);
  const [bestMoves, setBestMoves] = useState<number>(0);
  const [showWinModal, setShowWinModal] = useState<boolean>(false);

  useEffect(() => {
    loadHighScore();
    initGame();
  }, []);

  const loadHighScore = async () => {
    const scores = await getHighScores();
    setBestMoves(scores['game_sliding_puzzle'] || 0);
  };

  /**
   * Strictly verifies solvability of the 15-puzzle.
   * On a 4x4 grid (even width):
   * Solvable if and only if:
   * (inversions + blankRowFromBottom) % 2 === 1
   * where blankRowFromBottom is 1-indexed (bottom row = 1).
   */
  const isSolvable = (arr: number[]): boolean => {
    let inversions = 0;
    for (let i = 0; i < 15; i++) {
      for (let j = i + 1; j < 16; j++) {
        if (arr[i] && arr[j] && arr[i] > arr[j]) {
          inversions++;
        }
      }
    }
    const blankRowFromBottom = 4 - Math.floor(arr.indexOf(0) / 4);
    return (inversions + blankRowFromBottom) % 2 === 1;
  };

  const isFinished = (arr: number[]): boolean => {
    for (let i = 0; i < 15; i++) {
      if (arr[i] !== i + 1) return false;
    }
    return arr[15] === 0;
  };

  const initGame = () => {
    let initial: number[] = [];
    do {
      initial = Array.from({ length: 16 }, (_, i) => (i === 15 ? 0 : i + 1)).sort(
        () => Math.random() - 0.5
      );
    } while (!isSolvable(initial) || isFinished(initial));

    setTiles(initial);
    setMoves(0);
    setSeconds(0);
    setIsWon(false);
    setShowWinModal(false);
  };

  // Timer formatted MM:SS
  useEffect(() => {
    if (isWon || tiles.length === 0) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isWon, tiles]);

  const formatTimer = (totalSecs: number): string => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const handleTilePress = (index: number) => {
    if (isWon || tiles[index] === 0) return;

    const blankIndex = tiles.indexOf(0);
    const row = Math.floor(index / 4);
    const col = index % 4;
    const blankRow = Math.floor(blankIndex / 4);
    const blankCol = blankIndex % 4;

    // Check if adjacent (manhattan distance = 1)
    const isAdjacent = Math.abs(row - blankRow) + Math.abs(col - blankCol) === 1;

    if (isAdjacent) {
      triggerHaptic('light');
      const nextTiles = [...tiles];
      nextTiles[blankIndex] = nextTiles[index];
      nextTiles[index] = 0;
      setTiles(nextTiles);
      const nextMoves = moves + 1;
      setMoves(nextMoves);

      if (isFinished(nextTiles)) {
        setIsWon(true);
        setShowWinModal(true);
        triggerSound('win');
        triggerHaptic('success');
        if (!bestMoves || nextMoves < bestMoves) {
          setBestMoves(nextMoves);
          saveHighScore('game_sliding_puzzle', nextMoves);
        }
        if (onGameOver) onGameOver(nextMoves);
      }
    }
  };

  const boardWidth = Math.min(Dimensions.get('window').width - 32, 330);
  const tileSize = (boardWidth - 36) / 4;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="15-Tile Sliding Puzzle"
        onBack={onBack}
        subtitle="Slide tiles in numerical order from 1 to 15"
      />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statTitle, { color: theme.textMuted }]}>MOVES</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{moves}</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statTitle, { color: theme.textMuted }]}>TIME</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{formatTimer(seconds)}</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statTitle, { color: theme.textMuted }]}>BEST RECORD</Text>
          <Text style={[styles.statVal, { color: theme.primary }]}>
            {bestMoves ? `${bestMoves} moves` : '--'}
          </Text>
        </View>
      </View>

      {/* 4x4 Grid Board */}
      <View
        style={[
          styles.board,
          {
            width: boardWidth,
            height: boardWidth,
            backgroundColor: theme.surface,
            borderColor: theme.border,
          },
        ]}
      >
        {tiles.map((val, idx) => (
          <TouchableOpacity
            key={`tile-${idx}`}
            activeOpacity={0.8}
            onPress={() => handleTilePress(idx)}
            style={[
              styles.tile,
              {
                width: tileSize,
                height: tileSize,
                backgroundColor: val === 0 ? 'transparent' : theme.isDark ? '#1E293B' : '#E2E8F0',
                borderColor: val === 0 ? 'transparent' : theme.border,
              },
            ]}
          >
            {val !== 0 && (
              <Text
                style={[
                  styles.tileText,
                  { color: val === idx + 1 ? theme.primary : theme.text },
                ]}
              >
                {val}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Action Footer */}
      <TouchableOpacity
        onPress={initGame}
        style={[styles.resetBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
      >
        <Ionicons name="refresh-outline" size={16} color={theme.text} />
        <Text style={[styles.resetBtnText, { color: theme.text }]}>Reshuffle Board</Text>
      </TouchableOpacity>

      {/* Win Celebration Modal */}
      <Modal
        visible={showWinModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowWinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={[styles.trophyCircle, { backgroundColor: '#16A34A' }]}>
              <Ionicons name="trophy" size={32} color="#FFFFFF" />
            </View>

            <Text style={[styles.modalTitle, { color: theme.text }]}>Puzzle Completed!</Text>
            <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
              All 15 tiles ordered sequentially
            </Text>

            <View style={[styles.modalStatGrid, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatLabel, { color: theme.textMuted }]}>TOTAL MOVES</Text>
                <Text style={[styles.modalStatVal, { color: theme.primary }]}>{moves}</Text>
              </View>
              <View style={styles.modalStatItem}>
                <Text style={[styles.modalStatLabel, { color: theme.textMuted }]}>ELAPSED TIME</Text>
                <Text style={[styles.modalStatVal, { color: theme.text }]}>{formatTimer(seconds)}</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={initGame}
              activeOpacity={0.85}
              style={[styles.modalActionBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.modalActionBtnText}>Play Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 16,
    width: '92%',
  },
  statBox: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  statTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  board: {
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 6,
    gap: 6,
    justifyContent: 'center',
    alignContent: 'center',
  },
  tile: {
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tileText: {
    fontSize: 22,
    fontWeight: '800',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '88%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  trophyCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  modalSub: {
    fontSize: 13,
    marginTop: 4,
    marginBottom: 18,
  },
  modalStatGrid: {
    flexDirection: 'row',
    width: '100%',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  modalStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  modalStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  modalStatVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  modalActionBtn: {
    width: '100%',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
