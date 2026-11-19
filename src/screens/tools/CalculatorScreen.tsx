import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import {
  getCalcHistory,
  addCalcHistory,
  clearCalcHistory,
  CalcHistoryEntry,
} from '../../storage/storage';

interface Props {
  onBack: () => void;
}

export const CalculatorScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [historyModal, setHistoryModal] = useState(false);
  const [history, setHistory] = useState<CalcHistoryEntry[]>([]);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const list = await getCalcHistory();
    setHistory(list);
  };

  const evaluateExpression = (expr: string): string => {
    if (!expr) return '';
    try {
      // replace arithmetic symbols with valid JS operators
      const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
      // disallow any non-math characters
      if (/[^0-9+\-*/.%() ]/.test(sanitized)) return '';
      // handle percentage: e.g. 50% -> (50/100)
      const pctHandled = sanitized.replace(/(\d+(\.\d+)?)%/g, '($1/100)');
      // safe eval using Function
      // eslint-disable-next-line no-new-func
      const calcResult = Function(`'use strict'; return (${pctHandled})`)();
      if (isNaN(calcResult) || !isFinite(calcResult)) {
        return 'Error';
      }
      // round decimals cleanly
      const num = Number(calcResult);
      if (Number.isInteger(num)) return num.toString();
      return parseFloat(num.toFixed(8)).toString();
    } catch {
      return '';
    }
  };

  const handlePress = async (val: string) => {
    triggerHaptic('light');

    if (val === 'C') {
      setExpression('');
      setResult('');
      return;
    }

    if (val === 'DEL') {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }

    if (val === '=') {
      if (!expression) return;
      const res = evaluateExpression(expression);
      if (res && res !== 'Error') {
        triggerHaptic('success');
        await addCalcHistory(expression, res);
        loadHistory();
        setResult('');
        setExpression(res);
      } else {
        triggerHaptic('error');
        setResult('Invalid expression');
      }
      return;
    }

    // Append to expression
    const nextExpr = expression + val;
    setExpression(nextExpr);
    const live = evaluateExpression(nextExpr);
    if (live && live !== 'Error') {
      setResult(live);
    }
  };

  const handleClearHistory = async () => {
    triggerHaptic('medium');
    await clearCalcHistory();
    setHistory([]);
  };

  const buttons = [
    ['C', 'DEL', '%', '÷'],
    ['7', '8', '9', '×'],
    ['4', '5', '6', '-'],
    ['1', '2', '3', '+'],
    ['±', '0', '.', '='],
  ];

  const getButtonBg = (btn: string) => {
    if (btn === '=') return theme.primary;
    if (['÷', '×', '-', '+'].includes(btn)) return theme.isDark ? '#1E293B' : '#E2E8F0';
    if (['C', 'DEL', '%'].includes(btn)) return theme.isDark ? '#334155' : '#CBD5E1';
    return theme.surface;
  };

  const getButtonTextColor = (btn: string) => {
    if (btn === '=') return '#FFFFFF';
    if (['÷', '×', '-', '+'].includes(btn)) return theme.primary;
    return theme.text;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Calculator"
        onBack={onBack}
        subtitle="Offline Arithmetic & History"
        rightAction={{
          icon: 'time-outline',
          onPress: () => setHistoryModal(true),
        }}
      />

      {/* Display Screen */}
      <View style={[styles.displayArea, { backgroundColor: theme.surface }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.exprScroll}
        >
          <Text style={[styles.exprText, { color: theme.textSecondary }]}>
            {expression || '0'}
          </Text>
        </ScrollView>

        <Text style={[styles.resultText, { color: theme.primary }]}>
          {result ? `= ${result}` : ' '}
        </Text>
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {buttons.map((row, rIdx) => (
          <View key={`row-${rIdx}`} style={styles.buttonRow}>
            {row.map((btn) => (
              <TouchableOpacity
                key={btn}
                activeOpacity={0.7}
                onPress={() => {
                  if (btn === '±') {
                    if (expression.startsWith('-')) {
                      setExpression(expression.slice(1));
                    } else if (expression) {
                      setExpression('-' + expression);
                    }
                  } else {
                    handlePress(btn);
                  }
                }}
                style={[
                  styles.calcBtn,
                  {
                    backgroundColor: getButtonBg(btn),
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.calcBtnText,
                    {
                      color: getButtonTextColor(btn),
                      fontWeight: btn === '=' ? '800' : '600',
                    },
                  ]}
                >
                  {btn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* History Modal */}
      <Modal visible={historyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Calculation History</Text>
              <TouchableOpacity onPress={() => setHistoryModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 350 }}>
              {history.length === 0 ? (
                <Text style={[styles.emptyHistory, { color: theme.textMuted }]}>
                  No previous calculations recorded yet.
                </Text>
              ) : (
                history.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => {
                      setExpression(item.result);
                      setResult('');
                      setHistoryModal(false);
                    }}
                    style={[styles.historyRow, { borderBottomColor: theme.border }]}
                  >
                    <Text style={[styles.historyExpr, { color: theme.textSecondary }]}>
                      {item.expression}
                    </Text>
                    <Text style={[styles.historyRes, { color: theme.primary }]}>
                      = {item.result}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {history.length > 0 && (
              <TouchableOpacity
                onPress={handleClearHistory}
                style={[styles.clearBtn, { borderColor: theme.error }]}
              >
                <Text style={{ color: theme.error, fontWeight: '700' }}>Clear History</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  displayArea: {
    flex: 1,
    padding: 20,
    justifyContent: 'flex-end',
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  exprScroll: {
    alignItems: 'flex-end',
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  exprText: {
    fontSize: 32,
    fontWeight: '500',
    textAlign: 'right',
  },
  resultText: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 8,
    minHeight: 32,
  },
  keypad: {
    padding: 12,
    paddingBottom: 24,
    gap: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  calcBtn: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 2,
  },
  calcBtnText: {
    fontSize: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyHistory: {
    textAlign: 'center',
    paddingVertical: 32,
    fontSize: 14,
  },
  historyRow: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  historyExpr: {
    fontSize: 14,
    marginBottom: 2,
  },
  historyRes: {
    fontSize: 18,
    fontWeight: '700',
  },
  clearBtn: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
});
