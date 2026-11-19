import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';

interface Props {
  onBack: () => void;
}

type TabType = 'difference' | 'add_subtract';

export const DateCalculatorScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [activeTab, setActiveTab] = useState<TabType>('difference');

  // Date 1: Today
  const now = new Date();
  const [d1, setD1] = useState(now.getDate().toString());
  const [m1, setM1] = useState((now.getMonth() + 1).toString());
  const [y1, setY1] = useState(now.getFullYear().toString());

  // Date 2: Future date
  const [d2, setD2] = useState('31');
  const [m2, setM2] = useState('12');
  const [y2, setY2] = useState(now.getFullYear().toString());

  // Add / Subtract
  const [daysDelta, setDaysDelta] = useState('30');
  const [isAdd, setIsAdd] = useState(true);

  // Difference Calculation
  const differenceResult = useMemo(() => {
    const dateA = new Date(parseInt(y1, 10), parseInt(m1, 10) - 1, parseInt(d1, 10));
    const dateB = new Date(parseInt(y2, 10), parseInt(m2, 10) - 1, parseInt(d2, 10));

    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
      return null;
    }

    const diffTime = Math.abs(dateB.getTime() - dateA.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(totalDays / 7);
    const remDays = totalDays % 7;

    return { totalDays, weeks, remDays };
  }, [d1, m1, y1, d2, m2, y2]);

  // Add/Subtract Calculation
  const addSubtractResult = useMemo(() => {
    const baseDate = new Date(parseInt(y1, 10), parseInt(m1, 10) - 1, parseInt(d1, 10));
    const delta = parseInt(daysDelta, 10);

    if (isNaN(baseDate.getTime()) || isNaN(delta)) {
      return null;
    }

    const resultDate = new Date(baseDate);
    resultDate.setDate(resultDate.getDate() + (isAdd ? delta : -delta));

    return {
      formatted: resultDate.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    };
  }, [d1, m1, y1, daysDelta, isAdd]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Date Calculator"
        onBack={onBack}
        subtitle="Days between dates & future calendar planner"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Tab Toggle */}
        <View style={[styles.tabBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('difference');
            }}
            style={[styles.tabBtn, activeTab === 'difference' && { backgroundColor: theme.primary }]}
          >
            <Text style={[styles.tabText, { color: activeTab === 'difference' ? '#FFF' : theme.textSecondary }]}>
              Days Between Dates
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setActiveTab('add_subtract');
            }}
            style={[styles.tabBtn, activeTab === 'add_subtract' && { backgroundColor: theme.primary }]}
          >
            <Text style={[styles.tabText, { color: activeTab === 'add_subtract' ? '#FFF' : theme.textSecondary }]}>
              Add / Subtract Days
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'difference' ? (
          <>
            {/* Start Date */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Start Date (DD/MM/YYYY)</Text>
              <View style={styles.dateInputsRow}>
                <TextInput keyboardType="numeric" maxLength={2} value={d1} onChangeText={setD1} style={[styles.dateInput, { color: theme.text, borderColor: theme.border }]} placeholder="DD" placeholderTextColor={theme.textMuted} />
                <Text style={[styles.slash, { color: theme.border }]}>/</Text>
                <TextInput keyboardType="numeric" maxLength={2} value={m1} onChangeText={setM1} style={[styles.dateInput, { color: theme.text, borderColor: theme.border }]} placeholder="MM" placeholderTextColor={theme.textMuted} />
                <Text style={[styles.slash, { color: theme.border }]}>/</Text>
                <TextInput keyboardType="numeric" maxLength={4} value={y1} onChangeText={setY1} style={[styles.dateInput, { color: theme.text, borderColor: theme.border, flex: 1.5 }]} placeholder="YYYY" placeholderTextColor={theme.textMuted} />
              </View>
            </View>

            {/* End Date */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>End Date (DD/MM/YYYY)</Text>
              <View style={styles.dateInputsRow}>
                <TextInput keyboardType="numeric" maxLength={2} value={d2} onChangeText={setD2} style={[styles.dateInput, { color: theme.text, borderColor: theme.border }]} placeholder="DD" placeholderTextColor={theme.textMuted} />
                <Text style={[styles.slash, { color: theme.border }]}>/</Text>
                <TextInput keyboardType="numeric" maxLength={2} value={m2} onChangeText={setM2} style={[styles.dateInput, { color: theme.text, borderColor: theme.border }]} placeholder="MM" placeholderTextColor={theme.textMuted} />
                <Text style={[styles.slash, { color: theme.border }]}>/</Text>
                <TextInput keyboardType="numeric" maxLength={4} value={y2} onChangeText={setY2} style={[styles.dateInput, { color: theme.text, borderColor: theme.border, flex: 1.5 }]} placeholder="YYYY" placeholderTextColor={theme.textMuted} />
              </View>
            </View>

            {/* Difference Result Card */}
            {differenceResult && (
              <View style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.resLabel, { color: theme.textMuted }]}>Difference</Text>
                <Text style={[styles.mainResVal, { color: theme.primary }]}>
                  {differenceResult.totalDays} Days
                </Text>
                <Text style={[styles.subResVal, { color: theme.textSecondary }]}>
                  Equal to {differenceResult.weeks} weeks and {differenceResult.remDays} days
                </Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Base Date */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Base Date (DD/MM/YYYY)</Text>
              <View style={styles.dateInputsRow}>
                <TextInput keyboardType="numeric" maxLength={2} value={d1} onChangeText={setD1} style={[styles.dateInput, { color: theme.text, borderColor: theme.border }]} placeholder="DD" placeholderTextColor={theme.textMuted} />
                <Text style={[styles.slash, { color: theme.border }]}>/</Text>
                <TextInput keyboardType="numeric" maxLength={2} value={m1} onChangeText={setM1} style={[styles.dateInput, { color: theme.text, borderColor: theme.border }]} placeholder="MM" placeholderTextColor={theme.textMuted} />
                <Text style={[styles.slash, { color: theme.border }]}>/</Text>
                <TextInput keyboardType="numeric" maxLength={4} value={y1} onChangeText={setY1} style={[styles.dateInput, { color: theme.text, borderColor: theme.border, flex: 1.5 }]} placeholder="YYYY" placeholderTextColor={theme.textMuted} />
              </View>
            </View>

            {/* Operation & Days */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.opToggleRow}>
                <TouchableOpacity
                  onPress={() => setIsAdd(true)}
                  style={[styles.opBtn, isAdd && { backgroundColor: theme.primary }]}
                >
                  <Text style={[styles.opBtnText, { color: isAdd ? '#FFF' : theme.textSecondary }]}>
                    + Add Days
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsAdd(false)}
                  style={[styles.opBtn, !isAdd && { backgroundColor: theme.primary }]}
                >
                  <Text style={[styles.opBtnText, { color: !isAdd ? '#FFF' : theme.textSecondary }]}>
                    - Subtract Days
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: theme.textSecondary }]}>Number of Days</Text>
              <TextInput
                keyboardType="numeric"
                value={daysDelta}
                onChangeText={setDaysDelta}
                style={[styles.dateInput, { color: theme.text, borderColor: theme.border, width: '100%' }]}
              />
            </View>

            {/* Result */}
            {addSubtractResult && (
              <View style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Text style={[styles.resLabel, { color: theme.textMuted }]}>Calculated Target Date</Text>
                <Text style={[styles.targetDateText, { color: theme.primary }]}>
                  {addSubtractResult.formatted}
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  tabBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  dateInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  slash: {
    fontSize: 20,
    fontWeight: '300',
  },
  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  resLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  mainResVal: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 4,
  },
  subResVal: {
    fontSize: 14,
  },
  opToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  opBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  opBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  targetDateText: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
});
