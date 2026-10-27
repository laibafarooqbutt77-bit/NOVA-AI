/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Terminal,
  Share2,
  Edit3,
  Sparkles,
  Zap,
  Cpu,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { useChatStorage } from './hooks/useChatStorage';
import { streamGeminiChat } from './lib/gemini';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatMessageBubble } from './components/ChatMessageBubble';
import { ChatInput } from './components/ChatInput';
import { CodeAndSetupGuide } from './components/CodeAndSetupGuide';
import { RenameModal, ClearAllModal, SettingsModal, ExportModal } from './components/Modals';
import { Toast, ToastData } from './components/Toast';
import { ActiveTab, AppSettings } from './types';

const DEFAULT_SETTINGS: AppSettings = {
  model: 'gemini-3.1-flash-lite',
  temperature: 0.7,
  systemInstruction:
    'You are Gemini, a fast, highly capable, helpful, and concise AI assistant built by Google. Respond cleanly with Markdown when appropriate, use syntax-highlighted code blocks for code, and be friendly and direct.',
  grounding: false,
  autoScroll: true,
  speechSynthesis: true,
};

const SUGGESTED_PROMPTS = [
  {
    title: 'Explain Next.js 14 Server Actions',
    prompt: 'How do I handle form submissions with Server Actions and revalidate data in Next.js 14?',
    icon: '⚡',
  },
  {
    title: 'Exponential Backoff Pattern',
    prompt: 'Show me an exponential backoff retry pattern in TypeScript for handling API rate limit errors.',
    icon: '🛡️',
  },
  {
    title: 'Semantic Vector Embeddings',
    prompt: 'How can I set up a text embedding pipeline using Gemini models for vector similarity search?',
    icon: '🧩',
  },
  {
    title: 'Web Streams Edge Route',
    prompt: 'Write an end-to-end example of streaming AI responses using Web Streams ReadableStream in Next.js.',
    icon: '🚀',
  },
];

export default function App() {
  const {
    sessions,
    activeSession,
    activeId,
    isLoaded,
    selectSession,
    createSession,
    renameSession,
    appendMessage,
    updateAssistantMessage,
    editUserMessage,
    truncateAfterMessage,
    deleteMessage,
    clearSessionMessages,
    deleteSession,
    clearAllSessions,
  } = useChatStorage();

  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);

  // Settings
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('gemini_chat_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  // Modals
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ id: Date.now().toString(), message, type });
  }, []);

  // Save settings
  const handleSaveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('gemini_chat_settings', JSON.stringify(newSettings));
    showToast('Settings saved successfully');
  };

  // Keyboard shortcut: Cmd+K / Ctrl+K for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [createSession]);

  // Auto-scroll when messages update or streaming chunks arrive
  useEffect(() => {
    if (settings.autoScroll && chatScrollContainerRef.current) {
      chatScrollContainerRef.current.scrollTop = chatScrollContainerRef.current.scrollHeight;
    }
  }, [activeSession?.messages, streamingContent, isGenerating, settings.autoScroll]);

  const handleNewChat = () => {
    const session = createSession('New Chat', settings.model);
    showToast('Started new conversation');
    return session;
  };

  // Dispatch streaming generation
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isGenerating) return;

    let targetSessionId = activeId;
    if (!targetSessionId || !activeSession) {
      const fresh = createSession(text.slice(0, 32), settings.model);
      targetSessionId = fresh.id;
    }

    // 1. Append user prompt
    appendMessage(targetSessionId, {
      role: 'user',
      content: text,
    });

    // 2. Prepare assistant placeholder
    const assistantMsgPlaceholder = appendMessage(targetSessionId, {
      role: 'assistant',
      content: '',
    });

    setStreamingMessageId(assistantMsgPlaceholder.id);
    setStreamingContent('');
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Get current message history for context
    const currentMsgs = activeSession?.messages || [];
    const payloadMessages = [
      ...currentMsgs.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: text },
    ];

    try {
      let accumulated = '';
      await streamGeminiChat({
        messages: payloadMessages,
        model: settings.model,
        systemInstruction: settings.systemInstruction,
        temperature: settings.temperature,
        grounding: settings.grounding,
        signal: controller.signal,
        onChunk: (chunk) => {
          accumulated += chunk;
          setStreamingContent(accumulated);
          updateAssistantMessage(targetSessionId!, assistantMsgPlaceholder.id, accumulated);
        },
      });

      // Done
      setIsGenerating(false);
      setStreamingMessageId(null);
      setStreamingContent('');
    } catch (err: any) {
      if (err.name === 'AbortError') {
        showToast('Generation cancelled', 'info');
      } else {
        console.error('Chat error:', err);
        let errMsg = err?.message || 'Failed to communicate with Gemini API';
        try {
          const parsed = JSON.parse(errMsg);
          if (parsed.error?.message) errMsg = parsed.error.message;
          else if (parsed.message) errMsg = parsed.message;
        } catch {}
        if (errMsg.includes('503') || errMsg.includes('high demand') || errMsg.includes('UNAVAILABLE')) {
          errMsg = 'Gemini servers are experiencing high demand. Please retry your question.';
        } else if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
          errMsg = 'Rate limit reached. Please wait a few seconds before asking again.';
        }
        updateAssistantMessage(targetSessionId!, assistantMsgPlaceholder.id, errMsg, true);
        showToast(errMsg, 'error');
      }
      setIsGenerating(false);
      setStreamingMessageId(null);
      setStreamingContent('');
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setStreamingMessageId(null);
    setStreamingContent('');
  };

  // Re-generate response
  const handleRegenerate = async () => {
    if (!activeSession || activeSession.messages.length === 0 || isGenerating) return;

    const lastUserMsg = [...activeSession.messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMsg) return;

    truncateAfterMessage(activeSession.id, lastUserMsg.id);
    handleSendMessage(lastUserMsg.content);
  };

  // Edit user message and optionally resubmit
  const handleEditUserMessage = (messageId: string, newContent: string, resubmit: boolean) => {
    if (!activeSession) return;

    if (resubmit) {
      truncateAfterMessage(activeSession.id, messageId);
      editUserMessage(activeSession.id, messageId, newContent);
      handleSendMessage(newContent);
    } else {
      editUserMessage(activeSession.id, messageId, newContent);
      showToast('Message updated');
    }
  };

  // Calculate estimated tokens
  const estimatedTokens = React.useMemo(() => {
    if (!activeSession) return 0;
    const charCount = activeSession.messages.reduce((acc, m) => acc + m.content.length, 0);
    return Math.round(charCount / 4);
  }, [activeSession]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#F8F6FF] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#C4B5FD] via-[#BFDBFE] to-[#FBCFE8] animate-spin flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4 text-[#29263A]" />
          </div>
          <span className="font-mono text-sm text-[#29263A]">Opening Gemini Assistant...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6FF] text-[#29263A] flex flex-col font-sans">
      {/* Sidebar */}
      <Sidebar
        sessions={sessions}
        activeSessionId={activeId}
        onSelectSession={selectSession}
        onNewChat={handleNewChat}
        onRenameSession={renameSession}
        onDeleteSession={deleteSession}
        onClearAll={() => setIsClearAllOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        activeModel={settings.model}
        onSelectModel={(model) => handleSaveSettings({ ...settings, model })}
      />

      {/* Main View Area */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          activeModel={settings.model}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleMobileSidebar={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        />

        {/* Content Body */}
        <main className="pt-16 flex-1 flex flex-col w-full relative">
          {activeTab === 'guide' ? (
            /* Next.js Project Code & Setup Guide View */
            <CodeAndSetupGuide onShowToast={showToast} />
          ) : (
            /* Chat Interface View */
            <div className="flex-1 flex flex-col w-full pb-36">
              {/* Sticky Top Session Bar / Telemetry */}
              <div className="sticky top-16 z-10 w-full bg-[#FFFFFF]/90 backdrop-blur-xl px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#E9E4F5] shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Terminal className="w-4 h-4 text-[#7C3AED] shrink-0" />
                  <h1 className="text-sm sm:text-base font-semibold text-[#29263A] truncate max-w-xs sm:max-w-md">
                    {activeSession?.title || 'Gemini AI Chatbot'}
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EDE9FE] border border-[#E9E4F5] font-mono text-[10px] text-[#6D28D9] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C4B5FD] animate-ping"></span>
                    Free Tier Active
                  </span>
                </div>

                {/* Telemetry and Session Action Buttons */}
                <div className="flex items-center gap-2">
                  <div className="hidden xl:flex items-center gap-3 px-3 py-1 rounded-xl bg-[#F8F6FF] border border-[#E9E4F5] font-mono text-[11px] text-[#858398]">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-[#858398]" />
                      <span>
                        Tokens: <strong className="text-[#29263A]">{estimatedTokens} / 32k</strong>
                      </span>
                    </div>
                    <div className="w-1 h-3 rounded-full bg-[#E9E4F5]"></div>
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#7C3AED]" />
                      <span>
                        Latency: <strong className="text-[#7C3AED]">~140ms</strong>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-[#F8F6FF] border border-[#E9E4F5] p-1 rounded-xl">
                    <button
                      onClick={() => setIsExportOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-[#858398] hover:text-[#29263A] hover:bg-[#FFFFFF] transition-colors"
                      title="Share / Export session"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                      onClick={() => setIsRenameOpen(true)}
                      className="p-1.5 rounded-lg text-xs text-[#858398] hover:text-[#29263A] hover:bg-[#FFFFFF] transition-colors"
                      title="Rename conversation"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (activeSession) {
                          clearSessionMessages(activeSession.id);
                          showToast('Cleared chat messages');
                        }
                      }}
                      className="p-1.5 rounded-lg text-xs text-[#858398] hover:text-[#EF4444] hover:bg-[#FFFFFF] transition-colors"
                      title="Clear messages in this conversation"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chat Messages Stream */}
              <div
                ref={chatScrollContainerRef}
                className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-6 flex flex-col gap-6"
              >
                {activeSession && activeSession.messages.length > 0 ? (
                  activeSession.messages.map((message) => {
                    const isCurrentlyStreamingThis =
                      isGenerating && message.id === streamingMessageId;
                    const contentToRender = isCurrentlyStreamingThis
                      ? streamingContent || ' '
                      : message.content;

                    if (isCurrentlyStreamingThis && !streamingContent) {
                      return null;
                    }

                    return (
                      <ChatMessageBubble
                        key={message.id}
                        message={{ ...message, content: contentToRender }}
                        onEditMessage={handleEditUserMessage}
                        onDeleteMessage={(id) => deleteMessage(activeSession.id, id)}
                        onRegenerate={handleRegenerate}
                        onCopyText={(text) => showToast(text)}
                        modelName={activeSession.model || settings.model}
                      />
                    );
                  })
                ) : (
                  /* Empty state greeting */
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 max-w-xl mx-auto">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#C4B5FD] via-[#BFDBFE] to-[#FBCFE8] flex items-center justify-center shadow-[0_6px_20px_rgba(196,181,253,0.35)] border border-[#FFFFFF]">
                      <Sparkles className="w-8 h-8 text-[#29263A]" />
                    </div>
                    <div className="space-y-1.5">
                      <h2 className="text-xl sm:text-2xl font-bold text-[#29263A] tracking-tight">
                        How can I assist you today?
                      </h2>
                      <p className="text-xs sm:text-sm text-[#858398] leading-relaxed max-w-md mx-auto">
                        Ultra-fast real-time streaming AI chatbot powered by Google Gemini. Ask any question or pick a suggested topic below.
                      </p>
                    </div>
                  </div>
                )}

                {/* Shimmer Thinking Indicator while waiting for first tokens */}
                {isGenerating && !streamingContent && (
                  <div className="flex flex-col gap-2 w-full animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#C4B5FD] via-[#BFDBFE] to-[#FBCFE8] flex items-center justify-center shadow-xs border border-[#FFFFFF]">
                        <Sparkles className="w-3.5 h-3.5 text-[#29263A] animate-spin" />
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="text-[#6D28D9] font-medium">Gemini is synthesizing response...</span>
                        <span className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#C4B5FD] animate-bounce"></span>
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#BFDBFE] animate-bounce"
                            style={{ animationDelay: '150ms' }}
                          ></span>
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-[#FBCFE8] animate-bounce"
                            style={{ animationDelay: '300ms' }}
                          ></span>
                        </span>
                      </div>
                    </div>

                    {/* Shimmer skeleton bars */}
                    <div className="pl-2 sm:pl-9 flex flex-col gap-2 max-w-lg mt-1">
                      <div className="h-4 w-11/12 rounded-xl animate-shimmer"></div>
                      <div className="h-4 w-4/5 rounded-xl animate-shimmer"></div>
                      <div className="h-4 w-2/3 rounded-xl animate-shimmer"></div>
                    </div>
                  </div>
                )}

                {/* Suggested Exploration Prompts */}
                {(!activeSession || activeSession.messages.length === 0 || !isGenerating) && (
                  <div className="pt-4 flex flex-col gap-2.5">
                    <span className="font-mono text-[10px] text-[#858398] uppercase tracking-wider">
                      Suggested Exploration
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {SUGGESTED_PROMPTS.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(item.prompt)}
                          className="p-3.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#F8F6FF] border border-[#E9E4F5] hover:border-[#C4B5FD] text-left transition-all group flex items-start gap-3 shadow-[0_2px_8px_rgba(41,38,58,0.02)]"
                        >
                          <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">
                            {item.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-semibold text-[#29263A] group-hover:text-[#6D28D9] transition-colors block truncate">
                              {item.title}
                            </span>
                            <span className="text-[11px] text-[#858398] line-clamp-1 mt-0.5">
                              {item.prompt}
                            </span>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-[#858398] group-hover:text-[#7C3AED] group-hover:translate-x-0.5 transition-all mt-0.5 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Floating Bottom Dock */}
              <ChatInput
                onSendMessage={handleSendMessage}
                isGenerating={isGenerating}
                onStopGeneration={handleStopGeneration}
                activeModel={settings.model}
                onSelectModel={(model) => handleSaveSettings({ ...settings, model })}
                groundingEnabled={settings.grounding}
                onToggleGrounding={() =>
                  handleSaveSettings({ ...settings, grounding: !settings.grounding })
                }
                onShowToast={showToast}
              />
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <RenameModal
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        initialTitle={activeSession?.title || ''}
        onSave={(newTitle) => {
          if (activeSession) renameSession(activeSession.id, newTitle);
          showToast('Conversation renamed');
        }}
      />

      <ClearAllModal
        isOpen={isClearAllOpen}
        onClose={() => setIsClearAllOpen(false)}
        onConfirm={() => {
          clearAllSessions();
          showToast('Cleared all chat history');
        }}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        session={activeSession}
      />

      {/* Toast Notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
