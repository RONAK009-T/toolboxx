import { executeAICall, AIResponse } from './aiClient';

export interface SummaryResult {
  summary: string;
  keyPoints: string[];
  rawText: string;
}

export const summarizeTextWithAI = async (
  inputText: string
): Promise<{ success: boolean; data?: SummaryResult; error?: string }> => {
  if (!inputText || !inputText.trim()) {
    return { success: false, error: 'Please enter text to summarize.' };
  }

  const systemPrompt = `You are an expert executive document summarizer.
Analyze the user's provided text and output your response in this exact format:

SUMMARY
[Concise executive summary of 2-4 sentences capturing core essence]

KEY POINTS
• [Key takeaway 1]
• [Key takeaway 2]
• [Key takeaway 3]
• [Key takeaway 4 (optional)]

Do not include any greeting or conversational filler.`;

  const res: AIResponse = await executeAICall(
    `Please summarize this text:\n\n${inputText.trim()}`,
    { systemPrompt }
  );

  if (!res.success || !res.text) {
    return { success: false, error: res.error || 'Failed to generate summary.' };
  }

  // Parse output into summary and key points
  const raw = res.text;
  let summary = '';
  const keyPoints: string[] = [];

  const parts = raw.split(/KEY POINTS/i);
  if (parts.length >= 2) {
    summary = parts[0].replace(/^SUMMARY/i, '').trim();
    const pointsRaw = parts[1].split(/\n/).map((l) => l.trim()).filter((l) => l.startsWith('•') || l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l));
    pointsRaw.forEach((pt) => {
      keyPoints.push(pt.replace(/^[•\-*]|\d+\.\s*/, '').trim());
    });
  } else {
    summary = raw;
  }

  return {
    success: true,
    data: {
      summary: summary || raw,
      keyPoints: keyPoints.length > 0 ? keyPoints : ['Analysis complete.'],
      rawText: raw,
    },
  };
};
