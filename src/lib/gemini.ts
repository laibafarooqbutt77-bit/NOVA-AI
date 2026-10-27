/**
 * Secure client-side streaming caller for Gemini Chat
 * Communicates with our server-side /api/chat endpoint
 */
export interface StreamChatOptions {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  model?: string;
  systemInstruction?: string;
  temperature?: number;
  grounding?: boolean;
  onChunk: (chunk: string) => void;
  signal?: AbortSignal;
}

export async function streamGeminiChat({
  messages,
  model = 'gemini-3.8-flash',
  systemInstruction,
  temperature = 0.7,
  grounding = false,
  onChunk,
  signal,
}: StreamChatOptions): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      model,
      systemInstruction,
      temperature,
      grounding,
    }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Server returned error status ${response.status}`);
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
