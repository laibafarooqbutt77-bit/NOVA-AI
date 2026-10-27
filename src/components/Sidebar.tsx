import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Sliders,
  Trash,
  X,
  Search,
  Check,
} from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  activeModel: string;
  onSelectModel: (model: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onRenameSession,
  onDeleteSession,
  onClearAll,
  onOpenSettings,
  isOpenMobile,
  onCloseMobile,
  activeModel,
  onSelectModel,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Group sessions into Today, Yesterday, Previous 7 Days, Older
  const groupedSessions = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const filtered = searchQuery.trim()
      ? sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : sessions;

    const groups: { [key: string]: ChatSession[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    filtered.forEach((session) => {
      const diff = now - session.updatedAt;
      if (diff < oneDay) {
        groups['Today'].push(session);
      } else if (diff < 2 * oneDay) {
        groups['Yesterday'].push(session);
      } else if (diff < 7 * oneDay) {
        groups['Previous 7 Days'].push(session);
      } else {
        groups['Older'].push(session);
      }
    });

    return groups;
  }, [sessions, searchQuery]);

  const handleStartRename = (e: React.MouseEvent, s: ChatSession) => {
    e.stopPropagation();
    setEditingId(s.id);
    setEditingTitle(s.title);
  };

  const handleSaveRename = (e: React.MouseEvent | React.FormEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (editingTitle.trim()) {
      onRenameSession(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#29263A]/25 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-72 bg-[#FFFFFF] z-50 flex flex-col justify-between border-r border-[#E9E4F5] shadow-[2px_0_12px_rgba(41,38,58,0.03)] transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Top Brand Header */}
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#E9E4F5]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#C4B5FD] via-[#BFDBFE] to-[#FBCFE8] flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-[#29263A]" />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-lg text-[#29263A] leading-none tracking-tight">
                  Gemini
                </span>
                <span className="font-mono text-[10px] text-[#858398] uppercase tracking-wider leading-none mt-1">
                  AI Assistant
                </span>
              </div>
            </div>

            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-xl text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* New Chat Button */}
          <div className="px-3 pt-3 pb-2">
            <button
              onClick={() => {
                onNewChat();
                if (window.innerWidth < 1024) onCloseMobile();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#EDE9FE] hover:bg-[#DDD6FE] text-[#29263A] transition-all group shadow-xs border border-[#E9E4F5]"
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#7C3AED] group-hover:rotate-90 transition-transform duration-200" />
                <span className="text-sm font-medium">New Chat</span>
              </div>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#FFFFFF] text-[#858398] border border-[#E9E4F5]">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Model Quick Switcher */}
          <div className="px-3 py-1">
            <div className="p-1 rounded-xl bg-[#F8F6FF] flex items-center justify-between border border-[#E9E4F5] text-xs">
              <button
                onClick={() => onSelectModel('gemini-3.1-flash-lite')}
                className={`flex-1 py-1 rounded-lg text-center font-mono font-medium transition-all ${
                  activeModel.includes('flash-lite')
                    ? 'bg-[#FFFFFF] text-[#29263A] shadow-xs font-semibold'
                    : 'text-[#858398] hover:text-[#29263A]'
                }`}
              >
                3.1 Lite ⚡
              </button>
              <button
                onClick={() => onSelectModel('gemini-3.8-flash')}
                className={`flex-1 py-1 rounded-lg text-center font-mono font-medium transition-all ${
                  activeModel.includes('3.8-flash') || activeModel.includes('1.5-flash')
                    ? 'bg-[#FFFFFF] text-[#29263A] shadow-xs font-semibold'
                    : 'text-[#858398] hover:text-[#29263A]'
                }`}
              >
                3.8 Flash
              </button>
            </div>
          </div>

          {/* Search Bar if multiple chats */}
          {sessions.length > 2 && (
            <div className="px-3 py-1.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#858398]" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F8F6FF] text-xs text-[#29263A] pl-8 pr-3 py-1.5 rounded-xl border border-[#E9E4F5] focus:outline-none focus:border-[#C4B5FD] placeholder:text-[#858398]"
                />
              </div>
            </div>
          )}

          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
            {Object.entries(groupedSessions).map(([category, items]) => {
              if (items.length === 0) return null;
              return (
                <div key={category} className="space-y-1">
                  <div className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-[#858398]">
                    {category}
                  </div>
                  {items.map((session) => {
                    const isActive = session.id === activeSessionId;
                    const isEditing = editingId === session.id;

                    return (
                      <div
                        key={session.id}
                        onClick={() => {
                          onSelectSession(session.id);
                          if (window.innerWidth < 1024) onCloseMobile();
                        }}
                        className={`group relative flex items-center justify-between px-2.5 py-2 rounded-xl transition-all cursor-pointer text-sm ${
                          isActive
                            ? 'bg-[#EDE9FE] text-[#29263A] font-medium shadow-xs border-l-2 border-[#A78BFA]'
                            : 'text-[#29263A] hover:bg-[#F8F6FF]'
                        }`}
                      >
                        {isEditing ? (
                          <form
                            onSubmit={(e) => handleSaveRename(e, session.id)}
                            className="flex items-center gap-1 w-full"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="bg-[#FFFFFF] text-xs text-[#29263A] px-2 py-1 rounded-lg w-full border border-[#C4B5FD] focus:outline-none shadow-xs"
                              autoFocus
                            />
                            <button
                              type="submit"
                              className="p-1 hover:text-[#7C3AED] text-[#858398]"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(null);
                              }}
                              className="p-1 hover:text-[#EF4444] text-[#858398]"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 truncate pr-2 flex-1">
                              <MessageSquare
                                className={`w-3.5 h-3.5 shrink-0 ${
                                  isActive ? 'text-[#7C3AED]' : 'text-[#858398]'
                                }`}
                              />
                              <span className="truncate text-xs sm:text-[13px]">
                                {session.title || 'Untitled Chat'}
                              </span>
                            </div>

                            {/* Action Buttons on Hover */}
                            <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                              <button
                                onClick={(e) => handleStartRename(e, session)}
                                className="p-1 text-[#858398] hover:text-[#29263A] hover:bg-[#FFFFFF] rounded-lg transition-colors"
                                title="Rename chat"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteSession(session.id);
                                }}
                                className="p-1 text-[#858398] hover:text-[#EF4444] hover:bg-[#FFFFFF] rounded-lg transition-colors"
                                title="Delete chat"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {sessions.length === 0 && (
              <div className="text-center py-8 text-xs text-[#858398]">
                No chat history yet. Click &quot;New Chat&quot; to begin!
              </div>
            )}
          </div>
        </div>

        {/* Bottom Utility Bar */}
        <div className="p-3 bg-[#F8F6FF] border-t border-[#E9E4F5] space-y-2">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#C4B5FD] animate-pulse"></span>
              <span className="font-mono text-[11px] text-[#29263A]">API: Connected</span>
            </div>
            <span className="font-mono text-[10px] text-[#29263A] bg-[#EDE9FE] px-2 py-0.5 rounded-full border border-[#E9E4F5]">
              Free Tier
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 text-[#858398] hover:text-[#EF4444] text-xs transition-colors px-1 py-1 rounded-lg"
              title="Clear all chat sessions"
            >
              <Trash className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="p-1 text-[#858398] hover:text-[#29263A] hover:bg-[#EDE9FE] rounded-lg transition-colors"
              title="Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
