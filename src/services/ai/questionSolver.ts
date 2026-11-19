import { executeAICall, AIResponse } from './aiClient';
import * as FileSystem from 'expo-file-system/legacy';

export interface SolverResult {
  answer: string;
  explanation: string;
  rawText: string;
}

export const solveQuestionWithAI = async (
  questionText: string,
  imageUri?: string | null
): Promise<{ success: boolean; data?: SolverResult; error?: string }> => {
  if (!questionText.trim() && !imageUri) {
    return { success: false, error: 'Please enter a question or attach an image to solve.' };
  }

  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;

  if (imageUri) {
    try {
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: 'base64',
      });
      imageBase64 = base64;
      imageMimeType = imageUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    } catch {
      return { success: false, error: 'Failed to read attached question image.' };
    }
  }

  const systemPrompt = `You are a precision academic and technical problem solver.
Solve the problem with step-by-step mathematical/logical rigor.
Output your solution in this exact format:

ANSWER
[Direct, final answer or conclusion in 1-2 lines]

EXPLANATION
1. [Step 1: Formula or principle applied]
2. [Step 2: Step-by-step calculation or derivation]
3. [Step 3: Verification or key insight]

Avoid unnecessary preamble. Focus on accuracy and clarity.`;

  const prompt = questionText.trim()
    ? `Solve this question:\n${questionText.trim()}`
    : 'Solve the problem shown in the attached image with clear steps.';

  const res: AIResponse = await executeAICall(prompt, {
    systemPrompt,
    imageBase64,
    imageMimeType,
  });

  if (!res.success || !res.text) {
    return { success: false, error: res.error || 'Failed to solve question.' };
  }

  const raw = res.text;
  let answer = '';
  let explanation = '';

  const parts = raw.split(/EXPLANATION/i);
  if (parts.length >= 2) {
    answer = parts[0].replace(/^ANSWER/i, '').trim();
    explanation = parts[1].trim();
  } else {
    answer = raw;
    explanation = 'See full step-by-step breakdown above.';
  }

  return {
    success: true,
    data: {
      answer: answer || raw,
      explanation: explanation || raw,
      rawText: raw,
    },
  };
};
