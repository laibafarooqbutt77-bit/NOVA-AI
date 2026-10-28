import React, { useState, useEffect } from 'react';
import { X, Sliders, AlertTriangle, FileDown } from 'lucide-react';
import { AppSettings, ChatSession } from '../types';

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTitle: string;
  onSave: (newTitle: string) => void;
}

export const RenameModal: React.FC<RenameModalProps> = ({
  isOpen,
  onClose,
  initialTitle,
  onSave,
}) => {
  const [title, setTitle] = useState(initialTitle);

  useEffect(() => {
    setTitle(initialTitle);
  }, [initialTitle]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim()) {
      onSave(title.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#29263A]/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#E9E4F5] max-w-md w-full rounded-2xl shadow-[0_10px_35px_rgba(41,38,58,0.1)] p-5 sm:p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#29263A]">Rename Conversation</h3>
          <button onClick={onClose} className="text-[#858398] hover:text-[#29263A] p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-[#858398] leading-relaxed">
          Provide a concise title for this session thread to organize your workspace history.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#F8F6FF] text-[#29263A] px-3.5 py-2.5 rounded-xl border border-[#E9E4F5] focus:outline-none focus:border-[#C4B5FD] text-sm"
            autoFocus
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#C4B5FD] hover:bg-[#B5A3FC] text-[#29263A] text-xs font-semibold shadow-xs transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ClearAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ClearAllModal: React.FC<ClearAllModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#29263A]/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#FECDD3] max-w-md w-full rounded-2xl shadow-[0_10px_35px_rgba(41,38,58,0.1)] p-5 sm:p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FEE2E2] flex items-center justify-center text-[#DC2626]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#29263A]">Clear All Chat History?</h3>
            <p className="text-xs text-[#858398]">This action cannot be undone.</p>
          </div>
        </div>
        <p className="text-xs text-[#858398] leading-relaxed">
          All saved conversations, prompt histories, and cached tokens will be permanently removed from your browser&apos;s LocalStorage.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E9E4F5]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Yes, Clear Everything
          </button>
        </div>
      </div>
    </div>
  );
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
}) => {
  const [form, setForm] = useState<AppSettings>(settings);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSettings(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#29263A]/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#E9E4F5] max-w-lg w-full rounded-2xl shadow-[0_10px_35px_rgba(41,38,58,0.1)] p-5 sm:p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#7C3AED]" />
            <h3 className="text-base font-semibold text-[#29263A]">Gemini Bot Settings</h3>
          </div>
          <button onClick={onClose} className="text-[#858398] hover:text-[#29263A] p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#29263A] block">Default Model</label>
            <select
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full bg-[#F8F6FF] text-xs text-[#29263A] px-3 py-2 rounded-xl border border-[#E9E4F5] focus:outline-none focus:border-[#C4B5FD]"
            >
              <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Fastest • Recommended)</option>
              <option value="gemini-3.8-flash">Gemini 3.8 Flash (Balanced)</option>
              <option value="gemini-flash-latest">Gemini Flash Latest (Stable Core)</option>
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#29263A]">Creativity / Temperature</span>
              <span className="font-mono text-[#7C3AED] font-semibold">{form.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
              className="w-full accent-[#C4B5FD]"
            />
            <div className="flex justify-between text-[10px] text-[#858398] font-mono">
              <span>0.0 (Precise / Code)</span>
              <span>1.0 (Creative / Brainstorm)</span>
            </div>
          </div>

          {/* System Instruction */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#29263A] block">System Persona Prompt</label>
            <textarea
              rows={3}
              value={form.systemInstruction}
              onChange={(e) => setForm({ ...form, systemInstruction: e.target.value })}
              placeholder="e.g. You are a senior full-stack engineer who answers concisely..."
              className="w-full bg-[#F8F6FF] text-xs text-[#29263A] p-3 rounded-xl border border-[#E9E4F5] focus:outline-none focus:border-[#C4B5FD] leading-relaxed resize-none"
            />
          </div>

          {/* Custom Gemini API Key (for Vercel or personal quota) */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#F8F6FF] border border-[#E9E4F5]">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#29263A] block">Gemini API Key (Optional)</label>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#7C3AED] hover:underline"
              >
                Get Free API Key →
              </a>
            </div>
            <input
              type="password"
              value={form.customApiKey || ''}
              onChange={(e) => setForm({ ...form, customApiKey: e.target.value })}
              placeholder="AIzaSy... (Leave empty to use server environment variable)"
              className="w-full bg-[#FFFFFF] text-xs text-[#29263A] px-3 py-2 rounded-xl border border-[#E9E4F5] focus:outline-none focus:border-[#C4B5FD] font-mono"
            />
            <p className="text-[10px] text-[#858398] leading-relaxed">
              If deploying on Vercel without environment variables, you can paste your free API key here. It stays safely stored in your browser.
            </p>
          </div>

          {/* Grounding with Google Search Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8F6FF] border border-[#E9E4F5]">
            <div>
              <span className="text-xs font-semibold text-[#29263A] block">Google Search Grounding</span>
              <span className="text-[11px] text-[#858398]">Allow Gemini to ground facts via live Google Web Search</span>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, grounding: !form.grounding })}
              className={`w-11 h-6 rounded-full transition-colors relative ${
                form.grounding ? 'bg-[#C4B5FD]' : 'bg-[#E9E4F5]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  form.grounding ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E9E4F5]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF] transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-[#C4B5FD] hover:bg-[#B5A3FC] text-[#29263A] text-xs font-semibold shadow-xs transition-colors"
          >
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
};

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ChatSession | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, session }) => {
  if (!isOpen || !session) return null;

  const exportAsMarkdown = () => {
    let md = `# ${session.title}\nDate: ${new Date(session.createdAt).toLocaleString()}\nModel: ${session.model || 'Gemini 3.1 Flash Lite'}\n\n---\n\n`;
    session.messages.forEach((m) => {
      md += `### ${m.role === 'user' ? '👤 User' : '✨ Gemini'}\n\n${m.content}\n\n---\n\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const exportAsJson = () => {
    const jsonStr = JSON.stringify(session, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#29263A]/30 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#FFFFFF] border border-[#E9E4F5] max-w-sm w-full rounded-2xl shadow-[0_10px_35px_rgba(41,38,58,0.1)] p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileDown className="w-5 h-5 text-[#7C3AED]" />
            <h3 className="text-base font-semibold text-[#29263A]">Export Conversation</h3>
          </div>
          <button onClick={onClose} className="text-[#858398] hover:text-[#29263A] p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-[#858398]">
          Download <strong className="text-[#29263A]">&quot;{session.title}&quot;</strong> to your local computer.
        </p>

        <div className="space-y-2 pt-1">
          <button
            onClick={exportAsMarkdown}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F8F6FF] hover:bg-[#EDE9FE] border border-[#E9E4F5] text-xs font-medium text-[#29263A] transition-colors"
          >
            <span>Export as Markdown (.md)</span>
            <span className="font-mono text-[10px] text-[#6D28D9]">Readable</span>
          </button>
          <button
            onClick={exportAsJson}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#F8F6FF] hover:bg-[#EDE9FE] border border-[#E9E4F5] text-xs font-medium text-[#29263A] transition-colors"
          >
            <span>Export as JSON (.json)</span>
            <span className="font-mono text-[10px] text-[#6D28D9]">Structured</span>
          </button>
        </div>
      </div>
    </div>
  );
};
