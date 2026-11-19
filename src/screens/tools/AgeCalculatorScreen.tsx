import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';

interface Props {
  onBack: () => void;
}

export const AgeCalculatorScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const today = new Date();
  const [day, setDay] = useState('15');
  const [month, setMonth] = useState('8');
  const [year, setYear] = useState('1998');

  const ageData = useMemo(() => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10) - 1; // 0-indexed
    const y = parseInt(year, 10);

    if (isNaN(d) || isNaN(m) || isNaN(y) || y < 1900 || m < 0 || m > 11 || d < 1 || d > 31) {
      return null;
    }

    const birthDate = new Date(y, m, d);
    if (isNaN(birthDate.getTime()) || birthDate > today) {
      return null;
    }

    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonthLastDay = new Date(today.getFullYear(), today.getMonth(), 0).getDate();
      days += prevMonthLastDay;
    }

    if (months < 0) {
      years -= 1;
      months += 12;
    }

    // Total stats
    const diffTime = Math.abs(today.getTime() - birthDate.getTime());
    const totalDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const totalWeeks = Math.floor(totalDays / 7);
    const totalHours = totalDays * 24;

    // Next Birthday calculation
    let nextBdayYear = today.getFullYear();
    const nextBday = new Date(nextBdayYear, m, d);
    if (nextBday < today) {
      nextBday.setFullYear(nextBdayYear + 1);
    }
    const daysToNextBday = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const nextWeekday = weekdays[nextBday.getDay()];

    return {
      years,
      months,
      days,
      totalDays,
      totalWeeks,
      totalHours,
      daysToNextBday,
      nextWeekday,
    };
  }, [day, month, year]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Age Calculator"
        onBack={onBack}
        subtitle="Chronological Age & Birthday Countdown"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* DOB Input Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Enter Date of Birth</Text>

          <View style={styles.inputsRow}>
            <View style={styles.inputCol}>
              <Text style={[styles.inputSub, { color: theme.textMuted }]}>Day</Text>
              <TextInput
                keyboardType="numeric"
                maxLength={2}
                value={day}
                onChangeText={(t) => {
                  setDay(t);
                  triggerHaptic('light');
                }}
                style={[styles.dobInput, { color: theme.text, borderColor: theme.border }]}
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={[styles.inputSub, { color: theme.textMuted }]}>Month</Text>
              <TextInput
                keyboardType="numeric"
                maxLength={2}
                value={month}
                onChangeText={(t) => {
                  setMonth(t);
                  triggerHaptic('light');
                }}
                style={[styles.dobInput, { color: theme.text, borderColor: theme.border }]}
              />
            </View>

            <View style={[styles.inputCol, { flex: 1.4 }]}>
              <Text style={[styles.inputSub, { color: theme.textMuted }]}>Year</Text>
              <TextInput
                keyboardType="numeric"
                maxLength={4}
                value={year}
                onChangeText={(t) => {
                  setYear(t);
                  triggerHaptic('light');
                }}
                style={[styles.dobInput, { color: theme.text, borderColor: theme.border }]}
              />
            </View>
          </View>
        </View>

        {ageData ? (
          <>
            {/* Primary Age Display */}
            <View style={[styles.ageResultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.ageLabel, { color: theme.textSecondary }]}>Your Current Age</Text>
              <View style={styles.largeAgeRow}>
                <View style={styles.ageBlock}>
                  <Text style={[styles.largeNum, { color: theme.primary }]}>{ageData.years}</Text>
                  <Text style={[styles.unitText, { color: theme.textSecondary }]}>Years</Text>
                </View>
                <Text style={[styles.colon, { color: theme.border }]}>:</Text>
                <View style={styles.ageBlock}>
                  <Text style={[styles.largeNum, { color: theme.primary }]}>{ageData.months}</Text>
                  <Text style={[styles.unitText, { color: theme.textSecondary }]}>Months</Text>
                </View>
                <Text style={[styles.colon, { color: theme.border }]}>:</Text>
                <View style={styles.ageBlock}>
                  <Text style={[styles.largeNum, { color: theme.primary }]}>{ageData.days}</Text>
                  <Text style={[styles.unitText, { color: theme.textSecondary }]}>Days</Text>
                </View>
              </View>
            </View>

            {/* Next Birthday Card */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.bdayRow}>
                <View style={[styles.cakeIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                  <Ionicons name="gift" size={24} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bdayTitle, { color: theme.text }]}>Next Birthday</Text>
                  <Text style={[styles.bdaySub, { color: theme.textSecondary }]}>
                    In {ageData.daysToNextBday} days ({ageData.nextWeekday})
                  </Text>
                </View>
              </View>
            </View>

            {/* Total Life Stats */}
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 12 }]}>
                Lifetime Summary
              </Text>
              <View style={styles.statLine}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Weeks</Text>
                <Text style={[styles.statVal, { color: theme.text }]}>
                  {ageData.totalWeeks.toLocaleString()} weeks
                </Text>
              </View>
              <View style={styles.statLine}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Days</Text>
                <Text style={[styles.statVal, { color: theme.text }]}>
                  {ageData.totalDays.toLocaleString()} days
                </Text>
              </View>
              <View style={styles.statLine}>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Hours</Text>
                <Text style={[styles.statVal, { color: theme.text }]}>
                  {ageData.totalHours.toLocaleString()} hours
                </Text>
              </View>
            </View>
          </>
        ) : (
          <View style={[styles.errorCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="alert-circle-outline" size={32} color={theme.warning} />
            <Text style={[styles.errorText, { color: theme.textSecondary }]}>
              Please enter a valid birth date (Day: 1-31, Month: 1-12, Year: 1900-Present)
            </Text>
          </View>
        )}
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
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  inputSub: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  dobInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
  },
  ageResultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
  },
  ageLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
  },
  largeAgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ageBlock: {
    alignItems: 'center',
  },
  largeNum: {
    fontSize: 34,
    fontWeight: '800',
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  colon: {
    fontSize: 28,
    fontWeight: '300',
    marginBottom: 16,
  },
  bdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  cakeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bdayTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  bdaySub: {
    fontSize: 13,
    marginTop: 2,
  },
  statLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statLabel: {
    fontSize: 14,
  },
  statVal: {
    fontSize: 15,
    fontWeight: '700',
  },
  errorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  errorText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
