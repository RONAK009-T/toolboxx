import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useTheme } from '../../hooks/useTheme';
import { usePreferences } from '../../hooks/usePreferences';

interface Props {
  onBack: () => void;
}

export const TextToolsScreen: React.FC<Props> = ({ onBack }) => {
  const { theme } = useTheme();
  const { triggerHaptic } = usePreferences();

  const [text, setText] = useState(
    'ToolBox X provides fast, offline tools and games for your Android device.'
  );
  const [copied, setCopied] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    if (!text.trim()) {
      return { words: 0, characters: 0, charsNoSpaces: 0, sentences: 0, paragraphs: 0, readingTimeMin: 0 };
    }
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const characters = text.length;
    const charsNoSpaces = text.replace(/\s+/g, '').length;
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
    const paragraphs = text.split(/\n+/).filter((p) => p.trim().length > 0).length;
    const readingTimeMin = Math.ceil(words / 200);

    return { words, characters, charsNoSpaces, sentences, paragraphs, readingTimeMin };
  }, [text]);

  const handleCopy = async () => {
    triggerHaptic('success');
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const applyTransform = (type: string) => {
    triggerHaptic('light');
    switch (type) {
      case 'upper':
        setText(text.toUpperCase());
        break;
      case 'lower':
        setText(text.toLowerCase());
        break;
      case 'title':
        setText(
          text.replace(
            /\w\S*/g,
            (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
          )
        );
        break;
      case 'clean_spaces':
        setText(text.replace(/[ \t]+/g, ' ').replace(/^\s+|\s+$/gm, ''));
        break;
      case 'reverse':
        setText(text.split('').reverse().join(''));
        break;
      case 'remove_duplicate_lines': {
        const lines = text.split('\n');
        const unique = Array.from(new Set(lines));
        setText(unique.join('\n'));
        break;
      }
      case 'clear':
        setText('');
        break;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title="Text Utilities"
        onBack={onBack}
        subtitle="Word count, case conversion & formatting"
        rightAction={{
          icon: copied ? 'checkmark-circle' : 'copy-outline',
          onPress: handleCopy,
        }}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Statistics Grid */}
        <View style={[styles.statsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: theme.primary }]}>{stats.words}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Words</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: theme.primary }]}>{stats.characters}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Chars</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: theme.primary }]}>{stats.charsNoSpaces}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>No Spaces</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: theme.primary }]}>{stats.sentences}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Sentences</Text>
          </View>
        </View>

        {/* Text Input Area */}
        <View style={[styles.inputCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TextInput
            multiline
            value={text}
            onChangeText={setText}
            placeholder="Type or paste your text here..."
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { color: theme.text }]}
          />
        </View>

        {/* Operations Buttons Grid */}
        <View style={[styles.toolsCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.toolsTitle, { color: theme.text }]}>Text Transformations</Text>

          <View style={styles.btnGrid}>
            <TouchableOpacity onPress={() => applyTransform('upper')} style={[styles.toolBtn, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.toolBtnText, { color: theme.text }]}>UPPERCASE</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => applyTransform('lower')} style={[styles.toolBtn, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.toolBtnText, { color: theme.text }]}>lowercase</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => applyTransform('title')} style={[styles.toolBtn, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.toolBtnText, { color: theme.text }]}>Title Case</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => applyTransform('clean_spaces')} style={[styles.toolBtn, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.toolBtnText, { color: theme.text }]}>Clean Spaces</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => applyTransform('reverse')} style={[styles.toolBtn, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.toolBtnText, { color: theme.text }]}>Reverse Text</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => applyTransform('remove_duplicate_lines')} style={[styles.toolBtn, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.toolBtnText, { color: theme.text }]}>Dedup Lines</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => applyTransform('clear')} style={[styles.clearBtn, { borderColor: theme.error }]}>
            <Text style={{ color: theme.error, fontSize: 13, fontWeight: '700' }}>Clear All Text</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  statsCard: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  inputCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    minHeight: 180,
    marginBottom: 16,
  },
  input: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  toolsCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  toolsTitle: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  btnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: '47%',
  },
  toolBtnText: { fontSize: 13, fontWeight: '700' },
  clearBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
});
