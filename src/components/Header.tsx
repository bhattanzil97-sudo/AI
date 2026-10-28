'use client';

import React, { useState } from 'react';
import {
  Globe,
  Laptop,
  Sun,
  Moon,
  Settings as SettingsIcon,
  Menu,
  ChevronDown,
  Sparkles,
  Search,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { AppMode, OllamaModel, ONLINE_MODELS } from '@/types/chat';

interface HeaderProps {
  currentMode: AppMode;
  onToggleMode: (mode: AppMode) => void;
  activeModel: string;
  onSelectModel: (model: string) => void;
  ollamaModels: OllamaModel[];
  ollamaOnline: boolean;
  onRefreshOllama: () => void;
  webSearchEnabled: boolean;
  onToggleWebSearch: () => void;
  theme: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onOpenSettings: () => void;
  chatTitle?: string;
}

export function Header({
  currentMode,
  onToggleMode,
  activeModel,
  onSelectModel,
  ollamaModels,
  ollamaOnline,
  onRefreshOllama,
  webSearchEnabled,
  onToggleWebSearch,
  theme,
  onToggleTheme,
  onToggleSidebar,
  onOpenSettings,
  chatTitle,
}: HeaderProps) {
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);

  return (
    <header className="relative z-30 h-16 border-b border-gray-200 dark:border-slate-800 bg-white/80 dark:bg-[#0f141c]/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between gap-2">
      {/* Left: Sidebar Toggle & Chat Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          title="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
              {chatTitle || 'CHAT AI'}
            </h1>
            <span
              className={`hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                currentMode === 'online'
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {currentMode === 'online' ? (
                <>
                  <Globe className="w-3 h-3" /> Online Mode
                </>
              ) : (
                <>
                  <Laptop className="w-3 h-3" /> Offline Mode
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Center: Mode Switcher [ ONLINE 🌐 ] [ OFFLINE 💻 ] */}
      <div className="flex items-center">
        <div className="relative flex p-1 bg-gray-100 dark:bg-slate-800/80 rounded-2xl border border-gray-200 dark:border-slate-700/60 shadow-inner">
          <button
            onClick={() => onToggleMode('online')}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
              currentMode === 'online'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Online</span>
            <span className="hidden md:inline text-[10px] opacity-80">(Cloud)</span>
          </button>

          <button
            onClick={() => onToggleMode('offline')}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-1.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
              currentMode === 'offline'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Offline</span>
            <span className="hidden md:inline text-[10px] opacity-80">(Local)</span>
          </button>
        </div>
      </div>

      {/* Right Controls: Model Selector, Web Search, Theme, Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Model Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700/70 transition-all shadow-xs"
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${
                currentMode === 'online' ? 'text-blue-500' : 'text-emerald-500'
              }`}
            />
            <span className="max-w-[80px] sm:max-w-[120px] truncate">
              {currentMode === 'online'
                ? ONLINE_MODELS.find((m) => m.id === activeModel)?.name || activeModel
                : activeModel || (ollamaOnline ? 'Select local model' : 'No local model')}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>

          {/* Dropdown Menu */}
          {modelDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setModelDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-xl z-50 p-2 space-y-1">
                <div className="px-2 py-1.5 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800">
                  <span>{currentMode === 'online' ? 'Online Models (Cloud)' : 'Local Ollama Models'}</span>
                  {currentMode === 'offline' && (
                    <button
                      onClick={onRefreshOllama}
                      className="p-1 hover:text-blue-500 text-gray-400"
                      title="Refresh local models"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {currentMode === 'online' ? (
                  <div className="space-y-1">
                    {ONLINE_MODELS.map((m) => {
                      const isSelected = m.id === activeModel;
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            onSelectModel(m.id);
                            setModelDropdownOpen(false);
                          }}
                          className={`p-2 rounded-xl cursor-pointer transition-colors text-xs flex items-start justify-between ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                              : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <div>
                            <div className="font-semibold flex items-center gap-1.5">
                              <span>{m.name}</span>
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400">
                                {m.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {m.description}
                            </p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {!ollamaOnline ? (
                      <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">
                        <p className="font-semibold text-rose-500 mb-1">Ollama is not running</p>
                        <p className="text-[11px] mb-2">
                          Start Ollama locally on your machine to use local models.
                        </p>
                        <button
                          onClick={() => {
                            setModelDropdownOpen(false);
                            onOpenSettings();
                          }}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs"
                        >
                          Setup Local Model
                        </button>
                      </div>
                    ) : ollamaModels.length === 0 ? (
                      <div className="p-3 text-center text-xs text-gray-500 dark:text-gray-400">
                        <p className="font-semibold text-amber-500 mb-1">No models installed</p>
                        <p className="text-[11px] mb-2">Run `ollama run llama3.2` to download a model.</p>
                      </div>
                    ) : (
                      ollamaModels.map((m) => {
                        const isSelected = m.name === activeModel;
                        const sizeGB = (m.size / (1024 * 1024 * 1024)).toFixed(1);
                        return (
                          <div
                            key={m.name}
                            onClick={() => {
                              onSelectModel(m.name);
                              setModelDropdownOpen(false);
                            }}
                            className={`p-2 rounded-xl cursor-pointer transition-colors text-xs flex items-center justify-between ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                : 'hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            <div>
                              <div className="font-semibold flex items-center gap-1.5">
                                <span>{m.name}</span>
                                <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400">
                                  {sizeGB} GB
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400">
                                {m.details?.family || 'Local LLM'}
                              </span>
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Web Search Toggle (Online Mode only) */}
        {currentMode === 'online' && (
          <button
            onClick={onToggleWebSearch}
            title={webSearchEnabled ? 'Web Search active' : 'Enable Web Search grounding'}
            className={`hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              webSearchEnabled
                ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400'
                : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Search Web</span>
          </button>
        )}

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={onToggleTheme}
          title="Toggle Light / Dark mode"
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-2 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}

