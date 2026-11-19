import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';

interface Props {
  onBack: () => void;
}

export const GSTCalculatorScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [amountStr, setAmountStr] = useState('10000');
  const [selectedRate, setSelectedRate] = useState<number>(18);
  const [customRateStr, setCustomRateStr] = useState('');
  const [isInclusive, setIsInclusive] = useState(false);
  const [isInterState, setIsInterState] = useState(false); // false = CGST+SGST, true = IGST
  const [copied, setCopied] = useState(false);

  const gstRates = [3, 5, 12, 18, 28];

  const rate = useMemo(() => {
    if (customRateStr) {
      const parsed = parseFloat(customRateStr);
      return isNaN(parsed) ? 0 : parsed;
    }
    return selectedRate;
  }, [selectedRate, customRateStr]);

  const calculation = useMemo(() => {
    const rawAmount = parseFloat(amountStr) || 0;
    if (rawAmount <= 0) {
      return {
        baseAmount: 0,
        gstAmount: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
        totalAmount: 0,
      };
    }

    let baseAmount = 0;
    let gstAmount = 0;
    let totalAmount = 0;

    if (isInclusive) {
      // GST is included in the entered amount
      // Base = Total / (1 + Rate/100)
      baseAmount = rawAmount / (1 + rate / 100);
      gstAmount = rawAmount - baseAmount;
      totalAmount = rawAmount;
    } else {
      // GST is exclusive
      baseAmount = rawAmount;
      gstAmount = (rawAmount * rate) / 100;
      totalAmount = rawAmount + gstAmount;
    }

    const cgst = isInterState ? 0 : gstAmount / 2;
    const sgst = isInterState ? 0 : gstAmount / 2;
    const igst = isInterState ? gstAmount : 0;

    return {
      baseAmount,
      gstAmount,
      cgst,
      sgst,
      igst,
      totalAmount,
    };
  }, [amountStr, rate, isInclusive, isInterState]);

  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getSummaryText = () => {
    return `TOOLBOX X - GST Calculation
Amount: ${formatCurrency(calculation.baseAmount)}
GST Rate: ${rate}% (${isInclusive ? 'Inclusive' : 'Exclusive'})
${isInterState ? `IGST: ${formatCurrency(calculation.igst)}` : `CGST (${rate / 2}%): ${formatCurrency(calculation.cgst)}\nSGST (${rate / 2}%): ${formatCurrency(calculation.sgst)}`}
Total GST: ${formatCurrency(calculation.gstAmount)}
Total Amount: ${formatCurrency(calculation.totalAmount)}`;
  };

  const handleCopy = async () => {
    triggerHaptic('success');
    await Clipboard.setStringAsync(getSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    triggerHaptic('light');
    try {
      await Share.share({ message: getSummaryText() });
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="GST Calculator"
        onBack={onBack}
        subtitle="Inclusive / Exclusive & Tax Breakdown"
        rightAction={{
          icon: 'share-social-outline',
          onPress: handleShare,
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Type Toggle: Exclusive vs Inclusive */}
        <View style={[styles.toggleContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setIsInclusive(false);
            }}
            style={[
              styles.toggleBtn,
              !isInclusive && { backgroundColor: theme.primary },
            ]}
          >
            <Text style={[styles.toggleBtnText, { color: !isInclusive ? '#FFF' : theme.textSecondary }]}>
              GST Exclusive (+)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setIsInclusive(true);
            }}
            style={[
              styles.toggleBtn,
              isInclusive && { backgroundColor: theme.primary },
            ]}
          >
            <Text style={[styles.toggleBtnText, { color: isInclusive ? '#FFF' : theme.textSecondary }]}>
              GST Inclusive (-)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount Input */}
        <View style={[styles.inputCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Initial Amount (₹)</Text>
          <View style={styles.inputWrapper}>
            <Text style={[styles.currencyPrefix, { color: theme.primary }]}>₹</Text>
            <TextInput
              keyboardType="numeric"
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="Enter amount"
              placeholderTextColor={theme.textMuted}
              style={[styles.mainInput, { color: theme.text }]}
            />
          </View>
        </View>

        {/* GST Rate Slabs */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>GST Rate (%)</Text>
          <TouchableOpacity
            onPress={() => {
              triggerHaptic('light');
              setIsInterState(!isInterState);
            }}
            style={styles.stateToggle}
          >
            <Ionicons name="swap-horizontal" size={14} color={theme.accent} />
            <Text style={[styles.stateToggleText, { color: theme.accent }]}>
              {isInterState ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ratesRow}>
          {gstRates.map((r) => {
            const isSelected = !customRateStr && selectedRate === r;
            return (
              <TouchableOpacity
                key={r}
                onPress={() => {
                  triggerHaptic('light');
                  setCustomRateStr('');
                  setSelectedRate(r);
                }}
                style={[
                  styles.rateBtn,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.surface,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
              >
                <Text style={[styles.rateBtnText, { color: isSelected ? '#FFF' : theme.text }]}>
                  {r}%
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Custom Rate Input */}
        <View style={[styles.customRateContainer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.customRateLabel, { color: theme.textSecondary }]}>Custom Rate %:</Text>
          <TextInput
            keyboardType="numeric"
            placeholder="e.g. 15.5"
            placeholderTextColor={theme.textMuted}
            value={customRateStr}
            onChangeText={(txt) => {
              setCustomRateStr(txt);
              if (txt) triggerHaptic('light');
            }}
            style={[styles.customRateInput, { color: theme.text }]}
          />
        </View>

        {/* Result Breakdown Card */}
        <View style={[styles.resultCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.resultCardTitle, { color: theme.text }]}>Calculation Breakdown</Text>
            <TouchableOpacity onPress={handleCopy} style={styles.copyBtn}>
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy-outline'}
                size={18}
                color={copied ? '#10B981' : theme.textMuted}
              />
              <Text style={{ fontSize: 12, color: copied ? '#10B981' : theme.textMuted, marginLeft: 4 }}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Net Amount</Text>
            <Text style={[styles.rowValue, { color: theme.text }]}>
              {formatCurrency(calculation.baseAmount)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {!isInterState ? (
            <>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>
                  CGST ({rate / 2}%)
                </Text>
                <Text style={[styles.rowValue, { color: theme.text }]}>
                  {formatCurrency(calculation.cgst)}
                </Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>
                  SGST ({rate / 2}%)
                </Text>
                <Text style={[styles.rowValue, { color: theme.text }]}>
                  {formatCurrency(calculation.sgst)}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>
                IGST ({rate}%)
              </Text>
              <Text style={[styles.rowValue, { color: theme.text }]}>
                {formatCurrency(calculation.igst)}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textSecondary }]}>Total Tax (GST)</Text>
            <Text style={[styles.rowValue, { color: theme.warning, fontWeight: '700' }]}>
              {formatCurrency(calculation.gstAmount)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          <View style={styles.row}>
            <Text style={[styles.totalLabel, { color: theme.text }]}>Total Payable</Text>
            <Text style={[styles.totalValue, { color: theme.primary }]}>
              {formatCurrency(calculation.totalAmount)}
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
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    fontSize: 26,
    fontWeight: '800',
    marginRight: 8,
  },
  mainInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  stateToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stateToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  ratesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  rateBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  rateBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  customRateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 20,
  },
  customRateLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 10,
  },
  customRateInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  resultCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  resultCardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  rowLabel: {
    fontSize: 14,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
  },
});
