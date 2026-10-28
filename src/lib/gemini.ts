/**
 * Client-side streaming caller for Gemini Chat
 * Communicates with /api/chat endpoint with automatic fallback to direct client-side
 * if /api/chat is 404 (e.g. before Vercel Serverless Function redeploy completes)
 * or if a custom Gemini API key is configured in settings.
 */
import { GoogleGenAI } from '@google/genai';

export interface StreamChatOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  grounding?: boolean;
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}

/**
 * Direct client-side streaming fallback when /api/chat server is unreachable or returning 404
 */
async function streamDirectClientGemini({
  apiKey,
  messages,
  model = 'gemini-3.1-flash-lite',
  systemInstruction,
  temperature = 0.7,
  grounding = false,
  onChunk,
}: StreamChatOptions & { apiKey: string }): Promise<string> {
  const ai = new GoogleGenAI({ apiKey });

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const genConfig: Record<string, any> = {
    temperature: typeof temperature === 'number' ? temperature : 0.7,
  };

  if (systemInstruction) {
    genConfig.systemInstruction = systemInstruction;
  }

  if (grounding) {
    genConfig.tools = [{ googleSearch: {} }];
  }

  const candidateModels = Array.from(
    new Set([
      model || 'gemini-3.1-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ])
  );

  let activeStream: any = null;
  let lastError: any = null;

  for (const candidateModel of candidateModels) {
    try {
      const stream = await ai.models.generateContentStream({
        model: candidateModel,
        contents,
        config: genConfig,
      });
      activeStream = stream;
      break;
    } catch (err: any) {
      lastError = err;
      continue;
    }
  }

  if (!activeStream) {
    throw lastError || new Error('All available Gemini models are currently busy. Please try again.');
  }

  let fullText = '';
  for await (const chunk of activeStream) {
    const text = chunk.text;
    if (text) {
      fullText += text;
      onChunk(text);
    }
  }

  return fullText;
}

export async function streamGeminiChat({
  messages,
  model = 'gemini-3.1-flash-lite',
  systemInstruction,
  temperature = 0.7,
  grounding = false,
  onChunk,
  signal,
}: StreamChatOptions): Promise<string> {
  // Retrieve custom API key from settings if saved by user
  let customApiKey = '';
  try {
    const saved = localStorage.getItem('gemini_chat_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.customApiKey) {
        customApiKey = parsed.customApiKey.trim();
      }
    }
  } catch {}

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (customApiKey) {
    headers['x-gemini-key'] = customApiKey;
  }

  let response: Response | null = null;
  let fetchError: any = null;

  try {
    response = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages,
        model,
        systemInstruction,
        temperature,
        grounding,
      }),
      signal,
    });
  } catch (err: any) {
    fetchError = err;
  }

  // If server responded with 404 or connection failed:
  if (!response || !response.ok) {
    // If the user provided a custom key or an env var is exposed, fall back to direct client generation
    const fallbackKey =
      customApiKey || ((import.meta as any).env?.VITE_GEMINI_API_KEY as string | undefined);

    if (fallbackKey) {
      console.warn('Backend /api/chat returned error, falling back to direct client-side Gemini API');
      return await streamDirectClientGemini({
        apiKey: fallbackKey,
        messages,
        model,
        systemInstruction,
        temperature,
        grounding,
        onChunk,
        signal,
      });
    }

    if (fetchError && !response) {
      throw new Error(`Connection error: ${fetchError.message || 'Could not reach server'}`);
    }

    if (response?.status === 404) {
      throw new Error(
        'Vercel Error 404: /api/chat endpoint not found on Vercel.\n\n' +
        'Fix: Please ensure vercel.json is updated and GEMINI_API_KEY is configured in Vercel Project Settings > Environment Variables.\n\n' +
        'Or click Settings (⚙️ icon in top-right) to enter your free Gemini API key directly.'
      );
    }

    let errorData: any = {};
    try {
      errorData = await response!.json();
    } catch {
      const text = await response!.text().catch(() => '');
      if (text) {
        errorData = { error: text };
      }
    }

    throw new Error(errorData.error || `Server returned error status ${response!.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Readable stream not supported by browser or response.');
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let fullAccumulator = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const dataStr = trimmed.slice(6);
      if (dataStr === '[DONE]') {
        return fullAccumulator;
      }
      try {
        const parsed = JSON.parse(dataStr);
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.done) {
          return fullAccumulator;
        }
        if (parsed.text) {
          fullAccumulator += parsed.text;
          onChunk(parsed.text);
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('JSON')) {
          throw err;
        }
      }
    }
  }

  return fullAccumulator;
}
