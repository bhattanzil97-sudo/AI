'use client';

import React, { useState } from 'react';
import {
  Laptop,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Download,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { OllamaStatus } from '@/types/chat';

interface OfflineDiagnosticsProps {
  status: OllamaStatus | null;
  onRefresh: () => void;
  onSwitchToOnline: () => void;
  isChecking: boolean;
}

export function OfflineDiagnostics({
  status,
  onRefresh,
  onSwitchToOnline,
  isChecking,
}: OfflineDiagnosticsProps) {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyToClipboard = (cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const isOllamaRunning = status?.online ?? false;
  const hasModels = (status?.models?.length ?? 0) > 0;

  return (
    <div className="max-w-2xl mx-auto my-6 p-6 rounded-3xl border border-amber-300 dark:border-amber-800/80 bg-gradient-to-b from-amber-50/70 to-orange-50/40 dark:from-amber-950/20 dark:to-slate-900/40 backdrop-blur-md shadow-lg">
      {/* Top Banner */}
      <div className="flex items-start gap-4 mb-5">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            {!isOllamaRunning
              ? 'Offline AI Runtime Not Detected'
              : 'No Local Models Found in Ollama'}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
            {!isOllamaRunning
              ? 'Offline Mode runs AI models directly on your hardware without internet. Ollama is not currently detected at ' +
              (status?.endpoint || 'http://localhost:11434') +
              '.'
              : 'Ollama is running, but no models have been downloaded yet. Follow the steps below to pull a local model.'}
          </p>
        </div>
      </div>

      {/* Step by step guide */}
      <div className="space-y-4 mb-6">
        {/* Step 1 */}
        {!isOllamaRunning && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                Download & Install Ollama
              </span>
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                <span>ollama.com/download</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Download Ollama for Windows/Mac/Linux. It installs in less than a minute and runs as a background service.
            </p>
          </div>
        )}

        {/* Step 2 */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-gray-200 dark:border-slate-800">
          <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
              {!isOllamaRunning ? '2' : '1'}
            </span>
            Download a Fast Local Model in your Terminal
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Open PowerShell or Command Prompt and run one of these commands to pull and start a model:
          </p>

          <div className="space-y-2">
            {[
              {
                cmd: 'ollama run llama3.2',
                desc: 'Llama 3.2 (3B) — Meta AI, lightweight, blazing fast on any modern PC',
              },
              {
                cmd: 'ollama run mistral',
                desc: 'Mistral (7B) — High reasoning, great for coding and complex tasks',
              },
              {
                cmd: 'ollama run phi3:mini',
                desc: 'Phi-3 Mini (3.8B) — Microsoft research model, very small memory footprint',
              },
            ].map((item) => (
              <div
                key={item.cmd}
                className="flex items-center justify-between p-2.5 rounded-xl bg-gray-100 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 text-xs font-mono"
              >
                <div>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold select-all">
                    {item.cmd}
                  </span>
                  <p className="text-[10px] text-gray-400 font-sans mt-0.5">{item.desc}</p>
                </div>
                <button
                  onClick={() => copyToClipboard(item.cmd)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-800 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors"
                  title="Copy command"
                >
                  {copiedCmd === item.cmd ? (
                    <Check className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
        <button
          onClick={onRefresh}
          disabled={isChecking}
          className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
          <span>{isChecking ? 'Checking Connection...' : 'Check Connection Again'}</span>
        </button>

        <button
          onClick={onSwitchToOnline}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 font-medium text-xs transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-blue-500" />
          <span>Switch to Online Mode</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

