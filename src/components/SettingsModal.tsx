'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  Globe,
  Laptop,
  Volume2,
  Sliders,
  Trash2,
  Shield,
  ExternalLink,
  Eye,
  EyeOff,
  Check,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { AppSettings, OllamaModel, ONLINE_MODELS } from '@/types/chat';
import { voiceService, isSpeechRecognitionSupported, isSpeechSynthesisSupported } from '@/lib/speech';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (newSettings: Partial<AppSettings>) => void;
  ollamaModels: OllamaModel[];
  onClearAllData: () => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  ollamaModels,
  onClearAllData,
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'online' | 'offline' | 'voice' | 'privacy'>('general');
  const [showApiKey, setShowApiKey] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(settings.geminiApiKey || '');
  const [tempEndpoint, setTempEndpoint] = useState(settings.ollamaEndpoint || 'http://localhost:11434');
  const [ollamaTestResult, setOllamaTestResult] = useState<string | null>(null);
  const [isTestingOllama, setIsTestingOllama] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [saveFeedback, setSaveFeedback] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && isSpeechSynthesisSupported()) {
      const voices = voiceService.getVoices();
      setAvailableVoices(voices);

      window.speechSynthesis.onvoiceschanged = () => {
        setAvailableVoices(voiceService.getVoices());
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (patch: Partial<AppSettings>) => {
    onSaveSettings(patch);
    setSaveFeedback(true);
    setTimeout(() => setSaveFeedback(false), 1500);
  };

  const testOllamaConnection = async () => {
    setIsTestingOllama(true);
    setOllamaTestResult(null);
    try {
      const res = await fetch(`/api/ollama/status?endpoint=${encodeURIComponent(tempEndpoint)}`);
      const data = await res.json();
      if (data.online) {
        setOllamaTestResult(`Connected! Found ${data.models.length} model(s).`);
        handleSave({ ollamaEndpoint: tempEndpoint });
      } else {
        setOllamaTestResult(`Failed: ${data.error || 'Connection refused'}`);
      }
    } catch (e: any) {
      setOllamaTestResult(`Error: ${e.message}`);
    } finally {
      setIsTestingOllama(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0f141c] border border-gray-200 dark:border-slate-800 rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
              Settings & Preferences
            </h3>
            {saveFeedback && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" /> Saved
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-2 bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold">
          {[
            { id: 'general', label: 'General', icon: Sliders },
            { id: 'online', label: 'Online AI', icon: Globe },
            { id: 'offline', label: 'Offline Ollama', icon: Laptop },
            { id: 'voice', label: 'Voice & Speech', icon: Volume2 },
            { id: 'privacy', label: 'Privacy & Storage', icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${active
                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* GENERAL TAB */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              {/* Default Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Default Startup Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSave({ defaultMode: 'online' })}
                    className={`p-3 rounded-2xl border text-left transition-all ${settings.defaultMode === 'online'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1.5 mb-1">
                      <Globe className="w-3.5 h-3.5 text-blue-500" /> Online Mode
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Cloud AI models with fast streaming and web search.
                    </p>
                  </button>

                  <button
                    onClick={() => handleSave({ defaultMode: 'offline' })}
                    className={`p-3 rounded-2xl border text-left transition-all ${settings.defaultMode === 'offline'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                        : 'border-gray-200 dark:border-slate-800 text-gray-700 dark:text-gray-300'
                      }`}
                  >
                    <div className="font-semibold text-xs flex items-center gap-1.5 mb-1">
                      <Laptop className="w-3.5 h-3.5 text-emerald-500" /> Offline Mode
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      100% on-device Ollama models with total privacy.
                    </p>
                  </button>
                </div>
              </div>

              {/* System Prompt Customization */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    System Instructions (AI Persona & Tone)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSave({ systemPrompt: DEFAULT_SETTINGS.systemPrompt })}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reset to Concise
                  </button>
                </div>
                <textarea
                  value={settings.systemPrompt}
                  onChange={(e) => handleSave({ systemPrompt: e.target.value })}
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter system prompt instructions..."
                />
              </div>

              {/* Temperature Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Creativity (Temperature)
                  </span>
                  <span className="font-mono text-gray-500">{settings.temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={settings.temperature}
                  onChange={(e) => handleSave({ temperature: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-gray-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>Precise / Factual (0.0)</span>
                  <span>Balanced (0.7)</span>
                  <span>Creative (1.5)</span>
                </div>
              </div>
            </div>
          )}

          {/* ONLINE AI TAB */}
          {activeTab === 'online' && (
            <div className="space-y-5">
              {/* API Key configuration */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-blue-500" />
                    Google Gemini API Key
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    <span>Get Free Key at Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-gray-600 dark:text-gray-400">
                  Set this in your <code className="px-1 bg-white dark:bg-slate-900 rounded font-mono">.env.local</code> file as <code className="px-1 bg-white dark:bg-slate-900 rounded font-mono">GEMINI_API_KEY</code>, or save it here in your local session.
                </p>

                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="Paste your copied key here (Ctrl + V)..."
                    className="w-full pl-3 pr-20 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <div className="absolute right-2 top-1.5 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave({ geminiApiKey: tempApiKey.trim() })}
                      className="px-2 py-0.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>

              {/* Preferred Online Model */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Default Online Model
                </label>
                <div className="space-y-2">
                  {ONLINE_MODELS.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => handleSave({ onlineModel: m.id })}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${settings.onlineModel === m.id
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                          : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40'
                        }`}
                    >
                      <div>
                        <div className="font-semibold text-xs text-gray-900 dark:text-white flex items-center gap-2">
                          <span>{m.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                            {m.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {m.description}
                        </p>
                      </div>
                      {settings.onlineModel === m.id && (
                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* OFFLINE OLLAMA TAB */}
          {activeTab === 'offline' && (
            <div className="space-y-5">
              {/* Ollama Endpoint */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Ollama Service Endpoint URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tempEndpoint}
                    onChange={(e) => setTempEndpoint(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white font-mono"
                  />
                  <button
                    onClick={testOllamaConnection}
                    disabled={isTestingOllama}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTestingOllama ? 'animate-spin' : ''}`} />
                    <span>Test</span>
                  </button>
                </div>
                {ollamaTestResult && (
                  <p
                    className={`text-[11px] font-medium ${ollamaTestResult.startsWith('Connected')
                        ? 'text-emerald-600'
                        : 'text-rose-500'
                      }`}
                  >
                    {ollamaTestResult}
                  </p>
                )}
              </div>

              {/* Detected Local Models */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Installed Local Models ({ollamaModels.length})
                  </span>
                </div>

                {ollamaModels.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-center text-xs text-gray-500">
                    <p>No models detected yet in your Ollama installation.</p>
                    <p className="text-[11px] text-gray-400 mt-1">
                      Run <code className="font-mono text-emerald-500">ollama run llama3.2</code> in your terminal.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ollamaModels.map((m) => (
                      <div
                        key={m.name}
                        onClick={() => handleSave({ offlineModel: m.name })}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${settings.offlineModel === m.name
                            ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                            : 'border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/40'
                          }`}
                      >
                        <div>
                          <div className="font-semibold text-xs text-gray-900 dark:text-white flex items-center gap-2">
                            <span>{m.name}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400">
                              {(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            {m.details?.family || 'Local Model'}
                          </p>
                        </div>
                        {settings.offlineModel === m.name && (
                          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VOICE & SPEECH TAB */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              {/* Language selection for STT */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Speech Recognition Language
                </label>
                <select
                  value={settings.speechLanguage}
                  onChange={(e) => handleSave({ speechLanguage: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="en-US">English (United States)</option>
                  <option value="en-GB">English (United Kingdom)</option>
                  <option value="en-IN">English (India)</option>
                  <option value="hi-IN">Hindi (India) - हिन्दी</option>
                  <option value="ur-PK">Urdu (Pakistan) - اردو</option>
                  <option value="es-ES">Spanish (Spain)</option>
                  <option value="fr-FR">French (France)</option>
                  <option value="de-DE">German (Germany)</option>
                  <option value="ar-SA">Arabic (Saudi Arabia)</option>
                  <option value="zh-CN">Chinese (Simplified)</option>
                  <option value="ja-JP">Japanese</option>
                </select>
              </div>

              {/* Speech Synthesis Voice */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Text-to-Speech Voice
                </label>
                <select
                  value={settings.speechVoice}
                  onChange={(e) => handleSave({ speechVoice: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">Default Natural Voice</option>
                  {availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Voice offline note */}
              <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p className="font-semibold text-gray-900 dark:text-white">Voice Capabilities Note:</p>
                <p className="text-[11px]">
                  • <strong>Text-to-Speech</strong> works offline via the browser&apos;s built-in speech synthesis engine.
                </p>
                <p className="text-[11px]">
                  • <strong>Speech-to-Text</strong> utilizes Web Speech API (Chrome, Edge, Safari); offline availability depends on your OS speech packs.
                </p>
              </div>
            </div>
          )}

          {/* PRIVACY & STORAGE TAB */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 text-xs space-y-2">
                <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-emerald-600" />
                  Total Privacy Guarantee
                </div>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
                  • <strong>Offline Mode:</strong> Conversations processed through Ollama never leave your computer. No telemetry, no logs, no external servers.
                </p>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
                  • <strong>Local Storage:</strong> All chat histories are stored securely in your browser&apos;s IndexedDB database on your device.
                </p>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-[11px]">
                  • <strong>Online Mode:</strong> Secure backend proxies requests directly to Google Gemini API. API keys are never exposed in frontend bundles.
                </p>
              </div>

              {/* Danger Zone: Clear all conversations */}
              <div className="pt-2">
                <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                      Clear All Stored Conversations
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                      Permanently delete all chats and messages from this browser.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to delete ALL chats? This cannot be undone.')) {
                        onClearAllData();
                        onClose();
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

