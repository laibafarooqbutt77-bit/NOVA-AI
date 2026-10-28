export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  error?: boolean;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  model?: string;
  systemInstruction?: string;
}

export interface ModelOption {
  id: string;
  name: string;
  tag: string;
  desc: string;
  freeTier: boolean;
}

export type ActiveTab = 'chat' | 'guide';

export interface AppSettings {
  model: string;
  temperature: number;
  systemInstruction: string;
  grounding: boolean;
  autoScroll: boolean;
  speechSynthesis: boolean;
  customApiKey?: string;
}
