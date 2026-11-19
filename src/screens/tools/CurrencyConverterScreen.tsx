import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { getCachedCurrencyRates, saveCachedCurrencyRates } from '../../storage/storage';

interface Props {
  isOnline: boolean;
  onBack: () => void;
}

interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
}

const CURRENCIES: CurrencyInfo[] = [
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF' },
];

// Fallback rates baseline against USD
const DEFAULT_FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  INR: 86.85,
  EUR: 0.96,
  GBP: 0.81,
  AED: 3.67,
  AUD: 1.58,
  CAD: 1.42,
  JPY: 153.2,
  SGD: 1.35,
  CHF: 0.9,
};

export const CurrencyConverterScreen: React.FC<Props> = ({ isOnline, onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [amountStr, setAmountStr] = useState('100');
  const [fromCode, setFromCode] = useState('USD');
  const [toCode, setToCode] = useState('INR');
  const [rates, setRates] = useState<Record<string, number>>(DEFAULT_FALLBACK_RATES);
  const [ratesTimestamp, setRatesTimestamp] = useState<number>(Date.now() - 3600000);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRates();
  }, [isOnline]);

  const fetchRates = async () => {
    // 1. Try to load cached rates first
    const cached = await getCachedCurrencyRates();
    if (cached && cached.rates) {
      setRates(cached.rates);
      setRatesTimestamp(cached.timestamp);
    }

    if (!isOnline) {
      setIsLive(false);
      return;
    }

    // 2. Fetch live rates from public API
    try {
      setLoading(true);
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (res.ok) {
        const json = await res.json();
        if (json?.rates) {
          setRates(json.rates);
          const now = Date.now();
          setRatesTimestamp(now);
          setIsLive(true);
          await saveCachedCurrencyRates({
            base: 'USD',
            rates: json.rates,
            timestamp: now,
          });
        }
      }
    } catch {
      setIsLive(false);
    } finally {
      setLoading(false);
    }
  };

  const amount = parseFloat(amountStr) || 0;
  const fromRate = rates[fromCode] || 1;
  const toRate = rates[toCode] || 1;
  const convertedAmount = (amount / fromRate) * toRate;
  const unitRate = (1 / fromRate) * toRate;

  const swap = () => {
    triggerHaptic('light');
    const temp = fromCode;
    setFromCode(toCode);
    setToCode(temp);
  };

  const fromCurr = CURRENCIES.find((c) => c.code === fromCode);
  const toCurr = CURRENCIES.find((c) => c.code === toCode);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Currency Converter"
        onBack={onBack}
        subtitle="Live & Cached Global Rates"
        isOnlineFeature={true}
        rightAction={{
          icon: 'refresh-outline',
          onPress: () => {
            triggerHaptic('light');
            fetchRates();
          },
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Indicator Card */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: isLive
                ? 'rgba(16, 185, 129, 0.12)'
                : 'rgba(245, 158, 11, 0.14)',
              borderColor: isLive ? '#10B981' : '#F59E0B',
            },
          ]}
        >
          <View style={styles.statusRow}>
            <View
              style={[
                styles.dot,
                { backgroundColor: isLive ? '#10B981' : '#F59E0B' },
              ]}
            />
            <Text
              style={[
                styles.statusTitle,
                { color: isLive ? '#10B981' : '#F59E0B' },
              ]}
            >
              {isLive ? 'Live Exchange Rate' : 'Offline / Cached Exchange Rate'}
            </Text>
            {loading && <ActivityIndicator size="small" color={theme.primary} style={{ marginLeft: 6 }} />}
          </View>
          <Text style={[styles.statusSubtitle, { color: theme.textSecondary }]}>
            Updated: {new Date(ratesTimestamp).toLocaleDateString()} at{' '}
            {new Date(ratesTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
          {!isOnline && (
            <Text style={[styles.offlineWarning, { color: '#F59E0B' }]}>
              Internet is offline. Displaying safe cached values. Connect to internet to refresh.
            </Text>
          )}
        </View>

        {/* From Currency Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Convert From</Text>
          <View style={styles.inputRow}>
            <Text style={[styles.symbol, { color: theme.primary }]}>{fromCurr?.symbol}</Text>
            <TextInput
              keyboardType="numeric"
              value={amountStr}
              onChangeText={(t) => {
                setAmountStr(t);
                triggerHaptic('light');
              }}
              placeholder="0"
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text }]}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            {CURRENCIES.map((c) => {
              const isSel = fromCode === c.code;
              return (
                <TouchableOpacity
                  key={`from-${c.code}`}
                  onPress={() => {
                    triggerHaptic('light');
                    setFromCode(c.code);
                  }}
                  style={[
                    styles.currPill,
                    {
                      backgroundColor: isSel ? theme.primary : theme.background,
                      borderColor: isSel ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.currPillCode, { color: isSel ? '#FFF' : theme.text }]}>
                    {c.code}
                  </Text>
                  <Text style={[styles.currPillSymbol, { color: isSel ? '#FFF' : theme.textMuted }]}>
                    {c.symbol}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Swap Button */}
        <TouchableOpacity
          onPress={swap}
          style={[styles.swapBtn, { backgroundColor: theme.primary, borderColor: theme.border }]}
        >
          <Ionicons name="swap-vertical" size={20} color="#FFF" />
        </TouchableOpacity>

        {/* To Currency Card */}
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Converted To</Text>
          <View style={styles.inputRow}>
            <Text style={[styles.symbol, { color: theme.primary }]}>{toCurr?.symbol}</Text>
            <Text style={[styles.resultVal, { color: theme.primary }]}>
              {convertedAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}
            </Text>
          </View>

          <Text style={[styles.rateNote, { color: theme.textMuted }]}>
            1 {fromCode} = {unitRate.toFixed(4)} {toCode}
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillScroll}>
            {CURRENCIES.map((c) => {
              const isSel = toCode === c.code;
              return (
                <TouchableOpacity
                  key={`to-${c.code}`}
                  onPress={() => {
                    triggerHaptic('light');
                    setToCode(c.code);
                  }}
                  style={[
                    styles.currPill,
                    {
                      backgroundColor: isSel ? theme.primary : theme.background,
                      borderColor: isSel ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.currPillCode, { color: isSel ? '#FFF' : theme.text }]}>
                    {c.code}
                  </Text>
                  <Text style={[styles.currPillSymbol, { color: isSel ? '#FFF' : theme.textMuted }]}>
                    {c.symbol}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
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
  statusBanner: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  statusSubtitle: {
    fontSize: 11,
    marginTop: 4,
  },
  offlineWarning: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  symbol: {
    fontSize: 24,
    fontWeight: '700',
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
  },
  resultVal: {
    fontSize: 26,
    fontWeight: '800',
  },
  rateNote: {
    fontSize: 12,
    marginBottom: 10,
  },
  pillScroll: {
    marginTop: 4,
  },
  currPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  currPillCode: {
    fontSize: 13,
    fontWeight: '700',
  },
  currPillSymbol: {
    fontSize: 11,
  },
  swapBtn: {
    alignSelf: 'center',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 2,
    elevation: 3,
  },
});
