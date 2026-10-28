export type AppMode = 'online' | 'offline';

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string; // for images
  textContent?: string; // for text/code/pdf extracted content
}

export interface WebSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  mode: AppMode;
  model: string;
  attachments?: Attachment[];
  sources?: WebSource[];
  isStreaming?: boolean;
  isError?: boolean;
  errorDetails?: string;
  tokens?: {
    prompt?: number;
    completion?: number;
  };
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  mode: AppMode;
  model: string;
  pinned?: boolean;
  messageCount: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaStatus {
  online: boolean;
  endpoint: string;
  models: OllamaModel[];
  error?: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  defaultMode: AppMode;
  onlineModel: string;
  offlineModel: string;
  ollamaEndpoint: string;
  geminiApiKey: string; // optional override entered by user in settings
  systemPrompt: string;
  temperature: number;
  webSearchEnabled: boolean;
  speechLanguage: string;
  speechVoice: string;
  autoReadAnswers: boolean;
  enterToSend: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  defaultMode: 'online',
  onlineModel: 'gemini-1.5-flash',
  offlineModel: 'qwen3.5:4b',
  ollamaEndpoint: 'http://localhost:11434',
  geminiApiKey: '',
  systemPrompt: 'You are CHAT AI. Answer directly, concisely, and to the point based ONLY on what the user asks. Keep responses short and relevant. Do not add extra explanations or details unless specifically asked.',
  temperature: 0.2,
  webSearchEnabled: false,
  speechLanguage: 'en-US',
  speechVoice: '',
  autoReadAnswers: false,
  enterToSend: true,
};

export const ONLINE_MODELS = [
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash (Auto)',
    provider: 'Google AI',
    description: 'Fast, highly capable model for general tasks, coding & reasoning',
    speed: 'Ultra Fast',
    vision: true,
    badge: 'Recommended',
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'Google AI',
    description: 'Next-generation model with enhanced speed & multimodality',
    speed: 'Blazing Fast',
    vision: true,
    badge: 'Next-Gen',
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    provider: 'Google AI',
    description: 'Best for complex reasoning, large documents & deep analysis',
    speed: 'Balanced',
    vision: true,
    badge: 'Advanced',
  },
];

