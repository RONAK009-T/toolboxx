import { executeAICall, AIResponse } from './aiClient';

export interface ChatHistoryItem {
  sender: 'user' | 'ai';
  text: string;
}

export const queryAIAssistant = async (
  prompt: string,
  history: ChatHistoryItem[] = []
): Promise<AIResponse> => {
  const systemPrompt =
    'You are ToolBox X AI Assistant, a concise, highly knowledgeable, and friendly utility assistant. Answer user questions directly, provide accurate step-by-step facts, and format with clean bullet points and code blocks where relevant. Do not include unnecessary fluff.';

  // Build conversational context
  let contextPrompt = '';
  if (history.length > 0) {
    const recent = history.slice(-6);
    contextPrompt = 'Previous conversation:\n';
    recent.forEach((h) => {
      contextPrompt += `${h.sender === 'user' ? 'User' : 'Assistant'}: ${h.text}\n`;
    });
    contextPrompt += `\nUser's new message:\n${prompt}`;
  } else {
    contextPrompt = prompt;
  }

  return executeAICall(contextPrompt, { systemPrompt });
};
