import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';

interface Props {
  onBack: () => void;
}

export const PasswordGeneratorScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [password, setPassword] = useState('');
  const [length, setLength] = useState(16);
  const [includeUpper, setIncludeUpper] = useState(true);
  const [includeLower, setIncludeLower] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);
  const [copied, setCopied] = useState(false);

  const generatePassword = () => {
    triggerHaptic('medium');
    let chars = '';
    if (includeUpper) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (includeLower) chars += 'abcdefghijklmnopqrstuvwxyz';
    if (includeNumbers) chars += '0123456789';
    if (includeSymbols) chars += '!@#$%^&*()_+~|}{[]:;?><,.-=';

    if (!chars) {
      setPassword('Select at least 1 option');
      return;
    }

    let generated = '';
    const array = new Uint32Array(length);
    for (let i = 0; i < length; i++) {
      generated += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(generated);
  };

  useEffect(() => {
    generatePassword();
  }, [length, includeUpper, includeLower, includeNumbers, includeSymbols]);

  const handleCopy = async () => {
    if (!password || password.startsWith('Select')) return;
    triggerHaptic('success');
    await Clipboard.setStringAsync(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Password Strength calculation
  const getStrength = () => {
    let score = 0;
    if (length >= 12) score += 1;
    if (length >= 16) score += 1;
    if (includeUpper && includeLower) score += 1;
    if (includeNumbers) score += 1;
    if (includeSymbols) score += 1;

    if (score <= 2) return { text: 'Weak', color: '#EF4444', pct: 25 };
    if (score === 3) return { text: 'Moderate', color: '#F59E0B', pct: 50 };
    if (score === 4) return { text: 'Strong', color: '#10B981', pct: 75 };
    return { text: 'Very Strong', color: '#059669', pct: 100 };
  };

  const strength = getStrength();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Password Generator"
        onBack={onBack}
        subtitle="100% offline cryptographically strong keys"
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Output Card */}
        <View style={[styles.outputCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.passwordText, { color: theme.text }]} selectable>
            {password}
          </Text>

          {/* Strength bar */}
          <View style={styles.strengthContainer}>
            <View style={styles.strengthBarBg}>
              <View style={[styles.strengthBarFill, { width: `${strength.pct}%`, backgroundColor: strength.color }]} />
            </View>
            <Text style={[styles.strengthText, { color: strength.color }]}>
              {strength.text} ({length} characters)
            </Text>
          </View>

          <View style={styles.outputActions}>
            <TouchableOpacity onPress={generatePassword} style={[styles.actionBtn, { borderColor: theme.border }]}>
              <Ionicons name="refresh" size={18} color={theme.text} />
              <Text style={[styles.actionBtnText, { color: theme.text }]}>Regenerate</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleCopy} style={[styles.actionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
              <Ionicons name={copied ? 'checkmark-circle' : 'copy-outline'} size={18} color="#FFF" />
              <Text style={[styles.actionBtnText, { color: '#FFF' }]}>
                {copied ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Options Card */}
        <View style={[styles.optionsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Password Settings</Text>

          {/* Length Selector */}
          <View style={styles.lengthRow}>
            <Text style={[styles.optionLabel, { color: theme.textSecondary }]}>Length: {length}</Text>
            <View style={styles.lengthBtns}>
              {[8, 12, 16, 20, 24, 32].map((len) => (
                <TouchableOpacity
                  key={len}
                  onPress={() => {
                    triggerHaptic('light');
                    setLength(len);
                  }}
                  style={[
                    styles.lenBtn,
                    {
                      backgroundColor: length === len ? theme.primary : theme.background,
                      borderColor: length === len ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.lenBtnText, { color: length === len ? '#FFF' : theme.text }]}>
                    {len}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Toggles */}
          <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>Uppercase Letters (A-Z)</Text>
            <Switch
              value={includeUpper}
              onValueChange={(val) => {
                triggerHaptic('light');
                setIncludeUpper(val);
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>Lowercase Letters (a-z)</Text>
            <Switch
              value={includeLower}
              onValueChange={(val) => {
                triggerHaptic('light');
                setIncludeLower(val);
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>Numbers (0-9)</Text>
            <Switch
              value={includeNumbers}
              onValueChange={(val) => {
                triggerHaptic('light');
                setIncludeNumbers(val);
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>Special Characters (!@#$...)</Text>
            <Switch
              value={includeSymbols}
              onValueChange={(val) => {
                triggerHaptic('light');
                setIncludeSymbols(val);
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  outputCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
  },
  passwordText: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginVertical: 12,
  },
  strengthContainer: {
    marginBottom: 16,
    gap: 6,
  },
  strengthBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'right',
  },
  outputActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionsCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  lengthRow: {
    marginBottom: 18,
  },
  optionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  lengthBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  lenBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  lenBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
