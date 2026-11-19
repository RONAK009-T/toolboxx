import React, { useState, useEffect } from 'react';
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

interface Card {
  id: number;
  icon: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const CARD_ICONS = [
  'star',
  'heart',
  'flash',
  'rocket',
  'flame',
  'planet',
  'cube',
  'trophy',
];

export const GameMemoryScreen: React.FC<Props> = ({ onBack, onGameOver }) => {
  const { theme } = useTheme();
  const { triggerHaptic, triggerSound } = usePreferences();

  const [cards, setCards] = useState<Card[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [bestMoves, setBestMoves] = useState(0);

  useEffect(() => {
    loadHighScore();
    initGame();
  }, []);

  const loadHighScore = async () => {
    const scores = await getHighScores();
    setBestMoves(scores['game_memory'] || 0);
  };

  const initGame = () => {
    // Generate pairs for 16 cards (8 pairs)
    const deck: Card[] = [];
    const duplicated = [...CARD_ICONS, ...CARD_ICONS];
    // Shuffle deck
    const shuffled = duplicated.sort(() => Math.random() - 0.5);

    shuffled.forEach((icon, idx) => {
      deck.push({
        id: idx,
        icon,
        isFlipped: false,
        isMatched: false,
      });
    });

    setCards(deck);
    setFlippedIndices([]);
    setMoves(0);
    setMatches(0);
    setSeconds(0);
    setIsCompleted(false);
  };

  // Timer
  useEffect(() => {
    if (isCompleted || matches === 8) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isCompleted, matches]);

  const handleCardPress = (index: number) => {
    if (cards[index].isFlipped || cards[index].isMatched || flippedIndices.length === 2) {
      return;
    }

    triggerHaptic('light');

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedIndices, index];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newFlipped;

      if (cards[firstIdx].icon === cards[secondIdx].icon) {
        // Match found!
        triggerSound('score');
        triggerHaptic('success');
        setTimeout(() => {
          newCards[firstIdx].isMatched = true;
          newCards[secondIdx].isMatched = true;
          setCards([...newCards]);
          setFlippedIndices([]);
          const newMatches = matches + 1;
          setMatches(newMatches);

          if (newMatches === 8) {
            setIsCompleted(true);
            triggerSound('win');
            triggerHaptic('success');
            const finalScore = Math.max(10, 1000 - moves * 20 - seconds * 5);
            saveHighScore('game_memory', finalScore);
            if (onGameOver) onGameOver(finalScore);
          }
        }, 500);
      } else {
        // No match: flip back
        setTimeout(() => {
          newCards[firstIdx].isFlipped = false;
          newCards[secondIdx].isFlipped = false;
          setCards([...newCards]);
          setFlippedIndices([]);
        }, 800);
      }
    }
  };

  const boardWidth = Math.min(Dimensions.get('window').width - 32, 340);
  const cardSize = (boardWidth - 40) / 4;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Memory Match"
        onBack={onBack}
        subtitle="Match all 8 pairs with the fewest moves"
      />

      {/* Stats Header */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statTitle, { color: theme.textSecondary }]}>MOVES</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{moves}</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statTitle, { color: theme.textSecondary }]}>PAIRS</Text>
          <Text style={[styles.statVal, { color: theme.primary }]}>{matches}/8</Text>
        </View>

        <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.statTitle, { color: theme.textSecondary }]}>TIME</Text>
          <Text style={[styles.statVal, { color: theme.text }]}>{seconds}s</Text>
        </View>
      </View>

      {/* 4x4 Cards Grid */}
      <View style={[styles.grid, { width: boardWidth }]}>
        {cards.map((card, idx) => (
          <TouchableOpacity
            key={card.id}
            activeOpacity={0.8}
            onPress={() => handleCardPress(idx)}
            style={[
              styles.cardItem,
              {
                width: cardSize,
                height: cardSize,
                backgroundColor: card.isFlipped || card.isMatched
                  ? theme.surface
                  : theme.primary,
                borderColor: card.isMatched ? theme.primary : theme.border,
              },
            ]}
          >
            {card.isFlipped || card.isMatched ? (
              <Ionicons
                name={card.icon as any}
                size={28}
                color={card.isMatched ? theme.primary : theme.accent}
              />
            ) : (
              <Ionicons name="help" size={24} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Win Banner */}
      {isCompleted ? (
        <View style={[styles.winCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.winTitle, { color: theme.primary }]}>Puzzle Solved!</Text>
          <Text style={[styles.winSub, { color: theme.textSecondary }]}>
            Finished in {moves} moves ({seconds}s)
          </Text>
          <TouchableOpacity onPress={initGame} style={[styles.winBtn, { backgroundColor: theme.primary }]}>
            <Text style={styles.winBtnText}>Play Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity onPress={initGame} style={[styles.resetBtn, { borderColor: theme.border }]}>
          <Ionicons name="refresh" size={16} color={theme.textMuted} />
          <Text style={{ fontSize: 13, color: theme.textMuted, marginLeft: 6 }}>Restart</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 16,
  },
  statBox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  statTitle: { fontSize: 10, fontWeight: '700' },
  statVal: { fontSize: 18, fontWeight: '800' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 8,
  },
  cardItem: {
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  winCard: {
    marginTop: 20,
    padding: 20,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    width: '85%',
  },
  winTitle: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  winSub: { fontSize: 14, marginBottom: 14 },
  winBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  winBtnText: { color: '#FFF', fontWeight: '700' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
});
