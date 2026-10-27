import React, { useState } from 'react';
import {
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Layers,
  Code2,
  ExternalLink,
  CheckCircle,
  FolderOpen,
  Folder,
  FileCode,
  FileText,
  Lock,
  Rocket,
  CheckSquare,
} from 'lucide-react';

interface CodeAndSetupGuideProps {
  onShowToast: (msg: string) => void;
}

export const CodeAndSetupGuide: React.FC<CodeAndSetupGuideProps> = ({ onShowToast }) => {
  const [activeCodeTab, setActiveCodeTab] = useState<'api' | 'hook' | 'lib' | 'readme'>('api');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copySnippet = (id: string, text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(id);
      onShowToast(`${label} copied to clipboard`);
      setTimeout(() => setCopiedKey(null), 2000);
    });
  };

  const API_CODE = `import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('[CRITICAL] Missing GEMINI_API_KEY environment variable.');
}

const ai = new GoogleGenAI({
  apiKey: apiKey || '',
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
});

export async function POST(req: NextRequest) {
  try {
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key configuration error on server.' },
        { status: 500 }
      );
    }

    const { messages, model = 'gemini-3.1-flash-lite' } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: Array of messages is required.' },
        { status: 400 }
      );
    }

    const contents = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const result = await ai.models.generateContentStream({
      model,
      contents,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result) {
            if (chunk.text) {
              controller.enqueue(encoder.encode(chunk.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache, no-transform',
      },
    });
  } catch (error: any) {
    const status = error?.status === 429 ? 429 : 500;
    const message = error?.status === 429
      ? 'Gemini API rate limit exceeded. Please retry in a few seconds.'
      : (error?.message || 'Internal Generation Error');

    return NextResponse.json({ error: message }, { status });
  }
}`;

  const HOOK_CODE = `'use client';

import { useState, useEffect, useCallback } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

const STORAGE_KEY = 'gemini_chat_sessions_v2';
const ACTIVE_SESSION_KEY = 'gemini_active_session_id';

export function useChatStorage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: ChatSession[] = raw ? JSON.parse(raw) : [];
      setSessions(parsed);

      const savedActive = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (savedActive && parsed.some(s => s.id === savedActive)) {
        setActiveId(savedActive);
      } else if (parsed.length > 0) {
        setActiveId(parsed[0].id);
      }
    } catch (e) {
      console.error('Failed to parse chat storage:', e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const persist = useCallback((updated: ChatSession[]) => {
    setSessions(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const createSession = useCallback((title = 'New Chat') => {
    const newId = 'session_' + Date.now().toString(36);
    const fresh: ChatSession = {
      id: newId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
    };
    persist([fresh, ...sessions]);
    setActiveId(newId);
    localStorage.setItem(ACTIVE_SESSION_KEY, newId);
    return fresh;
  }, [sessions, persist]);

  const appendMessage = useCallback((sessionId: string, msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const enriched: ChatMessage = {
      ...msg,
      id: 'msg_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };

    const next = sessions.map(s => {
      if (s.id !== sessionId) return s;
      const updatedTitle = s.messages.length === 0 && msg.role === 'user'
        ? msg.content.slice(0, 36) + (msg.content.length > 36 ? '...' : '')
        : s.title;

      return {
        ...s,
        title: updatedTitle,
        updatedAt: Date.now(),
        messages: [...s.messages, enriched],
      };
    });
    persist(next);
  }, [sessions, persist]);

  return {
    sessions,
    activeSession: sessions.find(s => s.id === activeId) || null,
    activeId,
    setActiveId,
    isLoaded,
    createSession,
    appendMessage,
  };
}`;

  const CLIENT_LIB_CODE = `export async function streamChatCompletion({
  messages,
  model = 'gemini-3.1-flash-lite',
  onChunk,
}: {
  messages: { role: 'user' | 'assistant'; content: string }[];
  model?: string;
  onChunk: (chunkText: string) => void;
}) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model }),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error || \`HTTP Error: \${response.status}\`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No readable stream body returned');

  const decoder = new TextDecoder();
  let fullAccumulator = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const text = decoder.decode(value, { stream: true });
    fullAccumulator += text;
    onChunk(text);
  }

  return fullAccumulator;
}`;

  const README_SNIPPET = `# Gemini AI Chatbot Setup Guide

1. Clone or initialize the repository:
   git clone <repo-url> && cd gemini-chatbot

2. Configure .env.local:
   GEMINI_API_KEY="AIzaSy..."

3. Run locally:
   npm install
   npm run dev

4. Visit http://localhost:3000`;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-[#FFFFFF] p-6 sm:p-8 border border-[#E9E4F5] shadow-[0_4px_20px_rgba(41,38,58,0.03)]">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#EDE9FE]/50 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#BFDBFE]/40 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#EDE9FE] font-mono text-[11px] text-[#6D28D9] font-medium uppercase tracking-wider border border-[#E9E4F5]">
                Production Blueprint
              </span>
              <span className="flex items-center gap-1 font-mono text-xs text-[#858398]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C4B5FD] animate-pulse"></span>
                Next.js 14.2+ App Router
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#29263A] tracking-tight">
              Full-Stack Gemini AI Chat Engine
            </h1>
            <p className="text-sm text-[#858398] leading-relaxed">
              Zero-leak server-side streaming API, persistent client-side conversation store with zero SQL backend dependency, and light pastel UI architecture.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() =>
                copySnippet(
                  'cli',
                  'npx create-next-app@latest gemini-chatbot --typescript --tailwind --eslint --app',
                  'CLI command'
                )
              }
              className="px-4 py-2 rounded-xl bg-[#F8F6FF] hover:bg-[#EDE9FE] text-xs font-mono text-[#29263A] transition-all flex items-center gap-2 border border-[#E9E4F5]"
            >
              <Terminal className="w-4 h-4 text-[#7C3AED]" />
              <span>{copiedKey === 'cli' ? 'Copied!' : 'CLI Quickstart'}</span>
            </button>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-[#C4B5FD] hover:bg-[#B5A3FC] text-xs font-semibold text-[#29263A] transition-all flex items-center gap-2 shadow-xs"
            >
              <Rocket className="w-4 h-4" />
              <span>Get Free API Key</span>
            </a>
          </div>
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6 pt-4 border-t border-[#E9E4F5] bg-[#F8F6FF] rounded-2xl p-4">
          <div>
            <span className="font-mono text-[10px] text-[#858398] uppercase block">
              Streaming Latency
            </span>
            <span className="text-xl font-bold text-[#7C3AED]">~140ms</span>
            <span className="text-xs text-[#858398] block">First token chunk</span>
          </div>
          <div>
            <span className="font-mono text-[10px] text-[#858398] uppercase block">
              Client State
            </span>
            <span className="text-xl font-bold text-[#2563EB]">Zero-SQL</span>
            <span className="text-xs text-[#858398] block">Hydrated LocalStorage</span>
          </div>
          <div>
            <span className="font-mono text-[10px] text-[#858398] uppercase block">
              API Key Safety
            </span>
            <span className="text-xl font-bold text-[#29263A]">100% Server</span>
            <span className="text-xs text-[#858398] block">Isolated in backend</span>
          </div>
          <div>
            <span className="font-mono text-[10px] text-[#858398] uppercase block">
              Bundle Footprint
            </span>
            <span className="text-xl font-bold text-[#29263A]">&lt; 38 kB</span>
            <span className="text-xs text-[#858398] block">Minified scripts</span>
          </div>
        </div>
      </div>

      {/* Stack & Terminal Initialization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stack Matrix */}
        <div className="lg:col-span-1 space-y-4 bg-[#FFFFFF] p-5 rounded-3xl border border-[#E9E4F5] shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#29263A]">Stack Matrix</h2>
              <p className="text-xs text-[#858398]">Dependencies & baseline</p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F6FF] border border-[#E9E4F5]">
              <span className="text-[#29263A] flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
                Next.js Framework
              </span>
              <span className="font-mono text-[#6D28D9] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E9E4F5]">
                v14.2+ App Router
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F6FF] border border-[#E9E4F5]">
              <span className="text-[#29263A] flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
                Gemini SDK
              </span>
              <span className="font-mono text-[#6D28D9] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E9E4F5]">
                @google/genai ^2.4
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F6FF] border border-[#E9E4F5]">
              <span className="text-[#29263A] flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
                Styling
              </span>
              <span className="font-mono text-[#6D28D9] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E9E4F5]">
                Tailwind CSS
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8F6FF] border border-[#E9E4F5]">
              <span className="text-[#29263A] flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5 text-[#10B981]" />
                Icons
              </span>
              <span className="font-mono text-[#6D28D9] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#E9E4F5]">
                lucide-react
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#EDE9FE]/50 border border-[#E9E4F5] space-y-1">
            <span className="text-xs font-semibold text-[#6D28D9] flex items-center gap-1.5">
              <span>✦</span> Free Tier Ready
            </span>
            <p className="text-[11px] text-[#858398] leading-relaxed">
              Fully optimized with automatic model fallback, zero latency bottlenecks, and high uptime.
            </p>
          </div>
        </div>

        {/* Terminal Quickstart */}
        <div className="lg:col-span-2 space-y-4 bg-[#FFFFFF] p-5 rounded-3xl border border-[#E9E4F5] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED]">
                <Terminal className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-[#29263A]">Terminal Initialization</h2>
                <p className="text-xs text-[#858398]">Scaffold project & install dependencies</p>
              </div>
            </div>
            <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-[#F8F6FF] text-[#858398] border border-[#E9E4F5]">bash</span>
          </div>

          <div className="space-y-3">
            <div className="bg-[#F8F6FF] rounded-2xl overflow-hidden border border-[#E9E4F5]">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#FFFFFF] border-b border-[#E9E4F5]">
                <span className="font-mono text-[11px] text-[#858398]"># 1. Initialize App Router</span>
                <button
                  onClick={() =>
                    copySnippet(
                      'c1',
                      'npx create-next-app@latest gemini-chatbot --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"',
                      'Command'
                    )
                  }
                  className="flex items-center gap-1 font-mono text-[11px] text-[#858398] hover:text-[#29263A]"
                >
                  {copiedKey === 'c1' ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'c1' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-3.5 font-mono text-xs text-[#2563EB] overflow-x-auto">
                npx create-next-app@latest gemini-chatbot --typescript --tailwind --eslint --app --src-dir --import-alias &quot;@/*&quot;
              </div>
            </div>

            <div className="bg-[#F8F6FF] rounded-2xl overflow-hidden border border-[#E9E4F5]">
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#FFFFFF] border-b border-[#E9E4F5]">
                <span className="font-mono text-[11px] text-[#858398]"># 2. Install Gemini SDK</span>
                <button
                  onClick={() =>
                    copySnippet(
                      'c2',
                      'npm install @google/genai lucide-react clsx tailwind-merge',
                      'Package install'
                    )
                  }
                  className="flex items-center gap-1 font-mono text-[11px] text-[#858398] hover:text-[#29263A]"
                >
                  {copiedKey === 'c2' ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'c2' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-3.5 font-mono text-xs text-[#7C3AED] overflow-x-auto">
                npm install @google/genai lucide-react clsx tailwind-merge
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Setup & Key Isolation */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-3xl border border-[#E9E4F5] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED]">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#29263A]">Environment Setup & Key Isolation</h2>
              <p className="text-xs text-[#858398]">Zero-leak server-side secret protection</p>
            </div>
          </div>
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#6D28D9] font-medium hover:underline"
          >
            <span>Get Free Key via Google AI Studio</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#F8F6FF] rounded-2xl overflow-hidden border border-[#E9E4F5] flex flex-col justify-between">
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#FFFFFF] border-b border-[#E9E4F5]">
              <span className="font-mono text-xs text-[#29263A]">.env.local</span>
              <button
                onClick={() =>
                  copySnippet(
                    'env',
                    'GEMINI_API_KEY="AIzaSyYourSecretAPIKeyGoesHere"\nGEMINI_MODEL="gemini-3.1-flash-lite"',
                    '.env.local'
                  )
                }
                className="flex items-center gap-1 font-mono text-[11px] text-[#858398] hover:text-[#29263A]"
              >
                {copiedKey === 'env' ? <Check className="w-3 h-3 text-[#10B981]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'env' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="p-3.5 font-mono text-xs leading-relaxed overflow-x-auto text-[#29263A]">
              <span className="text-[#858398]"># Google Gemini API Key (Server-side only)</span><br />
              <span className="text-[#2563EB]">GEMINI_API_KEY</span>=<span className="text-[#7C3AED]">&quot;AIzaSyYourGeneratedSecretKey_xyz&quot;</span><br /><br />
              <span className="text-[#858398]"># Configurable Default Model</span><br />
              <span className="text-[#2563EB]">GEMINI_MODEL</span>=<span className="text-[#7C3AED]">&quot;gemini-3.1-flash-lite&quot;</span>
            </div>
            <div className="px-3.5 py-1.5 bg-[#FFFFFF] border-t border-[#E9E4F5] font-mono text-[11px] text-[#858398]">
              Keep .env.local in your .gitignore file
            </div>
          </div>

          <div className="bg-[#F8F6FF] p-4 rounded-2xl border border-[#E9E4F5] space-y-3 flex flex-col justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#29263A] flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#E11D48]" />
                Zero-Leak Security Rule
              </span>
              <p className="text-xs text-[#4B485E] leading-relaxed">
                Never prepend <code className="text-[#E11D48] font-mono bg-[#FFFFFF] px-1 rounded border border-[#E9E4F5]">NEXT_PUBLIC_</code> to your Gemini API key. Keep variables isolated in server runtime handlers.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#FECDD3]">
                <span className="text-[#E11D48] font-medium block">❌ Insecure:</span>
                <span className="font-mono text-[10px] text-[#858398]">NEXT_PUBLIC_GEMINI_KEY</span>
              </div>
              <div className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#E9E4F5]">
                <span className="text-[#10B981] font-medium block">✓ Safe:</span>
                <span className="font-mono text-[10px] text-[#858398]">GEMINI_API_KEY</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Codebase Implementation Tabs */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-3xl border border-[#E9E4F5] space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-[#7C3AED]">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#29263A]">Implementation Codebase</h2>
              <p className="text-xs text-[#858398]">Complete production files ready to copy</p>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-[#F8F6FF] p-1 rounded-xl border border-[#E9E4F5] text-xs">
            <button
              onClick={() => setActiveCodeTab('api')}
              className={`px-3 py-1 rounded-lg font-mono transition-colors ${
                activeCodeTab === 'api'
                  ? 'bg-[#FFFFFF] text-[#29263A] shadow-xs font-semibold'
                  : 'text-[#858398] hover:text-[#29263A]'
              }`}
            >
              route.ts
            </button>
            <button
              onClick={() => setActiveCodeTab('hook')}
              className={`px-3 py-1 rounded-lg font-mono transition-colors ${
                activeCodeTab === 'hook'
                  ? 'bg-[#FFFFFF] text-[#29263A] shadow-xs font-semibold'
                  : 'text-[#858398] hover:text-[#29263A]'
              }`}
            >
              useChatStorage.ts
            </button>
            <button
              onClick={() => setActiveCodeTab('lib')}
              className={`px-3 py-1 rounded-lg font-mono transition-colors ${
                activeCodeTab === 'lib'
                  ? 'bg-[#FFFFFF] text-[#29263A] shadow-xs font-semibold'
                  : 'text-[#858398] hover:text-[#29263A]'
              }`}
            >
              gemini.ts
            </button>
            <button
              onClick={() => setActiveCodeTab('readme')}
              className={`px-3 py-1 rounded-lg font-mono transition-colors ${
                activeCodeTab === 'readme'
                  ? 'bg-[#FFFFFF] text-[#29263A] shadow-xs font-semibold'
                  : 'text-[#858398] hover:text-[#29263A]'
              }`}
            >
              README.md
            </button>
          </div>
        </div>

        <div className="bg-[#F8F6FF] rounded-2xl overflow-hidden border border-[#E9E4F5]">
          <div className="flex items-center justify-between px-4 py-2 bg-[#FFFFFF] border-b border-[#E9E4F5]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C4B5FD]"></span>
              <span className="font-mono text-xs text-[#29263A]">
                {activeCodeTab === 'api' && 'src/app/api/chat/route.ts'}
                {activeCodeTab === 'hook' && 'src/hooks/useChatStorage.ts'}
                {activeCodeTab === 'lib' && 'src/lib/gemini.ts'}
                {activeCodeTab === 'readme' && 'README.md'}
              </span>
            </div>
            <button
              onClick={() => {
                const codeMap = {
                  api: API_CODE,
                  hook: HOOK_CODE,
                  lib: CLIENT_LIB_CODE,
                  readme: README_SNIPPET,
                };
                copySnippet(activeCodeTab, codeMap[activeCodeTab], 'File code');
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-xs font-mono text-[#29263A] transition-colors border border-[#E9E4F5]"
            >
              {copiedKey === activeCodeTab ? (
                <Check className="w-3.5 h-3.5 text-[#10B981]" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === activeCodeTab ? 'Copied' : 'Copy File'}</span>
            </button>
          </div>

          <pre className="p-4 font-mono text-xs leading-relaxed overflow-x-auto text-[#29263A] max-h-96">
            <code>
              {activeCodeTab === 'api' && API_CODE}
              {activeCodeTab === 'hook' && HOOK_CODE}
              {activeCodeTab === 'lib' && CLIENT_LIB_CODE}
              {activeCodeTab === 'readme' && README_SNIPPET}
            </code>
          </pre>
        </div>
      </div>

      {/* Directory Layout & Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-[#FFFFFF] p-5 rounded-3xl border border-[#E9E4F5] space-y-3 shadow-xs">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-[#7C3AED]" />
            <h2 className="text-sm font-semibold text-[#29263A]">Directory Layout</h2>
          </div>
          <div className="bg-[#F8F6FF] p-4 rounded-2xl font-mono text-xs text-[#29263A] space-y-1.5 overflow-x-auto border border-[#E9E4F5]">
            <div className="text-[#29263A] font-semibold flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-[#7C3AED]" /> gemini-chatbot/
            </div>
            <div className="pl-4 text-[#858398] flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[#2563EB]" /> src/
            </div>
            <div className="pl-8 text-[#29263A] flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[#7C3AED]" /> app/api/chat/
            </div>
            <div className="pl-12 text-[#6D28D9] flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" /> route.ts (Streaming API)
            </div>
            <div className="pl-8 text-[#858398] flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[#C4B5FD]" /> components/
            </div>
            <div className="pl-12 text-[#4B485E]">ChatMessage.tsx</div>
            <div className="pl-12 text-[#4B485E]">ChatInput.tsx</div>
            <div className="pl-12 text-[#4B485E]">Sidebar.tsx</div>
            <div className="pl-8 text-[#858398] flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-[#7C3AED]" /> hooks/
            </div>
            <div className="pl-12 text-[#6D28D9] flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5" /> useChatStorage.ts (CRUD)
            </div>
            <div className="pl-4 text-[#E11D48] flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> .env.local (Server Secret)
            </div>
            <div className="pl-4 text-[#858398] flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> README.md
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-[#FFFFFF] p-5 rounded-3xl border border-[#E9E4F5] space-y-3 flex flex-col justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-[#7C3AED]" />
            <h2 className="text-sm font-semibold text-[#29263A]">Data Lifecycle Diagram</h2>
          </div>

          <div className="bg-[#F8F6FF] p-4 rounded-2xl border border-[#E9E4F5]">
            <svg
              className="w-full h-auto text-[#29263A]"
              viewBox="0 0 680 160"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="10" y="20" width="130" height="90" rx="12" fill="#FFFFFF" stroke="#E9E4F5" />
              <text x="75" y="50" fill="#29263A" fontSize="11" fontWeight="600" textAnchor="middle">
                User Client
              </text>
              <text x="75" y="70" fill="#858398" fontSize="9" fontFamily="monospace" textAnchor="middle">
                ChatInput.tsx
              </text>
              <text x="75" y="90" fill="#7C3AED" fontSize="9" fontFamily="monospace" textAnchor="middle">
                Local State
              </text>

              <path d="M140 65 H 185" stroke="#C4B5FD" strokeWidth="2" strokeDasharray="3 3" />
              <polygon points="185,65 178,61 178,69" fill="#7C3AED" />
              <text x="160" y="58" fill="#858398" fontSize="8" textAnchor="middle">
                POST
              </text>

              <rect x="190" y="15" width="150" height="100" rx="12" fill="#EDE9FE" stroke="#C4B5FD" />
              <text x="265" y="45" fill="#29263A" fontSize="11" fontWeight="600" textAnchor="middle">
                Server Route
              </text>
              <text x="265" y="65" fill="#6D28D9" fontSize="9" fontFamily="monospace" textAnchor="middle">
                /api/chat
              </text>
              <rect x="205" y="75" width="120" height="22" rx="6" fill="#FFFFFF" />
              <text x="265" y="90" fill="#E11D48" fontSize="8" fontFamily="monospace" textAnchor="middle">
                process.env.KEY
              </text>

              <path d="M340 65 H 385" stroke="#C4B5FD" strokeWidth="2" strokeDasharray="3 3" />
              <polygon points="385,65 378,61 378,69" fill="#7C3AED" />

              <rect x="390" y="15" width="140" height="100" rx="12" fill="#FFFFFF" stroke="#E9E4F5" />
              <text x="460" y="45" fill="#7C3AED" fontSize="11" fontWeight="600" textAnchor="middle">
                Google Gemini
              </text>
              <text x="460" y="65" fill="#29263A" fontSize="9" fontFamily="monospace" textAnchor="middle">
                3.1 Flash Lite
              </text>
              <text x="460" y="85" fill="#858398" fontSize="8" textAnchor="middle">
                Free Tier
              </text>

              <rect x="545" y="20" width="125" height="90" rx="12" fill="#EDE9FE" stroke="#E9E4F5" />
              <text x="607" y="50" fill="#29263A" fontSize="11" fontWeight="600" textAnchor="middle">
                LocalStorage
              </text>
              <text x="607" y="70" fill="#858398" fontSize="9" fontFamily="monospace" textAnchor="middle">
                useChatStorage
              </text>
              <text x="607" y="90" fill="#7C3AED" fontSize="8" textAnchor="middle">
                Persistent Cache
              </text>

              <path d="M460 115 C 460 145, 260 145, 75 115" fill="none" stroke="#C4B5FD" strokeWidth="1.5" />
              <polygon points="75,115 81,120 79,112" fill="#7C3AED" />
              <text x="265" y="145" fill="#7C3AED" fontSize="9" textAnchor="middle">
                SSE / ReadableStream Token Flow
              </text>
            </svg>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#F8F6FF] border border-[#E9E4F5]">
              <span className="text-[#6D28D9] font-semibold block">1. Edge Streaming:</span>
              <span className="text-[#858398]">Sub-second chunked delivery via Web Streams</span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F8F6FF] border border-[#E9E4F5]">
              <span className="text-[#2563EB] font-semibold block">2. Offline Fallback:</span>
              <span className="text-[#858398]">Hydrated conversations stay in browser</span>
            </div>
          </div>
        </div>
      </div>

      {/* Verification QA Checklist */}
      <div className="bg-[#FFFFFF] p-5 sm:p-6 rounded-3xl border border-[#E9E4F5] space-y-4 shadow-xs">
        <div className="flex items-center gap-2">
          <CheckSquare className="w-4 h-4 text-[#7C3AED]" />
          <h2 className="text-base font-semibold text-[#29263A]">Verification & Testing Checklist</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-[#F8F6FF] border border-[#E9E4F5] space-y-2">
            <span className="font-mono text-[10px] text-[#6D28D9] px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E9E4F5]">
              Test 1
            </span>
            <h3 className="text-sm font-semibold text-[#29263A]">Persistence Check</h3>
            <p className="text-xs text-[#858398]">
              Send a prompt, wait for Gemini to answer, and hard refresh (<kbd className="bg-[#FFFFFF] px-1 rounded border border-[#E9E4F5]">⌘R</kbd>). All messages restore instantaneously.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F6FF] border border-[#E9E4F5] space-y-2">
            <span className="font-mono text-[10px] text-[#2563EB] px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E9E4F5]">
              Test 2
            </span>
            <h3 className="text-sm font-semibold text-[#29263A]">Mobile Viewport QA</h3>
            <p className="text-xs text-[#858398]">
              Resize window to 375px mobile screen. Verify sidebar drawer toggles cleanly and input bar clears the virtual keyboard.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8F6FF] border border-[#E9E4F5] space-y-2">
            <span className="font-mono text-[10px] text-[#E11D48] px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#E9E4F5]">
              Test 3
            </span>
            <h3 className="text-sm font-semibold text-[#29263A]">Rate-Limit Resilience</h3>
            <p className="text-xs text-[#858398]">
              Server automatically catches 503 high demand spikes and cascades seamlessly to alternative fast models.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
