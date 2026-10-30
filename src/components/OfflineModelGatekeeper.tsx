'use client';

import React, { useState } from 'react';
import {
  Download,
  CheckCircle,
  AlertCircle,
  Cpu,
  Smartphone,
  Sparkles,
  RefreshCw,
  Globe,
  Loader2,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { RECOMMENDED_OFFLINE_MODELS, OllamaStatus, CuratedOfflineModel } from '@/types/chat';

interface OfflineModelGatekeeperProps {
  status: OllamaStatus | null;
  onRefresh: () => void;
  onSwitchToOnline: () => void;
  onModelReady: (modelName: string) => void;
}

export function OfflineModelGatekeeper({
  status,
  onRefresh,
  onSwitchToOnline,
  onModelReady,
}: OfflineModelGatekeeperProps) {
  const [downloadingModel, setDownloadingModel] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [downloadStatusText, setDownloadStatusText] = useState<string>('');
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const installedModelNames = (status?.models || []).map((m) => m.name.toLowerCase());

  const handleDownload = async (model: CuratedOfflineModel) => {
    setDownloadingModel(model.id);
    setDownloadProgress(0);
    setDownloadStatusText('Starting download...');
    setDownloadError(null);

    try {
      const res = await fetch('/api/ollama/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model.id,
          endpoint: status?.endpoint || 'http://localhost:11434',
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Download failed with HTTP ${res.status}`);
      }

      if (!res.body) throw new Error('No streaming response from server');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const match = line.match(/^data:\s*(.+)$/m);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              if (data.percent !== undefined) {
                setDownloadProgress(data.percent);
              }
              if (data.status) {
                setDownloadStatusText(data.status);
              }
              if (data.status === 'success' || data.percent === 100) {
                setDownloadProgress(100);
                setDownloadStatusText('Download complete! Model ready.');
                setTimeout(() => {
                  onRefresh();
                  onModelReady(model.id);
                  setDownloadingModel(null);
                }, 1000);
                return;
              }
              if (data.status === 'error') {
                throw new Error(data.error || 'Download encountered an error');
              }
            } catch (pErr: any) {
              if (pErr.message && pErr.message.includes('Download encountered')) {
                throw pErr;
              }
            }
          }
        }
      }

      // Final check
      setDownloadProgress(100);
      onRefresh();
      onModelReady(model.id);
      setDownloadingModel(null);
    } catch (err: any) {
      setDownloadError(err.message || 'Failed to download model');
      setDownloadingModel(null);
    }
  };

  const isOllamaRunning = status?.online ?? false;

  return (
    <div className="max-w-3xl mx-auto my-6 p-6 sm:p-8 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 bg-white/95 dark:bg-slate-900/90 shadow-2xl backdrop-blur-xl animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                Offline AI Setup Required
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                100% Private
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Please download a local model below to unlock Offline Mode on this device.
            </p>
          </div>
        </div>

        <button
          onClick={onSwitchToOnline}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-xs font-semibold border border-blue-200 dark:border-blue-800 transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Switch to Online Mode (Gemini)</span>
        </button>
      </div>

      {/* Ollama Service Offline Warning */}
      {!isOllamaRunning && (
        <div className="mt-5 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-semibold">Local Ollama Service Not Detected</p>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Offline models run locally on your system using Ollama. Make sure Ollama is running on{' '}
              <code className="px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 font-mono">
                {status?.endpoint || 'http://localhost:11434'}
              </code>
              . If accessing from your phone, connect your phone to the same Wi-Fi and set your PC’s IP in Settings.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                onClick={onRefresh}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium"
              >
                <RefreshCw className="w-3 h-3" /> Retry Connection
              </button>
              <a
                href="https://ollama.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300 hover:underline px-2 py-1"
              >
                Download Ollama <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Bar */}
      {downloadingModel && (
        <div className="mt-5 p-5 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-800">
          <div className="flex items-center justify-between text-xs mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span className="font-semibold">Downloading {downloadingModel}...</span>
            </div>
            <span className="font-mono text-emerald-400 font-bold">{downloadProgress}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300 rounded-full"
              style={{ width: `${Math.max(downloadProgress, 3)}%` }}
            />
          </div>

          <p className="mt-2 text-[11px] text-gray-400 capitalize flex items-center justify-between">
            <span>Status: {downloadStatusText || 'Downloading layers...'}</span>
            <span>Do not close this window</span>
          </p>
        </div>
      )}

      {/* Download Error Banner */}
      {downloadError && (
        <div className="mt-4 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Models Grid */}
      <div className="mt-6">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Select a Model to Download for Offline Mode
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {RECOMMENDED_OFFLINE_MODELS.map((model) => {
            const isInstalled = installedModelNames.some(
              (name) => name === model.id.toLowerCase() || name.startsWith(model.id.split(':')[0])
            );
            const isCurrentDownloading = downloadingModel === model.id;

            return (
              <div
                key={model.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isInstalled
                    ? 'border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/30 dark:bg-emerald-950/10'
                    : 'border-gray-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 bg-white dark:bg-slate-900/60'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">
                        {model.name}
                      </span>
                      {model.badge && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300">
                          {model.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2 leading-relaxed">
                      {model.description}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-100 dark:border-slate-800/80 pt-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3" /> {model.size}
                    </span>
                    <span className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3" /> {model.ramRequired}
                    </span>
                  </div>

                  {isInstalled ? (
                    <button
                      onClick={() => onModelReady(model.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>Use Model</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDownload(model)}
                      disabled={isCurrentDownloading || downloadingModel !== null}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold text-xs shadow-xs"
                    >
                      {isCurrentDownloading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Downloading...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
