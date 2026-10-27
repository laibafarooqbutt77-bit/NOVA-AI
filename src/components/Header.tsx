import React from 'react';
import { Menu, Settings, Sparkles, Terminal } from 'lucide-react';
import { ActiveTab } from '../types';

interface HeaderProps {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
  activeModel: string;
  onOpenSettings: () => void;
  onToggleMobileSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onChangeTab,
  activeModel,
  onOpenSettings,
  onToggleMobileSidebar,
}) => {
  return (
    <header className="fixed top-0 left-0 lg:left-72 right-0 h-16 bg-[#FFFFFF]/90 backdrop-blur-xl z-30 px-3 sm:px-6 flex items-center justify-between border-b border-[#E9E4F5] shadow-[0_2px_8px_rgba(41,38,58,0.02)]">
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-[#858398] hover:text-[#29263A] hover:bg-[#F8F6FF] transition-colors"
          title="Toggle chat history"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Tab Switcher: Chat Interface vs Setup Guide */}
        <nav className="flex items-center gap-1 p-1 bg-[#F8F6FF] rounded-xl border border-[#E9E4F5]">
          <button
            onClick={() => onChangeTab('chat')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-[#FFFFFF] text-[#29263A] shadow-xs'
                : 'text-[#858398] hover:text-[#29263A]'
            }`}
          >
            Chat Interface
          </button>
          <button
            onClick={() => onChangeTab('guide')}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'bg-[#FFFFFF] text-[#29263A] shadow-xs'
                : 'text-[#858398] hover:text-[#29263A]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 hidden sm:inline text-[#A78BFA]" />
            <span>Next.js Project Code & Setup Guide</span>
          </button>
        </nav>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Model Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F8F6FF] border border-[#E9E4F5] font-mono text-xs text-[#29263A]">
          <span className="w-2 h-2 rounded-full bg-[#C4B5FD] animate-pulse"></span>
          <span className="font-medium">{activeModel}</span>
        </div>

        {/* Settings button */}
        <button
          onClick={onOpenSettings}
          className="w-9 h-9 rounded-xl flex items-center justify-center text-[#858398] hover:bg-[#F8F6FF] hover:text-[#29263A] transition-colors border border-transparent hover:border-[#E9E4F5]"
          title="Bot & Model Settings"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* User Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#C4B5FD] via-[#BFDBFE] to-[#FBCFE8] flex items-center justify-center text-[#29263A] font-semibold text-xs shadow-xs border border-[#FFFFFF]">
          <Sparkles className="w-4 h-4 text-[#29263A]" />
        </div>
      </div>
    </header>
  );
};
