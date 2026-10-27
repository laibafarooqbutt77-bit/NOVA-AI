import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Square,
  Globe,
  Mic,
  MicOff,
  ChevronDown,
  Eraser,
} from 'lucide-react';
import { ModelOption } from '../types';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isGenerating: boolean;
  onStopGeneration?: () => void;
  activeModel: string;
  onSelectModel: (model: string) => void;
  groundingEnabled: boolean;
  onToggleGrounding: () => void;
  onShowToast: (msg: string) => void;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    tag: 'Fastest (Recommended)',
    desc: 'Instantaneous response generation, ultra-low latency, free tier.',
    freeTier: true,
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    tag: 'Balanced',
    desc: 'Higher reasoning depth with automatic fallback on traffic spikes.',
    freeTier: true,
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash Latest',
    tag: 'Stable Core',
    desc: 'Long-term stable release for multi-turn conversations.',
    freeTier: true,
  },
];

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isGenerating,
  onStopGeneration,
  activeModel,
  onSelectModel,
  groundingEnabled,
  onToggleGrounding,
  onShowToast,
}) => {
  const [text, setText] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Web Speech Recognition support
  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onShowToast('Voice recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      onShowToast('Voice input stopped.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        onShowToast('Listening... Speak into your microphone.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        onShowToast('Voice input error or access denied.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
      onShowToast('Unable to start microphone.');
    }
  };

  const handleSend = () => {
    if (isGenerating) {
      onStopGeneration?.();
      return;
    }
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentModelObj =
    AVAILABLE_MODELS.find((m) => m.id === activeModel) || AVAILABLE_MODELS[0];

  return (
    <div className="fixed bottom-0 left-0 lg:left-72 right-0 z-20 px-3 sm:px-6 pb-4 pointer-events-none">
      <div className="max-w-4xl mx-auto w-full pointer-events-auto">
        {/* Main Dock Container */}
        <div className="bg-[#FFFFFF]/95 backdrop-blur-2xl rounded-2xl border border-[#E9E4F5] shadow-[0_8px_30px_rgba(41,38,58,0.06)] p-2 sm:p-3 flex flex-col gap-1.5 transition-all focus-within:border-[#C4B5FD] focus-within:shadow-[0_8px_30px_rgba(196,181,253,0.2)]">
          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Gemini anything... (Enter to send, Shift + Enter for newline)"
            className="w-full bg-transparent px-3 py-1.5 text-[#29263A] placeholder:text-[#858398] text-sm sm:text-[15px] focus:outline-none resize-none max-h-44 leading-relaxed"
          />

          {/* Controls & Accessories Bar */}
          <div className="flex items-center justify-between gap-2 px-1 pt-1 border-t border-[#E9E4F5]">
            {/* Left Accessories */}
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {/* Model Dropdown Capsule */}
              <div className="relative inline-block" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#F8F6FF] hover:bg-[#EDE9FE] text-[#29263A] font-mono text-xs border border-[#E9E4F5] transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#A78BFA]"></span>
                  <span className="truncate max-w-[130px] font-medium">{currentModelObj.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#858398]" />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute bottom-full mb-2 left-0 w-64 rounded-2xl bg-[#FFFFFF] border border-[#E9E4F5] shadow-[0_10px_35px_rgba(41,38,58,0.1)] p-1 z-50 flex flex-col gap-1">
                    {AVAILABLE_MODELS.map((model) => (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => {
                          onSelectModel(model.id);
                          setIsDropdownOpen(false);
                          onShowToast(`Switched active model to ${model.name}`);
                        }}
                        className={`text-left w-full p-2.5 rounded-xl transition-colors flex flex-col gap-0.5 ${
                          activeModel === model.id
                            ? 'bg-[#EDE9FE] border border-[#C4B5FD]'
                            : 'hover:bg-[#F8F6FF]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#29263A]">
                            {model.name}
                          </span>
                          {model.freeTier && (
                            <span className="font-mono text-[9px] text-[#6D28D9] px-1.5 py-0.5 rounded-full bg-[#EDE9FE] border border-[#E9E4F5]">
                              Free
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#858398] leading-snug">
                          {model.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Google Grounding Search Toggle */}
              <button
                type="button"
                onClick={onToggleGrounding}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium transition-colors border ${
                  groundingEnabled
                    ? 'bg-[#EDE9FE] text-[#6D28D9] border-[#C4B5FD]'
                    : 'text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF] border-transparent'
                }`}
                title="Grounding with Google Search"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grounding</span>
              </button>

              {/* Clear Input Button */}
              {text && (
                <button
                  type="button"
                  onClick={() => setText('')}
                  className="p-1 rounded-xl text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF] transition-colors"
                  title="Clear text"
                >
                  <Eraser className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Right Utilities & Send Action */}
            <div className="flex items-center gap-2">
              <span className="hidden md:inline font-mono text-[11px] text-[#858398]">
                {text.length} / 4000
              </span>

              {/* Voice Input */}
              <button
                type="button"
                onClick={handleToggleVoice}
                className={`p-2 rounded-xl transition-colors ${
                  isListening
                    ? 'bg-[#FEE2E2] text-[#DC2626] animate-pulse border border-[#FECDD3]'
                    : 'text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF]'
                }`}
                title="Voice dictation"
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Send / Stop Button */}
              <button
                type="button"
                onClick={handleSend}
                disabled={!isGenerating && !text.trim()}
                className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-xs transition-all active:scale-95 ${
                  isGenerating
                    ? 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
                    : text.trim()
                    ? 'bg-[#C4B5FD] hover:bg-[#B5A3FC] text-[#29263A] shadow-xs cursor-pointer'
                    : 'bg-[#F8F6FF] text-[#858398] cursor-not-allowed opacity-70 border border-[#E9E4F5]'
                }`}
                title={isGenerating ? 'Stop generating' : 'Send message (Enter)'}
              >
                {isGenerating ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <span>Send</span>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Legal / Model note */}
        <p className="text-center text-[11px] text-[#858398] pt-2">
          Gemini may occasionally produce inaccurate info. Light pastel theme active.
        </p>
      </div>
    </div>
  );
};
