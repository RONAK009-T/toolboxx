import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';

interface Props {
  onBack: () => void;
}

type Mode = 'x_pct_of_y' | 'increase_decrease' | 'x_is_what_pct' | 'marks';

export const PercentageCalculatorScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [mode, setMode] = useState<Mode>('x_pct_of_y');

  // Inputs
  const [valA, setValA] = useState('20');
  const [valB, setValB] = useState('150');

  const modes: { id: Mode; label: string }[] = [
    { id: 'x_pct_of_y', label: 'X% of Y' },
    { id: 'increase_decrease', label: '% Change' },
    { id: 'x_is_what_pct', label: 'X is ?% of Y' },
    { id: 'marks', label: 'Marks %' },
  ];

  const calculateResult = () => {
    const a = parseFloat(valA) || 0;
    const b = parseFloat(valB) || 0;

    switch (mode) {
      case 'x_pct_of_y': {
        // e.g. 20% of 150 = 30
        const ans = (a / 100) * b;
        return {
          answer: `${ans.toLocaleString()}`,
          explanation: `${a}% of ${b} is equal to ${ans}`,
        };
      }
      case 'increase_decrease': {
        if (a === 0) return { answer: '0%', explanation: 'Initial value is 0' };
        const change = b - a;
        const pct = (change / a) * 100;
        const type = change >= 0 ? 'Increase' : 'Decrease';
        return {
          answer: `${Math.abs(pct).toFixed(2)}%`,
          explanation: `${type} of ${Math.abs(change).toLocaleString()} from ${a} to ${b}`,
        };
      }
      case 'x_is_what_pct': {
        if (b === 0) return { answer: '0%', explanation: 'Denominator cannot be 0' };
        const pct = (a / b) * 100;
        return {
          answer: `${pct.toFixed(2)}%`,
          explanation: `${a} is ${pct.toFixed(2)}% of ${b}`,
        };
      }
      case 'marks': {
        if (b === 0) return { answer: '0%', explanation: 'Total marks cannot be 0' };
        const pct = (a / b) * 100;
        return {
          answer: `${pct.toFixed(2)}%`,
          explanation: `Scored ${a} out of ${b} marks`,
        };
      }
    }
  };

  const res = calculateResult();

  const getLabels = () => {
    switch (mode) {
      case 'x_pct_of_y':
        return { a: 'Percentage (X %)', b: 'Total Value (Y)' };
      case 'increase_decrease':
        return { a: 'Initial Value', b: 'Final Value' };
      case 'x_is_what_pct':
        return { a: 'Numerator (X)', b: 'Denominator (Y)' };
      case 'marks':
        return { a: 'Marks Obtained', b: 'Total Maximum Marks' };
    }
  };

  const labels = getLabels();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Percentage Calculator"
        onBack={onBack}
        subtitle="Quick % of value, growth & exam marks"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Mode selector pills */}
        <View style={styles.modesRow}>
          {modes.map((m) => {
            const isSel = mode === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => {
                  triggerHaptic('light');
                  setMode(m.id);
                }}
                style={[
                  styles.modeBtn,
                  {
                    backgroundColor: isSel ? theme.primary : theme.surface,
                    borderColor: isSel ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modeBtnText,
                    { color: isSel ? '#FFF' : theme.textSecondary },
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Inputs Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{labels.a}</Text>
            <TextInput
              keyboardType="numeric"
              value={valA}
              onChangeText={(t) => {
                setValA(t);
                triggerHaptic('light');
              }}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>{labels.b}</Text>
            <TextInput
              keyboardType="numeric"
              value={valB}
              onChangeText={(t) => {
                setValB(t);
                triggerHaptic('light');
              }}
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            />
          </View>
        </View>

        {/* Result Card */}
        <View style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.resLabel, { color: theme.textMuted }]}>Calculated Result</Text>
          <Text style={[styles.resValue, { color: theme.primary }]}>{res.answer}</Text>
          <Text style={[styles.resExplanation, { color: theme.textSecondary }]}>
            {res.explanation}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  modesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
  },
  resLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  resValue: {
    fontSize: 34,
    fontWeight: '800',
    marginBottom: 8,
  },
  resExplanation: {
    fontSize: 14,
    textAlign: 'center',
  },
});
