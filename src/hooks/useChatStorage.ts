import { useState, useEffect, useCallback } from 'react';
import { ChatMessage, ChatSession } from '../types';

const STORAGE_KEY = 'gemini_chat_sessions_v2';
const ACTIVE_ID_KEY = 'gemini_active_session_id';

const createFreshSession = (model = 'gemini-3.1-flash-lite'): ChatSession => {
  const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: newId,
    title: 'New Chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
    model,
  };
};

export function useChatStorage() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // READ: Hydrate from LocalStorage and purge any legacy dummy sessions
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ChatSession[] = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Purge legacy demo sessions
          const cleaned = parsed.filter(
            (s) =>
              !s.id.startsWith('session-demo-') &&
              s.title !== 'Next.js & Gemini API Integration' &&
              s.title !== 'Tailwind Theme Setup' &&
              s.title !== 'Multi-turn prompt tokens'
          );

          if (cleaned.length > 0) {
            setSessions(cleaned);
            const savedActive = localStorage.getItem(ACTIVE_ID_KEY);
            if (savedActive && cleaned.some((s) => s.id === savedActive)) {
              setActiveId(savedActive);
            } else {
              setActiveId(cleaned[0].id);
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
            setIsLoaded(true);
            return;
          }
        }
      }

      // Fresh start with single empty session
      const fresh = createFreshSession('gemini-3.1-flash-lite');
      setSessions([fresh]);
      setActiveId(fresh.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([fresh]));
      localStorage.setItem(ACTIVE_ID_KEY, fresh.id);
    } catch (err) {
      console.error('Error hydrating chat storage from localStorage:', err);
      const fresh = createFreshSession('gemini-3.1-flash-lite');
      setSessions([fresh]);
      setActiveId(fresh.id);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  // Internal persistence helper
  const persist = useCallback((nextSessions: ChatSession[]) => {
    setSessions(nextSessions);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSessions));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, []);

  // CREATE: Start a new conversation
  const createSession = useCallback((title = 'New Chat', initialModel = 'gemini-3.1-flash-lite') => {
    const newId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSession: ChatSession = {
      id: newId,
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      model: initialModel,
    };

    setSessions((prev) => {
      const updated = [newSession, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        localStorage.setItem(ACTIVE_ID_KEY, newId);
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    setActiveId(newId);
    return newSession;
  }, []);

  // SELECT
  const selectSession = useCallback((id: string) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_ID_KEY, id);
  }, []);

  // UPDATE: Rename session title
  const renameSession = useCallback((id: string, newTitle: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === id ? { ...s, title: newTitle.trim() || 'Untitled Chat', updatedAt: Date.now() } : s));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  // UPDATE: Append a message to a session
  const appendMessage = useCallback((sessionId: string, msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
    };

    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== sessionId) return s;

        // Auto-title conversation on first user message if still default title
        let title = s.title;
        if (s.messages.length === 0 && msg.role === 'user') {
          title = msg.content.trim().slice(0, 36) + (msg.content.trim().length > 36 ? '...' : '');
        }

        return {
          ...s,
          title,
          updatedAt: Date.now(),
          messages: [...s.messages, newMsg],
        };
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    return newMsg;
  }, []);

  // UPDATE: Append or update assistant response in streaming mode
  const updateAssistantMessage = useCallback((sessionId: string, messageId: string, content: string, isError = false) => {
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          updatedAt: Date.now(),
          messages: s.messages.map((m) => (m.id === messageId ? { ...m, content, error: isError } : m)),
        };
      });

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  // UPDATE: Edit a user message and optionally truncate subsequent messages for re-generation
  const editUserMessage = useCallback((sessionId: string, messageId: string, newContent: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          updatedAt: Date.now(),
          messages: s.messages.map((m) => (m.id === messageId ? { ...m, content: newContent } : m)),
        };
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  // TRUNCATE AFTER: Remove all messages after target index (used when resending edited prompt)
  const truncateAfterMessage = useCallback((sessionId: string, messageId: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== sessionId) return s;
        const index = s.messages.findIndex((m) => m.id === messageId);
        if (index === -1) return s;
        return {
          ...s,
          updatedAt: Date.now(),
          messages: s.messages.slice(0, index + 1),
        };
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  // DELETE: Delete single message
  const deleteMessage = useCallback((sessionId: string, messageId: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== sessionId) return s;
        return {
          ...s,
          updatedAt: Date.now(),
          messages: s.messages.filter((m) => m.id !== messageId),
        };
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  // DELETE: Clear all messages from current session
  const clearSessionMessages = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.map((s) => (s.id === sessionId ? { ...s, messages: [], updatedAt: Date.now() } : s));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  // DELETE: Delete an entire conversation session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }

      if (activeId === sessionId) {
        const nextActive = updated.length > 0 ? updated[0].id : null;
        setActiveId(nextActive);
        if (nextActive) {
          localStorage.setItem(ACTIVE_ID_KEY, nextActive);
        } else {
          localStorage.removeItem(ACTIVE_ID_KEY);
        }
      }
      return updated;
    });
  }, [activeId]);

  // DELETE: Clear all history
  const clearAllSessions = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_ID_KEY);
    setSessions([]);
    setActiveId(null);
  }, []);

  const activeSession = sessions.find((s) => s.id === activeId) || null;

  return {
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
  };
}
