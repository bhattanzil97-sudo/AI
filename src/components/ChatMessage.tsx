'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  Edit3,
  Globe,
  Laptop,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { Message } from '@/types/chat';
import { cleanReasoning } from '@/lib/clean-response';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEditMessage?: (newContent: string) => void;
  onSpeak?: (text: string) => void;
  isSpeaking?: boolean;
}

export function ChatMessage({
  message,
  isStreaming,
  onRegenerate,
  onEditMessage,
  onSpeak,
  isSpeaking,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const isUser = message.role === 'user';
  const displayContent = isUser ? message.content : cleanReasoning(message.content);

  const handleCopy = () => {
    navigator.clipboard.writeText(displayContent || message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content && onEditMessage) {
      onEditMessage(editContent.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`group w-full py-5 px-3 sm:px-6 transition-colors ${
        isUser
          ? 'bg-transparent'
          : 'bg-gray-50/70 dark:bg-[#141b26]/70 border-y border-gray-100 dark:border-slate-800/60'
      }`}
    >
      <div className="max-w-4xl mx-auto flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 text-white flex items-center justify-center font-semibold text-xs shadow-sm">
              U
            </div>
          ) : (
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-sm ${
                message.mode === 'online'
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20'
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-500/20'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className="flex-1 min-w-0">
          {/* Header Metadata */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-semibold text-xs text-gray-900 dark:text-white">
              {isUser ? 'You' : 'CHAT AI'}
            </span>

            {!isUser && (
              <>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.2 rounded-full border ${
                    message.mode === 'online'
                      ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                  }`}
                >
                  {message.mode === 'online' ? (
                    <>
                      <Globe className="w-2.5 h-2.5" /> {message.model || 'Online'}
                    </>
                  ) : (
                    <>
                      <Laptop className="w-2.5 h-2.5" /> {message.model || 'Offline'}
                    </>
                  )}
                </span>
              </>
            )}

            <span className="text-[10px] text-gray-400">
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {/* Attachments preview if user message */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs"
                >
                  {att.type.startsWith('image/') && att.dataUrl ? (
                    <img
                      src={att.dataUrl}
                      alt={att.name}
                      className="w-10 h-10 object-cover rounded-lg"
                    />
                  ) : (
                    <FileText className="w-4 h-4 text-blue-500" />
                  )}
                  <div className="max-w-[150px] truncate">
                    <p className="font-medium truncate text-gray-800 dark:text-gray-200">
                      {att.name}
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {(att.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Body Content */}
          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-3 rounded-xl border border-blue-500 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white focus:outline-none resize-y min-h-[80px]"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium"
                >
                  Save & Resend
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className={`prose prose-slate dark:prose-invert max-w-none text-sm leading-relaxed text-gray-800 dark:text-gray-200 ${
                isStreaming ? 'streaming-cursor' : ''
              }`}
            >
              {message.isError ? (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                    <div>
                      <p className="font-semibold text-sm">{message.content}</p>
                      {message.errorDetails && (
                        <p className="mt-1 text-xs opacity-90">{message.errorDetails}</p>
                      )}
                    </div>
                  </div>

                  {/* If this is an Ollama offline error, provide instant setup helpers */}
                  {(message.content.includes('Ollama') || message.errorDetails?.includes('Ollama')) && (
                    <div className="mt-3 p-3.5 rounded-xl bg-white/70 dark:bg-slate-900/80 border border-rose-200/60 dark:border-rose-800/60 text-gray-800 dark:text-gray-200 space-y-2.5">
                      <p className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Laptop className="w-3.5 h-3.5" /> How to enable 100% Offline AI:
                      </p>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400">
                        Offline Mode runs genuine AI models locally on your PC hardware without internet. It requires Ollama installed on your system.
                      </p>

                      <div className="flex flex-wrap gap-2 pt-1">
                        <a
                          href="https://ollama.com/download/OllamaSetup.exe"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Download Ollama for Windows</span>
                        </a>

                        <button
                          onClick={() => {
                            navigator.clipboard.writeText('ollama run llama3.2');
                            alert('Copied command: ollama run llama3.2\nPaste this in your terminal to start Llama 3.2!');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-mono font-medium"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy: ollama run llama3.2</span>
                        </button>
                      </div>

                      <p className="text-[10px] text-gray-400 pt-1">
                        💡 <em>Tip: You can also double-click <strong>setup-offline.bat</strong> in your project folder to install Ollama & Llama 3.2 automatically!</em>
                      </p>
                    </div>
                  )}
                </div>
              ) : displayContent ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    // Custom Code Block with Copy Button
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? match[1] : '';
                      const codeString = String(children).replace(/\n$/, '');

                      if (!inline && match) {
                        return (
                          <div className="relative my-3 rounded-xl overflow-hidden border border-gray-300 dark:border-slate-800 bg-[#0d1117]">
                            <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#161b22] text-xs text-gray-400 border-b border-gray-800">
                              <span className="font-mono text-[11px] uppercase">{language}</span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(codeString);
                                }}
                                className="flex items-center gap-1 hover:text-white transition-colors py-0.5 px-2 rounded hover:bg-slate-700/50"
                                title="Copy code"
                              >
                                <Copy className="w-3 h-3" />
                                <span className="text-[10px]">Copy</span>
                              </button>
                            </div>
                            <pre className="!m-0 !p-3.5 !bg-transparent text-xs font-mono overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                          </div>
                        );
                      }

                      return (
                        <code
                          className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 font-mono text-xs"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    table({ children }) {
                      return (
                        <div className="overflow-x-auto my-3 border border-gray-200 dark:border-slate-800 rounded-xl">
                          <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-xs">
                            {children}
                          </table>
                        </div>
                      );
                    },
                    th({ children }) {
                      return (
                        <th className="px-3 py-2 bg-gray-100 dark:bg-slate-800/80 text-left font-semibold text-gray-900 dark:text-white">
                          {children}
                        </th>
                      );
                    },
                    td({ children }) {
                      return (
                        <td className="px-3 py-2 border-t border-gray-100 dark:border-slate-800/60">
                          {children}
                        </td>
                      );
                    },
                    a({ href, children }) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-0.5"
                        >
                          {children}
                          <ExternalLink className="w-2.5 h-2.5 inline" />
                        </a>
                      );
                    },
                  }}
                >
                  {displayContent}
                </ReactMarkdown>
              ) : isStreaming ? (
                <div className="flex items-center gap-2.5 py-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="animate-pulse">
                    {message.mode === 'offline'
                      ? `Running local model (${message.model})...`
                      : 'Generating answer...'}
                  </span>
                </div>
              ) : null}
            </div>
          )}

          {/* Sources Citations (Online Web Search Grounding) */}
          {message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-slate-800">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-blue-500" /> Web Sources & Citations
              </p>
              <div className="flex flex-wrap gap-2">
                {message.sources.map((src, idx) => (
                  <a
                    key={idx}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 text-xs text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-all max-w-[260px] truncate"
                  >
                    <span className="w-4 h-4 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {idx + 1}
                    </span>
                    <span className="truncate">{src.title || src.url}</span>
                    <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 opacity-60" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Action Toolbar on Bottom */}
          <div className="flex items-center gap-1 mt-2.5 opacity-90 group-hover:opacity-100 transition-opacity">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-slate-800 transition-colors text-xs"
              title="Copy response"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[10px] text-green-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[10px]">Copy</span>
                </>
              )}
            </button>

            {/* Read aloud (TTS) button */}
            {onSpeak && !isUser && (
              <button
                onClick={() => onSpeak(displayContent || message.content)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-slate-800 transition-colors text-xs"
                title={isSpeaking ? 'Stop speech' : 'Read aloud'}
              >
                {isSpeaking ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                    <span className="text-[10px] text-rose-500">Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Read</span>
                  </>
                )}
              </button>
            )}

            {/* Regenerate button (Assistant only) */}
            {!isUser && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-slate-800 transition-colors text-xs"
                title="Regenerate response"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[10px]">Regenerate</span>
              </button>
            )}

            {/* Edit User Message */}
            {isUser && onEditMessage && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-200/60 dark:hover:bg-slate-800 transition-colors text-xs"
                title="Edit message"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="text-[10px]">Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

