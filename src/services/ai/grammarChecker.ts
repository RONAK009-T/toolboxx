import { executeAICall, AIResponse } from './aiClient';

export interface GrammarResult {
  correctedText: string;
  suggestions: string[];
  rawText: string;
}

export const checkGrammarWithAI = async (
  inputText: string
): Promise<{ success: boolean; data?: GrammarResult; error?: string }> => {
  if (!inputText || !inputText.trim()) {
    return { success: false, error: 'Please enter text to check grammar.' };
  }

  const systemPrompt = `You are a professional editor and grammar specialist.
Analyze the user's text for spelling, grammar, punctuation, phrasing, and flow.
Output your response in this exact format:

CORRECTED TEXT
[Full corrected and polished text]

SUGGESTIONS
• [Specific change 1: reason for correction]
• [Specific change 2: reason for correction]
• [Style/clarity note if applicable]

If the original text was already completely error-free, state that in suggestions.`;

  const res: AIResponse = await executeAICall(
    `Inspect and improve the grammar of this text:\n\n${inputText.trim()}`,
    { systemPrompt }
  );

  if (!res.success || !res.text) {
    return { success: false, error: res.error || 'Failed to check grammar.' };
  }

  const raw = res.text;
  let correctedText = '';
  const suggestions: string[] = [];

  const parts = raw.split(/SUGGESTIONS/i);
  if (parts.length >= 2) {
    correctedText = parts[0].replace(/^CORRECTED TEXT/i, '').trim();
    const suggestionsRaw = parts[1]
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l));
    suggestionsRaw.forEach((pt) => {
      suggestions.push(pt.replace(/^[•\-*]|\d+\.\s*/, '').trim());
    });
  } else {
    correctedText = raw;
  }

  return {
    success: true,
    data: {
      correctedText: correctedText || raw,
      suggestions:
        suggestions.length > 0 ? suggestions : ['No major grammatical issues detected.'],
      rawText: raw,
    },
  };
};
