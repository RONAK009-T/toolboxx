import React, { useState, useMemo } from 'react';
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

export const EMICalculatorScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [principalStr, setPrincipalStr] = useState('500000');
  const [interestRateStr, setInterestRateStr] = useState('8.5');
  const [tenureStr, setTenureStr] = useState('5');
  const [isTenureYears, setIsTenureYears] = useState(true);

  const result = useMemo(() => {
    const P = parseFloat(principalStr) || 0;
    const annualR = parseFloat(interestRateStr) || 0;
    const rawTenure = parseFloat(tenureStr) || 0;
    const N = isTenureYears ? rawTenure * 12 : rawTenure;

    if (P <= 0 || annualR <= 0 || N <= 0) {
      return {
        monthlyEMI: 0,
        totalInterest: 0,
        totalPayment: 0,
        principalPercent: 100,
        interestPercent: 0,
      };
    }

    const r = annualR / (12 * 100);
    // EMI = [P * r * (1+r)^N] / [(1+r)^N - 1]
    const emi = (P * r * Math.pow(1 + r, N)) / (Math.pow(1 + r, N) - 1);
    const totalPayment = emi * N;
    const totalInterest = totalPayment - P;

    const principalPercent = (P / totalPayment) * 100;
    const interestPercent = (totalInterest / totalPayment) * 100;

    return {
      monthlyEMI: isNaN(emi) ? 0 : emi,
      totalInterest: isNaN(totalInterest) ? 0 : totalInterest,
      totalPayment: isNaN(totalPayment) ? 0 : totalPayment,
      principalPercent: isNaN(principalPercent) ? 100 : principalPercent,
      interestPercent: isNaN(interestPercent) ? 0 : interestPercent,
    };
  }, [principalStr, interestRateStr, tenureStr, isTenureYears]);

  const formatCurr = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('en-IN');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="EMI Calculator"
        onBack={onBack}
        subtitle="Home, Car & Personal Loan Planner"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Loan Amount */}
        <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Loan Amount (₹)</Text>
          <View style={styles.rowAlign}>
            <Text style={[styles.prefix, { color: theme.primary }]}>₹</Text>
            <TextInput
              keyboardType="numeric"
              value={principalStr}
              onChangeText={setPrincipalStr}
              placeholder="500000"
              placeholderTextColor={theme.textMuted}
              style={[styles.inputField, { color: theme.text }]}
            />
          </View>
        </View>

        {/* Interest Rate */}
        <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Interest Rate (% per annum)</Text>
          <View style={styles.rowAlign}>
            <TextInput
              keyboardType="numeric"
              value={interestRateStr}
              onChangeText={setInterestRateStr}
              placeholder="8.5"
              placeholderTextColor={theme.textMuted}
              style={[styles.inputField, { color: theme.text }]}
            />
            <Text style={[styles.suffix, { color: theme.textMuted }]}>%</Text>
          </View>
        </View>

        {/* Loan Tenure */}
        <View style={[styles.inputBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.tenureHeader}>
            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Loan Tenure</Text>
            <View style={styles.tenureToggle}>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  setIsTenureYears(true);
                }}
                style={[
                  styles.tenureBtn,
                  isTenureYears && { backgroundColor: theme.primary },
                ]}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: isTenureYears ? '#FFF' : theme.textMuted }}>
                  Years
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  setIsTenureYears(false);
                }}
                style={[
                  styles.tenureBtn,
                  !isTenureYears && { backgroundColor: theme.primary },
                ]}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: !isTenureYears ? '#FFF' : theme.textMuted }}>
                  Months
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <TextInput
            keyboardType="numeric"
            value={tenureStr}
            onChangeText={setTenureStr}
            placeholder="5"
            placeholderTextColor={theme.textMuted}
            style={[styles.inputField, { color: theme.text }]}
          />
        </View>

        {/* EMI Result Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.emiLabel, { color: theme.textSecondary }]}>Monthly Loan EMI</Text>
          <Text style={[styles.emiValue, { color: theme.primary }]}>
            {formatCurr(result.monthlyEMI)}
          </Text>

          {/* Visual Proportion Bar */}
          <View style={styles.barContainer}>
            <View
              style={[
                styles.barPrincipal,
                { width: `${result.principalPercent}%`, backgroundColor: theme.primary },
              ]}
            />
            <View
              style={[
                styles.barInterest,
                { width: `${result.interestPercent}%`, backgroundColor: theme.warning },
              ]}
            />
          </View>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.primary }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                Principal ({Math.round(result.principalPercent)}%)
              </Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: theme.warning }]} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>
                Interest ({Math.round(result.interestPercent)}%)
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Principal</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {formatCurr(parseFloat(principalStr) || 0)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Interest Amount</Text>
            <Text style={[styles.statValue, { color: theme.warning }]}>
              {formatCurr(result.totalInterest)}
            </Text>
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.totalText, { color: theme.text }]}>Total Amount Payable</Text>
            <Text style={[styles.totalAmount, { color: theme.text }]}>
              {formatCurr(result.totalPayment)}
            </Text>
          </View>
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
  inputBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefix: {
    fontSize: 22,
    fontWeight: '800',
    marginRight: 6,
  },
  suffix: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 6,
  },
  inputField: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  tenureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tenureToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 2,
  },
  tenureBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginTop: 8,
    alignItems: 'center',
    elevation: 3,
  },
  emiLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  emiValue: {
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 16,
  },
  barContainer: {
    flexDirection: 'row',
    height: 10,
    width: '100%',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 12,
  },
  barPrincipal: {
    height: '100%',
  },
  barInterest: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
    marginBottom: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 6,
  },
  statLabel: {
    fontSize: 14,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  totalText: {
    fontSize: 15,
    fontWeight: '800',
  },
  totalAmount: {
    fontSize: 17,
    fontWeight: '800',
  },
});
