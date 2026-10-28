import { GoogleGenAI } from '@google/genai';

export const config = {
  maxDuration: 60,
};

export default async function handler(req: any, res: any) {
  // Add CORS headers so requests from custom domains / preview URLs work cleanly
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Diagnostic GET endpoint so user can verify in browser that /api/chat is active on Vercel
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      endpoint: '/api/chat',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
      message: 'Gemini Chat API route is live and ready on Vercel.',
    });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, GET, OPTIONS');
    return res.status(405).json({ error: 'Method Not Allowed. Please send a POST request.' });
  }

  try {
    const headerApiKey = (req.headers && req.headers['x-gemini-key']) as string | undefined;
    const apiKey = headerApiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error:
          'GEMINI_API_KEY is not configured on Vercel. Please open your Vercel Project Settings > Environment Variables, add GEMINI_API_KEY with your key from Google AI Studio (aistudio.google.com/apikey), and Redeploy. You can also click Settings (⚙️) inside the chatbot to enter your key directly.',
      });
    }

    // Safely parse body regardless of whether Vercel parsed it as object, string, or buffer
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    } else if (Buffer.isBuffer(body)) {
      try {
        body = JSON.parse(body.toString('utf-8'));
      } catch {}
    } else if (!body && typeof req.on === 'function') {
      const chunks: any[] = [];
      await new Promise((resolve) => {
        req.on('data', (chunk: any) => chunks.push(chunk));
        req.on('end', resolve);
      });
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
      } catch {}
    }

    body = body || {};

    const {
      messages,
      model = 'gemini-3.1-flash-lite',
      systemInstruction = 'You are Gemini, a fast, highly capable, helpful, and concise AI assistant built by Google. Respond cleanly with Markdown when appropriate, use syntax-highlighted code blocks for code, and be friendly and direct.',
      temperature = 0.7,
      grounding = false,
    } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Invalid request: Array of messages is required.' });
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof res.flushHeaders === 'function') {
      res.flushHeaders();
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-vercel',
        },
      },
    });

    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
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

    // Try candidate models with instant fallback to avoid 503 high-demand or rate-limit issues
    const requestedModel = model || 'gemini-3.1-flash-lite';
    const candidateModels = Array.from(
      new Set([
        requestedModel,
        'gemini-3.1-flash-lite',
        'gemini-flash-latest',
        'gemini-3.8-flash',
      ])
    );

    let activeIterator: any = null;
    let initialChunkText: string = '';
    let isStreamDone = false;
    let lastError: any = null;

    for (const candidateModel of candidateModels) {
      try {
        const stream = await ai.models.generateContentStream({
          model: candidateModel,
          contents,
          config: genConfig,
        });

        const iterator = stream[Symbol.asyncIterator]();
        const firstStep = await iterator.next();

        activeIterator = iterator;
        initialChunkText = firstStep.value?.text || '';
        isStreamDone = Boolean(firstStep.done);
        break;
      } catch (err: any) {
        lastError = err;
        console.warn(`Candidate model ${candidateModel} failed on startup, trying next...`, err?.message);
        continue;
      }
    }

    if (!activeIterator && !initialChunkText) {
      throw lastError || new Error('All available Gemini models are currently busy. Please try again in a few moments.');
    }

    if (initialChunkText) {
      res.write(`data: ${JSON.stringify({ text: initialChunkText })}\n\n`);
    }

    if (!isStreamDone && activeIterator) {
      while (true) {
        const { done, value } = await activeIterator.next();
        if (done) break;
        const text = value?.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Vercel API chat error:', error);
    let rawMsg = error?.message || String(error);
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed.error?.message) {
        rawMsg = parsed.error.message;
      } else if (parsed.message) {
        rawMsg = parsed.message;
      }
    } catch {}

    let userFacingMessage = rawMsg;
    if (rawMsg.includes('503') || rawMsg.includes('high demand') || rawMsg.includes('UNAVAILABLE')) {
      userFacingMessage = 'Gemini servers are currently experiencing temporary high demand. Please try sending your message again.';
    } else if (rawMsg.includes('429') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
      userFacingMessage = 'API rate limit reached. Please wait a few seconds and try again.';
    } else if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('API key not valid')) {
      userFacingMessage = 'Invalid Gemini API key. Please check your key from Google AI Studio.';
    }

    if (!res.headersSent) {
      return res.status(500).json({ error: userFacingMessage });
    } else {
      res.write(`data: ${JSON.stringify({ error: userFacingMessage })}\n\n`);
      res.end();
    }
  }
}
