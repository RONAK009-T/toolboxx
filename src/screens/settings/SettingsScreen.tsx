import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  Share,
  Alert,
  TextInput,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import {
  getSettings,
  saveSettings,
  clearRecents,
  resetHighScores,
  getAISettings,
  saveAISettings,
} from '../../storage/storage';
import { executeAICall } from '../../services/ai/aiClient';
import { ThemeMode } from '../../types';

interface Props {
  onBack?: () => void;
  onSimulateOfflineChange: (simulated: boolean) => void;
}

export const SettingsScreen: React.FC<Props> = ({ onBack, onSimulateOfflineChange }) => {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);
  const [simulateOffline, setSimulateOffline] = useState<boolean>(false);
  const [privacyModal, setPrivacyModal] = useState<boolean>(false);
  const [aboutModal, setAboutModal] = useState<boolean>(false);

  // AI Configuration State
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');
  const [aiApiKey, setAiApiKey] = useState<string>('');
  const [aiModel, setAiModel] = useState<string>('gemini-1.5-flash');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [isTestingAI, setIsTestingAI] = useState<boolean>(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; msg: string } | null>(null);

  useEffect(() => {
    getSettings().then((s) => {
      setSoundEnabled(s.soundEnabled);
      setVibrationEnabled(s.vibrationEnabled);
      setSimulateOffline(!!s.simulateOffline);
    });

    getAISettings().then((ai) => {
      setAiProvider(ai.provider || 'gemini');
      setAiApiKey(ai.apiKey || '');
      setAiModel(ai.model || (ai.provider === 'openai' ? 'gpt-4o-mini' : 'gemini-1.5-flash'));
    });
  }, []);

  const handleSoundToggle = async (val: boolean) => {
    triggerHaptic('light');
    setSoundEnabled(val);
    await saveSettings({ soundEnabled: val });
  };

  const handleVibrationToggle = async (val: boolean) => {
    triggerHaptic('light');
    setVibrationEnabled(val);
    await saveSettings({ vibrationEnabled: val });
  };

  const handleOfflineSimToggle = async (val: boolean) => {
    triggerHaptic('medium');
    setSimulateOffline(val);
    await saveSettings({ simulateOffline: val });
    onSimulateOfflineChange(val);
  };

  const handleSaveAISettings = async () => {
    triggerHaptic('light');
    await saveAISettings({
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      model: aiModel.trim(),
    });
    Alert.alert('AI Settings Saved', 'Your AI provider credentials have been safely stored locally.');
  };

  const handleTestAIConnection = async () => {
    if (!aiApiKey.trim()) {
      Alert.alert('Missing API Key', 'Please enter your API key first.');
      return;
    }

    triggerHaptic('medium');
    setIsTestingAI(true);
    setAiTestResult(null);

    // Save temporary state so executeAICall picks it up
    await saveAISettings({
      provider: aiProvider,
      apiKey: aiApiKey.trim(),
      model: aiModel.trim(),
    });

    try {
      const res = await executeAICall('Respond with "Connection Successful" if you receive this.');
      if (res.success && res.text) {
        setAiTestResult({ success: true, msg: 'Connected successfully to ' + aiProvider.toUpperCase() });
        triggerHaptic('success');
      } else {
        setAiTestResult({ success: false, msg: res.error || 'Connection test failed. Check API key.' });
        triggerHaptic('error');
      }
    } catch (err: any) {
      setAiTestResult({ success: false, msg: err?.message || 'Connection test failed.' });
      triggerHaptic('error');
    } finally {
      setIsTestingAI(false);
    }
  };

  const handleClearRecents = async () => {
    triggerHaptic('medium');
    await clearRecents();
    Alert.alert('History Cleared', 'Recently opened tools and games history was cleared.');
  };

  const handleResetScores = () => {
    Alert.alert(
      'Reset High Scores',
      'Are you sure you want to reset all offline game high scores?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            triggerHaptic('error');
            await resetHighScores();
            Alert.alert('Scores Reset', 'All game records have been reset.');
          },
        },
      ]
    );
  };

  const handleShareApp = async () => {
    triggerHaptic('light');
    try {
      await Share.share({
        message:
          'ToolBox X — Free offline tools, calculators, image converters, and mini-games for Android. No login, no signup!',
      });
    } catch {
      // ignore
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Settings & Preferences"
        onBack={onBack || (() => {})}
        subtitle="Theme, audio, AI configuration & offline mode"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {(['dark', 'light', 'system'] as ThemeMode[]).map((mode) => {
            const isSel = themeMode === mode;
            return (
              <TouchableOpacity
                key={mode}
                onPress={() => {
                  triggerHaptic('light');
                  setThemeMode(mode);
                }}
                style={[styles.themeOptionRow, { borderBottomColor: theme.border }]}
              >
                <View style={styles.themeLabelRow}>
                  <Ionicons
                    name={
                      mode === 'dark'
                        ? 'moon-outline'
                        : mode === 'light'
                        ? 'sunny-outline'
                        : 'phone-portrait-outline'
                    }
                    size={20}
                    color={theme.text}
                    style={{ marginRight: 10 }}
                  />
                  <Text style={[styles.optionText, { color: theme.text }]}>
                    {mode === 'dark'
                      ? 'Dark Mode'
                      : mode === 'light'
                      ? 'Light Mode'
                      : 'System Default'}
                  </Text>
                </View>
                {isSel && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* AI Configuration Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>AI ENGINE CONFIGURATION</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.aiHelperText, { color: theme.textMuted }]}>
            ToolBox X AI features (Chat, Summarizer, Grammar, Problem Solver) connect directly from your device using your own API key.
          </Text>

          {/* Provider selector */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>PROVIDER</Text>
          <View style={styles.providerRow}>
            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                setAiProvider('gemini');
                if (!aiModel || aiModel.includes('gpt')) setAiModel('gemini-1.5-flash');
              }}
              style={[
                styles.providerBtn,
                {
                  backgroundColor: aiProvider === 'gemini' ? theme.primary : theme.background,
                  borderColor: aiProvider === 'gemini' ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[styles.providerBtnText, { color: aiProvider === 'gemini' ? '#FFFFFF' : theme.text }]}>
                Google Gemini (Free)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                triggerHaptic('light');
                setAiProvider('openai');
                if (!aiModel || aiModel.includes('gemini')) setAiModel('gpt-4o-mini');
              }}
              style={[
                styles.providerBtn,
                {
                  backgroundColor: aiProvider === 'openai' ? theme.primary : theme.background,
                  borderColor: aiProvider === 'openai' ? theme.primary : theme.border,
                },
              ]}
            >
              <Text style={[styles.providerBtnText, { color: aiProvider === 'openai' ? '#FFFFFF' : theme.text }]}>
                OpenAI / Compatible
              </Text>
            </TouchableOpacity>
          </View>

          {/* API Key */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>API KEY</Text>
            {aiProvider === 'gemini' && (
              <TouchableOpacity
                onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
              >
                <Ionicons name="open-outline" size={13} color={theme.primary} />
                <Text style={{ color: theme.primary, fontSize: 11, fontWeight: '700' }}>
                  Get Free Key (Google AI Studio)
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.apiKeyInputWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <TextInput
              style={[styles.apiKeyInput, { color: theme.text }]}
              placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
              placeholderTextColor={theme.textMuted}
              value={aiApiKey}
              onChangeText={setAiApiKey}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowApiKey(!showApiKey)} style={styles.eyeBtn}>
              <Ionicons
                name={showApiKey ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={theme.textMuted}
              />
            </TouchableOpacity>
          </View>

          {/* Model Name & Presets */}
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>MODEL SELECTION</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {aiProvider === 'gemini'
              ? ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => {
                      triggerHaptic('light');
                      setAiModel(m);
                    }}
                    style={[
                      styles.modelChip,
                      {
                        backgroundColor: aiModel === m ? theme.primaryGlow : theme.background,
                        borderColor: aiModel === m ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modelChipText,
                        { color: aiModel === m ? theme.primary : theme.textSecondary },
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))
              : ['gpt-4o-mini', 'gpt-4o'].map((m) => (
                  <TouchableOpacity
                    key={m}
                    onPress={() => {
                      triggerHaptic('light');
                      setAiModel(m);
                    }}
                    style={[
                      styles.modelChip,
                      {
                        backgroundColor: aiModel === m ? theme.primaryGlow : theme.background,
                        borderColor: aiModel === m ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modelChipText,
                        { color: aiModel === m ? theme.primary : theme.textSecondary },
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
          </View>
          <TextInput
            style={[styles.modelInput, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
            value={aiModel}
            onChangeText={setAiModel}
            placeholder={aiProvider === 'gemini' ? 'gemini-1.5-flash' : 'gpt-4o-mini'}
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
          />

          {/* Test Status feedback */}
          {aiTestResult && (
            <View
              style={[
                styles.testResultBox,
                {
                  backgroundColor: aiTestResult.success ? 'rgba(22, 163, 74, 0.12)' : 'rgba(220, 38, 38, 0.12)',
                  borderColor: aiTestResult.success ? '#16A34A' : '#DC2626',
                },
              ]}
            >
              <Ionicons
                name={aiTestResult.success ? 'checkmark-circle' : 'alert-circle'}
                size={16}
                color={aiTestResult.success ? '#16A34A' : '#DC2626'}
              />
              <Text
                style={[
                  styles.testResultText,
                  { color: aiTestResult.success ? '#16A34A' : '#DC2626' },
                ]}
              >
                {aiTestResult.msg}
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.aiActionRow}>
            <TouchableOpacity
              disabled={isTestingAI}
              onPress={handleTestAIConnection}
              style={[styles.aiSecondaryBtn, { borderColor: theme.border, backgroundColor: theme.background }]}
            >
              {isTestingAI ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <>
                  <Ionicons name="flash-outline" size={15} color={theme.text} />
                  <Text style={[styles.aiSecondaryBtnText, { color: theme.text }]}>Test Connection</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSaveAISettings}
              style={[styles.aiPrimaryBtn, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="save-outline" size={15} color="#FFFFFF" />
              <Text style={styles.aiPrimaryBtnText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PREFERENCES</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <View style={styles.themeLabelRow}>
              <Ionicons name="volume-medium-outline" size={20} color={theme.text} style={{ marginRight: 10 }} />
              <Text style={[styles.optionText, { color: theme.text }]}>Sound Effects</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          <View style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <View style={styles.themeLabelRow}>
              <Ionicons name="hardware-chip-outline" size={20} color={theme.text} style={{ marginRight: 10 }} />
              <Text style={[styles.optionText, { color: theme.text }]}>Haptic Vibration</Text>
            </View>
            <Switch
              value={vibrationEnabled}
              onValueChange={handleVibrationToggle}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          {/* Offline Simulator Switch */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <View style={styles.themeLabelRow}>
                <Ionicons name="cloud-offline-outline" size={20} color="#F59E0B" style={{ marginRight: 10 }} />
                <Text style={[styles.optionText, { color: theme.text }]}>Simulate Offline Mode</Text>
              </View>
              <Text style={[styles.optionDesc, { color: theme.textMuted }]}>
                Force the app into offline mode for instant verification of offline features.
              </Text>
            </View>
            <Switch
              value={simulateOffline}
              onValueChange={handleOfflineSimToggle}
              trackColor={{ false: theme.border, true: '#F59E0B' }}
            />
          </View>
        </View>

        {/* Storage & Data Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DATA & STORAGE</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity onPress={handleClearRecents} style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <View style={styles.themeLabelRow}>
              <Ionicons name="trash-outline" size={20} color={theme.text} style={{ marginRight: 10 }} />
              <Text style={[styles.optionText, { color: theme.text }]}>Clear Recently Used Tools</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleResetScores} style={styles.toggleRow}>
            <View style={styles.themeLabelRow}>
              <Ionicons name="trophy-outline" size={20} color={theme.error} style={{ marginRight: 10 }} />
              <Text style={[styles.optionText, { color: theme.error }]}>Reset Game High Scores</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Privacy & Legal Section */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>PRIVACY & ABOUT</Text>
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TouchableOpacity onPress={() => setPrivacyModal(true)} style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <View style={styles.themeLabelRow}>
              <Ionicons name="shield-checkmark-outline" size={20} color={theme.text} style={{ marginRight: 10 }} />
              <Text style={[styles.optionText, { color: theme.text }]}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setAboutModal(true)} style={[styles.toggleRow, { borderBottomColor: theme.border }]}>
            <View style={styles.themeLabelRow}>
              <Ionicons name="information-circle-outline" size={20} color={theme.text} style={{ marginRight: 10 }} />
              <Text style={[styles.optionText, { color: theme.text }]}>About ToolBox X</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShareApp} style={styles.toggleRow}>
            <View style={styles.themeLabelRow}>
              <Ionicons name="share-social-outline" size={20} color={theme.text} style={{ marginRight: 10 }} />
              <Text style={[styles.optionText, { color: theme.text }]}>Share ToolBox X</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Version Info footer */}
        <View style={styles.versionFooter}>
          <Text style={[styles.versionText, { color: theme.textMuted }]}>
            ToolBox X for Android • v1.0.0 (Production Release)
          </Text>
          <Text style={[styles.versionSub, { color: theme.textMuted }]}>
            100% Free • Offline First • Zero Login
          </Text>
        </View>
      </ScrollView>

      {/* Privacy Policy Modal */}
      <Modal visible={privacyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Privacy Policy</Text>
              <TouchableOpacity onPress={() => setPrivacyModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              <Text style={[styles.policyText, { color: theme.textSecondary }]}>
                ToolBox X is built with user privacy as a fundamental pillar.{'\n\n'}
                1. No Account or Personal Information:{'\n'}
                ToolBox X does not require login, registration, email address, phone number, or passwords. You can use every offline tool and game immediately without creating an account.{'\n\n'}
                2. Local-First Processing:{'\n'}
                Calculators, photo compression, image resizing, image cropping, format conversion, QR code generation, password generation, stopwatch, and all mini-games operate 100% on your device. Your data never leaves your device for offline operations.{'\n\n'}
                3. Advertising Policy:{'\n'}
                The application is free and supported by Google AdMob. Google AdMob may process non-personally identifiable device identifiers according to Google's Advertising Privacy Policies to serve contextual ads when the device is connected to the internet.{'\n\n'}
                4. AI and Online Services:{'\n'}
                Online AI features process typed queries through secure API connections only when internet is active.
              </Text>
            </ScrollView>
            <TouchableOpacity
              onPress={() => setPrivacyModal(false)}
              style={[styles.modalCloseBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal */}
      <Modal visible={aboutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.aboutHeader}>
              <View style={[styles.appLogoCircle, { backgroundColor: theme.primaryGlow }]}>
                <Ionicons name="cube" size={32} color={theme.primary} />
              </View>
              <Text style={[styles.aboutAppName, { color: theme.text }]}>TOOLBOX X</Text>
              <Text style={[styles.aboutTagline, { color: theme.textMuted }]}>
                Everyday offline utility suite & games
              </Text>
            </View>

            <View style={[styles.aboutDetailsBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={styles.aboutRow}>
                <Text style={[styles.aboutLabel, { color: theme.textMuted }]}>VERSION</Text>
                <Text style={[styles.aboutVal, { color: theme.text }]}>1.0.0 (Expo SDK 58)</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={[styles.aboutLabel, { color: theme.textMuted }]}>ACCOUNT</Text>
                <Text style={[styles.aboutVal, { color: '#16A34A' }]}>None Required (Zero Login)</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={[styles.aboutLabel, { color: theme.textMuted }]}>OFFLINE SUPPORT</Text>
                <Text style={[styles.aboutVal, { color: '#16A34A' }]}>100% Offline Core Tools & Games</Text>
              </View>
              <View style={styles.aboutRow}>
                <Text style={[styles.aboutLabel, { color: theme.textMuted }]}>MONETIZATION</Text>
                <Text style={[styles.aboutVal, { color: theme.text }]}>Non-intrusive Google AdMob</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setAboutModal(false)}
              style={[styles.modalCloseBtn, { backgroundColor: theme.primary }]}
            >
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginTop: 6,
    marginBottom: 10,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  themeOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  themeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionDesc: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  aiHelperText: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  providerBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  providerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  apiKeyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  apiKeyInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 13,
  },
  eyeBtn: {
    padding: 6,
  },
  modelChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  modelChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modelInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    marginBottom: 14,
  },
  testResultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  testResultText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  aiActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  aiSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  aiSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  aiPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  aiPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  versionFooter: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  versionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '90%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  policyText: {
    fontSize: 13,
    lineHeight: 20,
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  aboutHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  appLogoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  aboutAppName: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  aboutTagline: {
    fontSize: 12,
    marginTop: 2,
  },
  aboutDetailsBox: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aboutLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  aboutVal: {
    fontSize: 12,
    fontWeight: '600',
  },
});
