import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

// Load .env.local first if present, then fallback to default .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '10mb' }));

// Health and environment status check (no secret exposure)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    defaultModel: process.env.GEMINI_MODEL || 'gemini-3.8-flash',
    supportedModels: [
      { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', tag: 'Recommended', desc: 'Fastest, low-latency, free-tier supported' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', tag: 'Ultra Fast', desc: 'High throughput, minimal latency' },
      { id: 'gemini-flash-latest', name: 'Gemini Flash Latest', tag: 'Stable', desc: 'General multi-turn coding and chat' },
    ],
  });
});

// Real-time streaming Chat API endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages,
      model = 'gemini-3.8-flash',
      systemInstruction = 'You are Gemini, a fast, highly capable, helpful, and concise AI assistant built by Google. Respond cleanly with Markdown when appropriate, use syntax-highlighted code blocks for code, and be friendly and direct.',
      temperature = 0.7,
      grounding = false,
    } = req.body;

    const headerApiKey = req.headers['x-gemini-key'] as string | undefined;
    const apiKey = headerApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server. Please verify your environment variables or enter your key in Settings.',
      });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        error: 'Invalid request: Array of messages is required.',
      });
    }

    // Set Server-Sent Events headers for immediate streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Format previous messages for multi-turn Gemini conversation
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const config: Record<string, any> = {
      temperature: typeof temperature === 'number' ? temperature : 0.7,
    };

    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    if (grounding) {
      config.tools = [{ googleSearch: {} }];
    }

    // Determine models to try with automatic fallback on 503 (high demand) or 429
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
          config,
        });

        // Test the first chunk to guarantee stream is healthy before committing
        const iterator = stream[Symbol.asyncIterator]();
        const firstStep = await iterator.next();
        
        activeIterator = iterator;
        initialChunkText = firstStep.value?.text || '';
        isStreamDone = Boolean(firstStep.done);
        break; // Successfully started!
      } catch (err: any) {
        lastError = err;
        console.warn(`Candidate model ${candidateModel} failed on startup, trying next...`, err?.message);
        continue;
      }
    }

    if (!activeIterator && !initialChunkText) {
      throw lastError || new Error('All available Gemini models are currently busy. Please try again.');
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
    console.error('Server Gemini API Streaming Error:', error);
    
    // Clean formatted error message
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
    }

    const status = error?.status === 429 ? 429 : 500;

    if (!res.headersSent) {
      return res.status(status).json({ error: userFacingMessage });
    } else {
      res.write(`data: ${JSON.stringify({ error: userFacingMessage })}\n\n`);
      res.end();
    }
  }
});

// Start Express server and mount Vite in development
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`> Gemini AI Chatbot server running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
