'use client';

import React from 'react';
import {
  X,
  Sparkles,
  Globe,
  Laptop,
  Terminal,
  ExternalLink,
  BookOpen,
  Keyboard,
  Shield,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [copied, setCopied] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0f141c] border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                About CHAT AI & Quick Guide
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Next-generation dual-engine AI Chatbot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-gray-700 dark:text-gray-300">
          {/* Overview */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-500" /> What is CHAT AI?
            </h4>
            <p className="leading-relaxed">
              <strong>CHAT AI</strong> is a modern, responsive web application inspired by ChatGPT and Google Gemini.
              It supports both <strong>Online Mode (Cloud)</strong> for cutting-edge intelligence and web search grounding,
              and <strong>Offline Mode (Local)</strong> for 100% private, on-device computing without an internet connection.
            </p>
          </div>

          {/* Online Mode Section */}
          <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 space-y-2">
            <h4 className="font-bold text-xs text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-500" /> 1. Online Mode (Cloud AI)
            </h4>
            <p className="leading-relaxed text-[11px]">
              • Connects securely through backend API routes to <strong>Google Gemini</strong> models (Gemini 1.5 Flash, Gemini 2.0 Flash, Gemini 1.5 Pro).
            </p>
            <p className="leading-relaxed text-[11px]">
              • <strong>Web Search Grounding:</strong> When enabled, CHAT AI accesses current internet sources and provides clickable citations.
            </p>
            <p className="leading-relaxed text-[11px]">
              • <strong>Setup:</strong> Add your free API key in <code className="font-mono bg-white dark:bg-slate-900 px-1 rounded">.env.local</code> as <code className="font-mono bg-white dark:bg-slate-900 px-1 rounded">GEMINI_API_KEY</code> or via the Settings menu.
            </p>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1 text-[11px]"
            >
              <span>Get Free Gemini API Key from Google AI Studio</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Offline Mode Section */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 space-y-3">
            <h4 className="font-bold text-xs text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
              <Laptop className="w-4 h-4 text-emerald-500" /> 2. Offline Mode (Local On-Device)
            </h4>
            <p className="leading-relaxed text-[11px]">
              Offline Mode executes open-weights AI models on your own GPU/CPU using <strong>Ollama</strong>.
              It operates completely offline, keeps your data 100% on your device, and never sends prompts outside.
            </p>

            <div className="space-y-1.5">
              <span className="font-semibold text-gray-900 dark:text-white text-[11px]">
                Recommended local commands to run:
              </span>
              <div className="space-y-1.5 font-mono text-[11px]">
                {[
                  { cmd: 'ollama run llama3.2', desc: 'Meta Llama 3.2 (Fast 3B)' },
                  { cmd: 'ollama run mistral', desc: 'Mistral 7B (High reasoning)' },
                  { cmd: 'ollama run phi3:mini', desc: 'Microsoft Phi-3 (3.8B)' },
                ].map((item) => (
                  <div
                    key={item.cmd}
                    className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800"
                  >
                    <span>
                      <strong className="text-emerald-600 dark:text-emerald-400">{item.cmd}</strong>
                      <span className="text-gray-400 ml-2 font-sans text-[10px]">({item.desc})</span>
                    </span>
                    <button
                      onClick={() => handleCopy(item.cmd)}
                      className="p-1 hover:text-emerald-500 text-gray-400"
                    >
                      {copied === item.cmd ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
              <Keyboard className="w-4 h-4 text-indigo-500" /> Keyboard Shortcuts
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex justify-between">
                <span>Send message</span>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-slate-800 font-mono text-[10px]">Enter</kbd>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex justify-between">
                <span>New line in input</span>
                <kbd className="px-1.5 py-0.5 rounded bg-gray-200 dark:bg-slate-800 font-mono text-[10px]">Shift + Enter</kbd>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

