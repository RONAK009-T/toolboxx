import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';
import { getAISettings, AISettings } from '../../storage/storage';
import { queryAIAssistant, ChatHistoryItem } from '../../services/ai/aiAssistant';
import { summarizeTextWithAI, SummaryResult } from '../../services/ai/summarizer';
import { checkGrammarWithAI, GrammarResult } from '../../services/ai/grammarChecker';
import { solveQuestionWithAI, SolverResult } from '../../services/ai/questionSolver';
import { sharePlainText } from '../../services/sharing/sharingService';

interface Props {
  toolId: 'ai_chat' | 'ai_summarizer' | 'ai_grammar' | 'ai_question_solver';
  isOnline: boolean;
  onBack: () => void;
  onNavigateToSettings?: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
}

export const AIToolScreen: React.FC<Props> = ({
  toolId,
  isOnline,
  onBack,
  onNavigateToSettings,
}) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState<boolean>(true);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: 'Hello! I am your ToolBox X AI Assistant. Ask questions, get calculations explained, or solve problems.',
      timestamp: Date.now(),
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Results for Summarizer, Grammar, Solver
  const [summaryData, setSummaryData] = useState<SummaryResult | null>(null);
  const [grammarData, setGrammarData] = useState<GrammarResult | null>(null);
  const [solverData, setSolverData] = useState<SolverResult | null>(null);

  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const s = await getAISettings();
      setAiSettings(s);
    } catch {
      // ignore
    } finally {
      setLoadingSettings(false);
    }
  };

  const getToolMetadata = () => {
    switch (toolId) {
      case 'ai_summarizer':
        return {
          title: 'AI Document Summarizer',
          subtitle: 'Executive summaries & structured bullet points',
          placeholder: 'Paste essays, meeting notes, reports or long text to condense...',
          btnText: 'Generate Executive Summary',
        };
      case 'ai_grammar':
        return {
          title: 'AI Grammar & Style Inspector',
          subtitle: 'Grammar, punctuation and syntax refinement',
          placeholder: 'Paste draft text to inspect grammar, syntax and style...',
          btnText: 'Inspect & Polish Text',
        };
      case 'ai_question_solver':
        return {
          title: 'AI Step-by-Step Solver',
          subtitle: 'Academic math, science and logic problem solving',
          placeholder: 'Type your math, physics, coding or logic problem here...',
          btnText: 'Solve Problem Step-by-Step',
        };
      case 'ai_chat':
      default:
        return {
          title: 'AI Assistant',
          subtitle: 'Direct answers & problem solving assistant',
          placeholder: 'Ask a question or enter a query...',
          btnText: 'Send',
        };
    }
  };

  const meta = getToolMetadata();

  const handlePickImage = async () => {
    triggerHaptic('light');
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setImageUri(res.assets[0].uri);
      }
    } catch {
      Alert.alert('Permission Error', 'Could not open photo library.');
    }
  };

  const executeRealAI = async () => {
    if (!inputPrompt.trim() && !imageUri) return;

    if (!isOnline) {
      Alert.alert(
        'Internet Connection Required',
        'This feature needs an internet connection. Please connect to the internet and try again.'
      );
      return;
    }

    if (!aiSettings?.apiKey) {
      Alert.alert(
        'API Key Required',
        'Please configure your Google Gemini or OpenAI API Key in Settings to use live AI capabilities.',
        [
          { text: 'Cancel', style: 'cancel' },
          ...(onNavigateToSettings
            ? [{ text: 'Configure Settings', onPress: onNavigateToSettings }]
            : []),
        ]
      );
      return;
    }

    triggerHaptic('medium');
    setLoading(true);
    setErrorMessage(null);

    const userText = inputPrompt;
    setInputPrompt('');

    try {
      if (toolId === 'ai_chat') {
        const userMsg: ChatMessage = {
          id: Date.now().toString(),
          sender: 'user',
          text: userText,
          timestamp: Date.now(),
        };

        const history: ChatHistoryItem[] = messages.map((m) => ({
          sender: m.sender,
          text: m.text,
        }));

        setMessages((prev) => [...prev, userMsg]);

        const res = await queryAIAssistant(userText, history);
        if (res.success && res.text) {
          const aiMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            sender: 'ai',
            text: res.text,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, aiMsg]);
          triggerHaptic('success');
        } else {
          setErrorMessage(res.error || 'Failed to get AI response. Please check your API key in Settings.');
        }
      } else if (toolId === 'ai_summarizer') {
        const res = await summarizeTextWithAI(userText);
        if (res.success && res.data) {
          setSummaryData(res.data);
          triggerHaptic('success');
        } else {
          setErrorMessage(res.error || 'Failed to generate summary.');
        }
      } else if (toolId === 'ai_grammar') {
        const res = await checkGrammarWithAI(userText);
        if (res.success && res.data) {
          setGrammarData(res.data);
          triggerHaptic('success');
        } else {
          setErrorMessage(res.error || 'Failed to inspect grammar.');
        }
      } else if (toolId === 'ai_question_solver') {
        const res = await solveQuestionWithAI(userText, imageUri);
        if (res.success && res.data) {
          setSolverData(res.data);
          setImageUri(null);
          triggerHaptic('success');
        } else {
          setErrorMessage(res.error || 'Failed to solve question.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during AI processing.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    triggerHaptic('success');
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = async (text: string) => {
    triggerHaptic('light');
    await sharePlainText(text, meta.title);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={meta.title}
        subtitle={meta.subtitle}
        onBack={onBack}
        isOnlineFeature={true}
      />

      {/* Offline Mode Warning Banner */}
      {!isOnline && (
        <View style={[styles.offlineBanner, { backgroundColor: 'rgba(220, 38, 38, 0.1)', borderColor: '#DC2626' }]}>
          <Ionicons name="cloud-offline-outline" size={20} color="#DC2626" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.offlineTitle}>Internet Connection Required</Text>
            <Text style={styles.offlineSub}>
              This AI feature needs an active internet connection. Offline tools remain fully accessible anytime.
            </Text>
          </View>
        </View>
      )}

      {/* Missing API Key Banner */}
      {isOnline && !loadingSettings && !aiSettings?.apiKey && (
        <View style={[styles.keyBanner, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="key-outline" size={20} color={theme.primary} />
            <Text style={[styles.keyTitle, { color: theme.text, marginLeft: 8 }]}>AI API Key Required</Text>
          </View>
          <Text style={[styles.keySub, { color: theme.textMuted, marginBottom: 12 }]}>
            To use live AI tools, connect a free Google Gemini API key (no credit card needed).
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
              style={[styles.getKeyBtn, { backgroundColor: theme.primaryGlow, borderColor: theme.primary }]}
            >
              <Ionicons name="open-outline" size={14} color={theme.primary} />
              <Text style={[styles.getKeyBtnText, { color: theme.primary }]}>Get Free Key</Text>
            </TouchableOpacity>

            {onNavigateToSettings && (
              <TouchableOpacity
                onPress={onNavigateToSettings}
                style={[styles.configKeyBtn, { backgroundColor: theme.primary }]}
              >
                <Ionicons name="settings-outline" size={14} color="#FFFFFF" />
                <Text style={styles.configKeyBtnText}>Configure in Settings</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Error Message Alert */}
      {errorMessage && (
        <View style={[styles.errorCard, { backgroundColor: 'rgba(220, 38, 38, 0.12)', borderColor: '#DC2626' }]}>
          <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
          <Text style={styles.errorCardText}>{errorMessage}</Text>
          <TouchableOpacity onPress={() => setErrorMessage(null)}>
            <Ionicons name="close" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}

      {/* MAIN CONTENT AREA */}
      {toolId === 'ai_chat' ? (
        <View style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.chatScroll}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <View
                  key={msg.id}
                  style={[
                    styles.chatBubble,
                    isUser
                      ? [styles.userBubble, { backgroundColor: theme.primary }]
                      : [styles.aiBubble, { backgroundColor: theme.surface, borderColor: theme.border }],
                  ]}
                >
                  <Text
                    style={[
                      styles.chatBubbleText,
                      { color: isUser ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              );
            })}

            {loading && (
              <View style={[styles.aiBubble, { backgroundColor: theme.surface, borderColor: theme.border, alignSelf: 'flex-start' }]}>
                <ActivityIndicator color={theme.primary} size="small" />
              </View>
            )}
          </ScrollView>

          {/* Chat Input Bar */}
          <View style={[styles.chatInputBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <TextInput
              style={[styles.chatInput, { color: theme.text }]}
              placeholder={isOnline ? meta.placeholder : 'Offline - internet required'}
              placeholderTextColor={theme.textMuted}
              value={inputPrompt}
              onChangeText={setInputPrompt}
              editable={isOnline && !loading}
              onSubmitEditing={executeRealAI}
            />
            <TouchableOpacity
              disabled={!isOnline || loading || !inputPrompt.trim()}
              onPress={executeRealAI}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: !isOnline || loading || !inputPrompt.trim() ? theme.border : theme.primary,
                },
              ]}
            >
              <Ionicons name="arrow-up" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Form-based tools: Summarizer / Grammar / Solver */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>INPUT TEXT & CONTEXT</Text>

            <TextInput
              multiline
              numberOfLines={6}
              style={[
                styles.textArea,
                { backgroundColor: theme.background, color: theme.text, borderColor: theme.border },
              ]}
              placeholder={meta.placeholder}
              placeholderTextColor={theme.textMuted}
              value={inputPrompt}
              onChangeText={setInputPrompt}
              editable={isOnline && !loading}
            />

            {/* Optional Image Attachment for Question Solver */}
            {toolId === 'ai_question_solver' && (
              <View style={styles.imageAttachSection}>
                {imageUri ? (
                  <View style={styles.attachedImageWrapper}>
                    <Image source={{ uri: imageUri }} style={styles.attachedThumbnail} />
                    <TouchableOpacity
                      onPress={() => setImageUri(null)}
                      style={[styles.removeImgBtn, { backgroundColor: '#DC2626' }]}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={handlePickImage}
                    style={[styles.attachBtn, { backgroundColor: theme.background, borderColor: theme.border }]}
                  >
                    <Ionicons name="camera-outline" size={18} color={theme.primary} />
                    <Text style={[styles.attachBtnText, { color: theme.text }]}>
                      Attach Problem Snapshot
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <TouchableOpacity
              disabled={!isOnline || loading || (!inputPrompt.trim() && !imageUri)}
              onPress={executeRealAI}
              activeOpacity={0.85}
              style={[
                styles.primaryActionBtn,
                {
                  backgroundColor:
                    !isOnline || loading || (!inputPrompt.trim() && !imageUri)
                      ? theme.border
                      : theme.primary,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.primaryActionBtnText}>{meta.btnText}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Structured Output Card for Summarizer */}
          {summaryData && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.resultHeader}>
                <Ionicons name="document-text" size={20} color={theme.primary} />
                <Text style={[styles.resultHeaderTitle, { color: theme.text }]}>EXECUTIVE SUMMARY</Text>
              </View>
              <Text style={[styles.resultBodyText, { color: theme.text }]}>{summaryData.summary}</Text>

              <Text style={[styles.subSectionTitle, { color: theme.textSecondary }]}>KEY TAKEAWAYS</Text>
              {summaryData.keyPoints.map((pt, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={[styles.bulletSymbol, { color: theme.primary }]}>•</Text>
                  <Text style={[styles.bulletText, { color: theme.text }]}>{pt}</Text>
                </View>
              ))}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => copyToClipboard(summaryData.rawText)}
                  style={[styles.actionBtn, { borderColor: theme.border }]}
                >
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#16A34A' : theme.text} />
                  <Text style={[styles.actionBtnText, { color: copied ? '#16A34A' : theme.text }]}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => shareText(summaryData.rawText)}
                  style={[styles.actionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                >
                  <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Structured Output Card for Grammar */}
          {grammarData && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.resultHeader}>
                <Ionicons name="shield-checkmark" size={20} color="#16A34A" />
                <Text style={[styles.resultHeaderTitle, { color: theme.text }]}>POLISHED TEXT</Text>
              </View>
              <Text style={[styles.resultBodyText, { color: theme.text }]}>{grammarData.correctedText}</Text>

              <Text style={[styles.subSectionTitle, { color: theme.textSecondary }]}>IMPROVEMENTS & OBSERVATIONS</Text>
              {grammarData.suggestions.map((sg, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Ionicons name="checkmark-circle-outline" size={15} color="#16A34A" style={{ marginTop: 2 }} />
                  <Text style={[styles.bulletText, { color: theme.text }]}>{sg}</Text>
                </View>
              ))}

              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => copyToClipboard(grammarData.correctedText)}
                  style={[styles.actionBtn, { borderColor: theme.border }]}
                >
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#16A34A' : theme.text} />
                  <Text style={[styles.actionBtnText, { color: copied ? '#16A34A' : theme.text }]}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => shareText(grammarData.correctedText)}
                  style={[styles.actionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                >
                  <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Structured Output Card for Solver */}
          {solverData && (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.resultHeader}>
                <Ionicons name="calculator-outline" size={20} color={theme.primary} />
                <Text style={[styles.resultHeaderTitle, { color: theme.text }]}>FINAL ANSWER</Text>
              </View>
              <Text style={[styles.answerHighlight, { color: theme.primary }]}>{solverData.answer}</Text>

              <Text style={[styles.subSectionTitle, { color: theme.textSecondary }]}>STEP-BY-STEP EXPLANATION</Text>
              <Text style={[styles.resultBodyText, { color: theme.text, lineHeight: 22 }]}>
                {solverData.explanation}
              </Text>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  onPress={() => copyToClipboard(solverData.rawText)}
                  style={[styles.actionBtn, { borderColor: theme.border }]}
                >
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={copied ? '#16A34A' : theme.text} />
                  <Text style={[styles.actionBtnText, { color: copied ? '#16A34A' : theme.text }]}>
                    {copied ? 'Copied' : 'Copy'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => shareText(solverData.rawText)}
                  style={[styles.actionBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                >
                  <Ionicons name="share-social-outline" size={16} color="#FFFFFF" />
                  <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      )}
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  offlineTitle: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  offlineSub: {
    color: '#DC2626',
    fontSize: 11,
    marginTop: 2,
    lineHeight: 16,
  },
  keyBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  keyTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  keySub: {
    fontSize: 12,
    lineHeight: 18,
  },
  getKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  getKeyBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  configKeyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  configKeyBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  errorCardText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 120,
    marginBottom: 14,
    lineHeight: 20,
  },
  imageAttachSection: {
    marginBottom: 14,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  attachBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  attachedImageWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  attachedThumbnail: {
    width: '100%',
    height: '100%',
  },
  removeImgBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  resultHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultBodyText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 14,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 6,
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  bulletSymbol: {
    fontSize: 16,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  answerHighlight: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  chatScroll: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  chatBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
  },
  chatBubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  chatInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
