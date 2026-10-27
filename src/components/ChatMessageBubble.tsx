import React, { useState } from 'react';
import {
  Copy,
  Edit2,
  RotateCw,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Check,
  Sparkles,
  AlertCircle,
  CornerDownLeft,
} from 'lucide-react';
import { ChatMessage } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onEditMessage?: (id: string, newContent: string, resubmit: boolean) => void;
  onDeleteMessage?: (id: string) => void;
  onRegenerate?: () => void;
  onCopyText?: (text: string) => void;
  modelName?: string;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  onEditMessage,
  onDeleteMessage,
  onRegenerate,
  onCopyText,
  modelName = 'Gemini 3.1 Flash Lite',
}) => {
  const isUser = message.role === 'user';
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [thumbs, setThumbs] = useState<'up' | 'down' | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true);
      onCopyText?.(isUser ? 'Prompt copied' : 'Response copied');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSpeak = () => {
    if (!('speechSynthesis' in window)) {
      onCopyText?.('Speech synthesis not supported in this browser');
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const plainText = message.content.replace(/```[\s\S]*?```/g, 'Code block omitted.').replace(/[*#`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const handleSaveEdit = (resubmit: boolean) => {
    if (!editValue.trim()) return;
    onEditMessage?.(message.id, editValue.trim(), resubmit);
    setIsEditing(false);
  };

  if (isUser) {
    return (
      <div className="group relative flex flex-col items-end gap-1.5 self-end max-w-2xl w-full">
        {/* Timestamp & label */}
        <div className="flex items-center gap-1.5 text-xs text-[#858398] font-mono mr-1">
          <span>You</span>
          <span>•</span>
          <span>{formattedTime}</span>
        </div>

        {/* User Message Container / Edit Mode */}
        {isEditing ? (
          <div className="w-full bg-[#FFFFFF] border border-[#C4B5FD] p-3 rounded-2xl shadow-sm">
            <textarea
              className="w-full bg-transparent text-[#29263A] text-[15px] focus:outline-none resize-none font-normal leading-relaxed"
              rows={3}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9E4F5]">
              <button
                onClick={() => {
                  setEditValue(message.content);
                  setIsEditing(false);
                }}
                className="px-3 py-1 rounded-xl text-xs text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveEdit(false)}
                className="px-3 py-1 rounded-xl text-xs bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#29263A] transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => handleSaveEdit(true)}
                className="px-3 py-1 rounded-xl text-xs bg-[#C4B5FD] hover:bg-[#B5A3FC] text-[#29263A] flex items-center gap-1 transition-colors font-semibold shadow-xs"
              >
                <CornerDownLeft className="w-3.5 h-3.5" />
                <span>Save & Resend</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative bg-[#EDE9FE] text-[#29263A] px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl rounded-tr-sm shadow-[0_2px_8px_rgba(41,38,58,0.03)] border border-[#E9E4F5] transition-all">
            <p className="text-[15px] sm:text-[16px] leading-relaxed whitespace-pre-wrap selection:bg-[#C4B5FD]">
              {message.content}
            </p>
          </div>
        )}

        {/* Hover Action Pill */}
        {!isEditing && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center gap-1 bg-[#FFFFFF] border border-[#E9E4F5] px-2 py-1 rounded-full shadow-xs mt-0.5">
            <button
              onClick={handleCopy}
              className="p-1 text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF] rounded-full transition-colors"
              title="Copy prompt"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#7C3AED]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF] rounded-full transition-colors"
              title="Edit prompt"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF] rounded-full transition-colors"
                title="Resend prompt"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>
            )}
            {onDeleteMessage && (
              <button
                onClick={() => onDeleteMessage(message.id)}
                className="p-1 text-[#858398] hover:text-[#EF4444] hover:bg-[#F8F6FF] rounded-full transition-colors"
                title="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Assistant Bubble
  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Header identity */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#C4B5FD] via-[#BFDBFE] to-[#FBCFE8] flex items-center justify-center shadow-xs border border-[#FFFFFF] shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-[#29263A]" />
        </div>
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-[#29263A] font-semibold">Gemini</span>
          <span className="text-[#6D28D9] px-2 py-0.5 rounded-full bg-[#EDE9FE] text-[10px] font-medium border border-[#E9E4F5]">
            {modelName}
          </span>
          <span className="text-[#858398]">•</span>
          <span className="text-[#858398]">{formattedTime}</span>
        </div>
      </div>

      {/* Message content */}
      <div className="pl-2 sm:pl-9 flex flex-col gap-3">
        {message.error ? (
          <div className="p-4 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] flex items-start gap-3 text-[#9F1239] shadow-xs">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#E11D48]" />
            <div className="flex-1">
              <p className="font-semibold text-sm">Response Error</p>
              <p className="text-xs text-[#BE123C] mt-1">{message.content}</p>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="mt-2.5 inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-[#FFE4E6] hover:bg-[#FECDD3] text-[#9F1239] text-xs font-medium transition-colors border border-[#FDA4AF]"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>Retry Request</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#FFFFFF] p-4 sm:p-5 rounded-2xl rounded-tl-sm border border-[#E9E4F5] shadow-[0_2px_12px_rgba(41,38,58,0.02)]">
            <MarkdownRenderer content={message.content} />
          </div>
        )}

        {/* Action feedback bar */}
        {!message.error && (
          <div className="flex items-center gap-2 pt-0.5 text-[#858398] text-xs">
            <div className="flex items-center gap-1 bg-[#FFFFFF] border border-[#E9E4F5] p-1 rounded-xl shadow-xs">
              <button
                onClick={() => {
                  const next = thumbs === 'up' ? null : 'up';
                  setThumbs(next);
                  onCopyText?.(next ? 'Marked as helpful' : 'Feedback cleared');
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  thumbs === 'up'
                    ? 'text-[#7C3AED] bg-[#EDE9FE]'
                    : 'hover:text-[#29263A] hover:bg-[#F8F6FF]'
                }`}
                title="Helpful response"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  const next = thumbs === 'down' ? null : 'down';
                  setThumbs(next);
                  onCopyText?.(next ? 'Marked as unhelpful' : 'Feedback cleared');
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  thumbs === 'down'
                    ? 'text-[#EF4444] bg-[#FEE2E2]'
                    : 'hover:text-[#EF4444] hover:bg-[#F8F6FF]'
                }`}
                title="Unhelpful response"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 hover:text-[#29263A] hover:bg-[#F8F6FF] rounded-lg transition-colors"
                title="Copy entire response"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#7C3AED]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  className="p-1.5 hover:text-[#29263A] hover:bg-[#F8F6FF] rounded-lg transition-colors"
                  title="Regenerate response"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={handleSpeak}
                className={`p-1.5 rounded-lg transition-colors ${
                  isSpeaking ? 'text-[#7C3AED] bg-[#EDE9FE] animate-pulse' : 'hover:text-[#29263A] hover:bg-[#F8F6FF]'
                }`}
                title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>
            <span className="hidden sm:inline font-mono text-[11px] text-[#858398]">
              {modelName}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
