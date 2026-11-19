import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { getHighScores, saveHighScore } from '../../storage/storage';

interface Props {
  onBack: () => void;
  onGameOver?: (score: number) => void;
}

type Choice = 'rock' | 'paper' | 'scissors';

export const GameRPSScreen: React.FC<Props> = ({ onBack, onGameOver }) => {
  const { theme } = useTheme();
  const { triggerHaptic, triggerSound } = usePreferences();

  const [playerChoice, setPlayerChoice] = useState<Choice | null>(null);
  const [cpuChoice, setCpuChoice] = useState<Choice | null>(null);
  const [result, setResult] = useState<'win' | 'lose' | 'tie' | null>(null);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const choices: { id: Choice; label: string; icon: string; beats: Choice }[] = [
    { id: 'rock', label: 'Rock', icon: 'hand-back-right', beats: 'scissors' },
    { id: 'paper', label: 'Paper', icon: 'hand-front-right', beats: 'rock' },
    { id: 'scissors', label: 'Scissors', icon: 'content-cut', beats: 'paper' },
  ];

  const handlePlay = (player: Choice) => {
    triggerHaptic('medium');
    setPlayerChoice(player);

    const random = choices[Math.floor(Math.random() * choices.length)].id;
    setCpuChoice(random);

    if (player === random) {
      setResult('tie');
    } else {
      const selected = choices.find((c) => c.id === player);
      if (selected && selected.beats === random) {
        // Player wins
        triggerSound('score');
        triggerHaptic('success');
        setResult('win');
        const nextWins = wins + 1;
        const nextStreak = streak + 1;
        setWins(nextWins);
        setStreak(nextStreak);
        if (nextStreak > bestStreak) {
          setBestStreak(nextStreak);
          saveHighScore('game_rps', nextStreak);
        }
      } else {
        // Computer wins
        triggerSound('gameover');
        triggerHaptic('error');
        setResult('lose');
        setLosses((l) => l + 1);
        setStreak(0);
        if (onGameOver) onGameOver(wins);
      }
    }
  };

  const getChoiceIcon = (c: Choice | null) => {
    if (c === 'rock') return 'hand-back-right';
    if (c === 'paper') return 'hand-front-right';
    if (c === 'scissors') return 'content-cut';
    return 'help-circle-outline';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Rock Paper Scissors"
        onBack={onBack}
        subtitle="Classic battle against the CPU"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Score Board */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statTitle, { color: '#10B981' }]}>WINS</Text>
            <Text style={[styles.statVal, { color: theme.text }]}>{wins}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statTitle, { color: '#EF4444' }]}>LOSSES</Text>
            <Text style={[styles.statVal, { color: theme.text }]}>{losses}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.statTitle, { color: '#F59E0B' }]}>STREAK</Text>
            <Text style={[styles.statVal, { color: '#F59E0B' }]}>🔥 {streak}</Text>
          </View>
        </View>

        {/* Battle Arena */}
        <View style={[styles.arenaCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.fighterRow}>
            {/* Player */}
            <View style={styles.fighterCol}>
              <Text style={[styles.fighterLabel, { color: theme.textSecondary }]}>YOU</Text>
              <View style={[styles.choiceCircle, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <MaterialCommunityIcons name={getChoiceIcon(playerChoice) as any} size={44} color={theme.primary} />
              </View>
              <Text style={[styles.choiceLabel, { color: theme.text }]}>
                {playerChoice ? playerChoice.toUpperCase() : 'Waiting...'}
              </Text>
            </View>

            <Text style={[styles.vsText, { color: theme.textMuted }]}>VS</Text>

            {/* CPU */}
            <View style={styles.fighterCol}>
              <Text style={[styles.fighterLabel, { color: theme.textSecondary }]}>CPU</Text>
              <View style={[styles.choiceCircle, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <MaterialCommunityIcons name={getChoiceIcon(cpuChoice) as any} size={44} color="#EF4444" />
              </View>
              <Text style={[styles.choiceLabel, { color: theme.text }]}>
                {cpuChoice ? cpuChoice.toUpperCase() : 'Waiting...'}
              </Text>
            </View>
          </View>

          {/* Result Banner */}
          {result && (
            <View
              style={[
                styles.resultBanner,
                {
                  backgroundColor:
                    result === 'win'
                      ? 'rgba(16, 185, 129, 0.15)'
                      : result === 'lose'
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(245, 158, 11, 0.15)',
                },
              ]}
            >
              <Text
                style={[
                  styles.resultBannerText,
                  {
                    color:
                      result === 'win' ? '#10B981' : result === 'lose' ? '#EF4444' : '#F59E0B',
                  },
                ]}
              >
                {result === 'win' ? 'You Won!' : result === 'lose' ? 'CPU Won!' : "It's a Tie!"}
              </Text>
            </View>
          )}
        </View>

        {/* Action Choices */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Choose Your Move</Text>
        <View style={styles.choicesRow}>
          {choices.map((c) => (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.7}
              onPress={() => handlePlay(c.id)}
              style={[styles.choiceBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <MaterialCommunityIcons name={c.icon as any} size={36} color={theme.primary} />
              <Text style={[styles.choiceBtnText, { color: theme.text }]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
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
  arenaCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  fighterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
  },
  fighterCol: {
    alignItems: 'center',
  },
  fighterLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  choiceCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  choiceLabel: {
    fontSize: 12,
    fontWeight: '800',
  },
  vsText: {
    fontSize: 22,
    fontWeight: '900',
  },
  resultBanner: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 12,
  },
  resultBannerText: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  choicesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  choiceBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  choiceBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
