import { getAISettings } from '../../storage/storage';

export interface AIRequestOptions {
  systemPrompt?: string;
  imageBase64?: string;
  imageMimeType?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  success: boolean;
  text?: string;
  error?: string;
  errorCode?: 'NO_API_KEY' | 'NETWORK_ERROR' | 'API_ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'SAFETY_BLOCK';
}

/**
 * Universal self-healing AI client supporting Google Gemini & OpenAI endpoints.
 * Automatically handles key sanitization, payload normalization, fallback retries,
 * rate limit detection, and safety block translations.
 */
export const executeAICall = async (
  prompt: string,
  options?: AIRequestOptions
): Promise<AIResponse> => {
  const settings = await getAISettings();

  // Validate presence of API key
  if (!settings.apiKey || !settings.apiKey.trim()) {
    return {
      success: false,
      errorCode: 'NO_API_KEY',
      error:
        'No AI API Key configured.\n\nPlease enter your free Google Gemini API Key or OpenAI Key in Settings > AI Configuration.',
    };
  }

  // Clean and sanitize API key (remove accidental spaces, quotes, newlines from copy-pasting)
  const apiKey = settings.apiKey.replace(/[\s\r\n'"]/g, '');
  const provider = settings.provider || 'gemini';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 28000); // 28s timeout

  try {
    if (provider === 'gemini') {
      // Clean model name (prevent duplicate models/models/...)
      let model = (settings.model || 'gemini-1.5-flash').trim();
      model = model.replace(/^models\//, '');
      if (!model) model = 'gemini-1.5-flash';

      const parts: any[] = [{ text: prompt }];

      // Official Google Gemini REST API camelCase schema for inline images
      if (options?.imageBase64) {
        parts.push({
          inlineData: {
            mimeType: options.imageMimeType || 'image/jpeg',
            data: options.imageBase64,
          },
        });
      }

      const body: any = {
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        generationConfig: {
          temperature: options?.temperature ?? 0.7,
        },
      };

      // Official Google Gemini REST API camelCase schema for system instruction
      if (options?.systemPrompt) {
        body.systemInstruction = {
          parts: [{ text: options.systemPrompt }],
        };
      }

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      let response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      // Automatic fallback if the configured model is not found (404)
      if (response.status === 404 && model !== 'gemini-1.5-flash') {
        const fallbackEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        response = await fetch(fallbackEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      // Handle non-200 HTTP responses
      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const rawMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

        // Rate limit detection
        if (response.status === 429 || rawMsg.includes('RESOURCE_EXHAUSTED')) {
          return {
            success: false,
            errorCode: 'RATE_LIMIT',
            error:
              'Free tier rate limit reached (requests per minute). Please wait 30 seconds and try again.',
          };
        }

        // Invalid key detection
        if (
          response.status === 400 &&
          (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid'))
        ) {
          return {
            success: false,
            errorCode: 'API_ERROR',
            error:
              'The Gemini API Key entered is invalid or expired. Please check your key in Settings.',
          };
        }

        return {
          success: false,
          errorCode: 'API_ERROR',
          error: `Gemini Error: ${rawMsg}`,
        };
      }

      const data = await response.json();

      // Check prompt safety blocks
      if (data?.promptFeedback?.blockReason) {
        return {
          success: false,
          errorCode: 'SAFETY_BLOCK',
          error: `Request was blocked by Gemini safety filters: ${data.promptFeedback.blockReason}`,
        };
      }

      const candidate = data?.candidates?.[0];

      // Check candidate finish reasons
      if (candidate?.finishReason === 'SAFETY') {
        return {
          success: false,
          errorCode: 'SAFETY_BLOCK',
          error:
            'The response was flagged by content safety policies. Please rephrase your query.',
        };
      }

      if (candidate?.finishReason === 'RECITATION') {
        return {
          success: false,
          errorCode: 'SAFETY_BLOCK',
          error:
            'Response was blocked due to strict recitation/copyright safeguards. Please adjust your prompt.',
        };
      }

      const text = candidate?.content?.parts?.[0]?.text;

      if (!text || !text.trim()) {
        return {
          success: false,
          errorCode: 'API_ERROR',
          error: 'Empty response returned by the AI model. Try asking in a different way.',
        };
      }

      return {
        success: true,
        text: text.trim(),
      };
    } else {
      // OpenAI or Compatible Endpoint
      const baseUrl = settings.customEndpoint || 'https://api.openai.com/v1';
      const model = (settings.model || 'gpt-4o-mini').trim();

      const messages: any[] = [];
      if (options?.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }

      if (options?.imageBase64) {
        messages.push({
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${options.imageMimeType || 'image/jpeg'};base64,${options.imageBase64}`,
              },
            },
          ],
        });
      } else {
        messages.push({ role: 'user', content: prompt });
      }

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const rawMsg = errJson?.error?.message || `HTTP ${response.status}: ${response.statusText}`;

        if (response.status === 429) {
          return {
            success: false,
            errorCode: 'RATE_LIMIT',
            error:
              'Rate limit exceeded or insufficient quota on your OpenAI account. Please check your usage on openai.com.',
          };
        }

        if (response.status === 401) {
          return {
            success: false,
            errorCode: 'API_ERROR',
            error:
              'Invalid OpenAI API key. Please check your key in Settings.',
          };
        }

        return {
          success: false,
          errorCode: 'API_ERROR',
          error: `OpenAI Error: ${rawMsg}`,
        };
      }

      const data = await response.json();
      const text = data?.choices?.[0]?.message?.content;

      if (!text || !text.trim()) {
        return {
          success: false,
          errorCode: 'API_ERROR',
          error: 'Empty response returned by OpenAI endpoint.',
        };
      }

      return {
        success: true,
        text: text.trim(),
      };
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      return {
        success: false,
        errorCode: 'TIMEOUT',
        error: 'The AI request timed out (28 seconds). Please check your internet connection.',
      };
    }
    return {
      success: false,
      errorCode: 'NETWORK_ERROR',
      error: `Network Error: ${err?.message || 'Unable to connect to AI provider.'}`,
    };
  }
};
