'use client';

import React from 'react';
import {
  Sparkles,
  BookOpen,
  Mail,
  Code2,
  Calculator,
  Languages,
  Search,
  Globe,
  Laptop,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AppMode } from '@/types/chat';

interface WelcomeScreenProps {
  currentMode: AppMode;
  activeModel: string;
  onSelectPrompt: (prompt: string) => void;
}

const PROMPT_SUGGESTIONS = [
  {
    icon: BookOpen,
    category: 'Education & Explanation',
    title: 'Explain Quantum Computing',
    prompt: 'Explain the fundamentals of Quantum Computing, qubits, and superposition in simple terms with everyday analogies.',
    color: 'from-blue-500 to-indigo-500',
  },
  {
    icon: Mail,
    category: 'Professional Writing',
    title: 'Write a Project Deadline Email',
    prompt: 'Write a polite, professional email to a client explaining why we need a 3-day deadline extension for the software milestone.',
    color: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Code2,
    category: 'Coding & Debugging',
    title: 'Generate Multi-Language Code',
    prompt: 'Write a function in Python, JavaScript, and C++ to reverse a linked list and explain the time & space complexity.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: Calculator,
    category: 'Mathematics & Logic',
    title: 'Solve Probability Problems',
    prompt: 'Solve this step-by-step: If you roll two fair 6-sided dice, what is the probability that the sum of the dice is at least 9?',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: Languages,
    category: 'Translation & Multilingual',
    title: 'Translate English, Hindi & Urdu',
    prompt: 'Translate the phrase "Artificial intelligence is revolutionizing modern healthcare and research" into Hindi and Urdu with pronunciation.',
    color: 'from-cyan-500 to-blue-500',
  },
  {
    icon: Search,
    category: 'Research & Summary',
    title: 'Summarize Recent AI Trends',
    prompt: 'Summarize the key differences between small on-device language models (like Llama 3.2 and Phi-3) and large cloud models.',
    color: 'from-rose-500 to-red-500',
  },
];

export function WelcomeScreen({
  currentMode,
  activeModel,
  onSelectPrompt,
}: WelcomeScreenProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 max-w-4xl mx-auto flex flex-col justify-center items-center">
      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 text-xs font-medium mb-4 animate-fade-in">
        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-gray-800 dark:text-gray-200">
          Intelligent Multi-Turn AI Assistant
        </span>
        <span
          className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            currentMode === 'online'
              ? 'bg-blue-600 text-white'
              : 'bg-emerald-600 text-white'
          }`}
        >
          {currentMode === 'online' ? (
            <>
              <Globe className="w-2.5 h-2.5" /> Online Cloud
            </>
          ) : (
            <>
              <Laptop className="w-2.5 h-2.5" /> Offline Local
            </>
          )}
        </span>
      </div>

      {/* Main Greeting */}
      <h2 className="text-2xl sm:text-4xl font-extrabold text-center tracking-tight text-gray-900 dark:text-white mb-2">
        Hello! I&apos;m{' '}
        <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500 bg-clip-text text-transparent">
          CHAT AI
        </span>
        .
      </h2>
      <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 text-center max-w-lg mb-8">
        How can I help you today?
      </p>

      {/* Current Mode Info Card */}
      <div className="w-full max-w-2xl mb-8 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
              currentMode === 'online'
                ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-md shadow-blue-500/20'
                : 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-md shadow-emerald-500/20'
            }`}
          >
            {currentMode === 'online' ? (
              <Globe className="w-5 h-5" />
            ) : (
              <Laptop className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white">
                {currentMode === 'online' ? 'Online Mode Active' : 'Offline Mode Active'}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300">
                {activeModel}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {currentMode === 'online'
                ? 'Powered by Google Gemini cloud models with web search grounding capability.'
                : 'Running on your device via Ollama. 100% private, no internet required.'}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex flex-col items-end text-xs text-gray-400">
          <span className="flex items-center gap-1 text-emerald-500 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" /> Private
          </span>
          <span className="flex items-center gap-1 text-blue-500 font-medium mt-0.5">
            <Zap className="w-3.5 h-3.5" /> Streaming
          </span>
        </div>
      </div>

      {/* Suggested Prompts Grid */}
      <div className="w-full max-w-3xl">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">
          Suggested Topics & Tasks
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {PROMPT_SUGGESTIONS.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                onClick={() => onSelectPrompt(item.prompt)}
                className="group relative p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-lg dark:hover:shadow-blue-500/5 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div
                    className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-white mb-2.5 shadow-xs`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    {item.category}
                  </span>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mt-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {item.prompt}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-gray-400 group-hover:text-blue-500 transition-colors">
                  <span>Try this prompt</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

