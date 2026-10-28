'use client';

import React, { useRef, useEffect, useState } from 'react';
import {
  Send,
  Square,
  Paperclip,
  Mic,
  MicOff,
  X,
  FileText,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';
import { Attachment } from '@/types/chat';
import { isSpeechRecognitionSupported, voiceService } from '@/lib/speech';

interface ChatInputProps {
  onSendMessage: (content: string, attachments: Attachment[]) => void;
  isStreaming: boolean;
  onStopStreaming: () => void;
  disabled?: boolean;
  speechLanguage?: string;
}

export function ChatInput({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  disabled = false,
  speechLanguage = 'en-US',
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [input]);

  // Handle Send
  const handleSend = () => {
    if ((!input.trim() && attachments.length === 0) || isStreaming || disabled) return;

    onSendMessage(input.trim(), attachments);
    setInput('');
    setAttachments([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // File size limit: 10MB
      if (file.size > 10 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 10MB)`);
        continue;
      }

      if (file.type.startsWith('image/')) {
        // Read as Data URL
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        newAttachments.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl,
        });
      } else {
        // Text / Code / Doc
        const textContent = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve((reader.result as string) || '');
          reader.readAsText(file);
        });

        newAttachments.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          type: file.type || 'text/plain',
          size: file.size,
          textContent,
        });
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Toggle Voice Recognition
  const toggleListening = () => {
    setSpeechError(null);

    if (isListening) {
      voiceService.stopListening();
      setIsListening(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setSpeechError('Speech recognition is not supported in this browser.');
      return;
    }

    const started = voiceService.startListening(
      speechLanguage,
      (state) => {
        setInput((prev) => {
          const base = prev.trim();
          return base ? `${base} ${state.transcript}` : state.transcript;
        });
      },
      (err) => {
        setSpeechError(err);
        setIsListening(false);
      },
      () => {
        setIsListening(false);
      }
    );

    if (started) {
      setIsListening(true);
    }
  };

  return (
    <div className="w-full bg-white/80 dark:bg-[#0f141c]/90 backdrop-blur-md border-t border-gray-200/80 dark:border-slate-800/80 p-3 sm:p-4">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Error notification for speech */}
        {speechError && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {speechError}
            </span>
            <button
              onClick={() => setSpeechError(null)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-900"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Attachments preview strip */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-1">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="relative group flex items-center gap-2 p-2 rounded-xl bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs"
              >
                {att.type.startsWith('image/') && att.dataUrl ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <FileText className="w-5 h-5 text-blue-500" />
                )}
                <div className="max-w-[130px] truncate">
                  <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                    {att.name}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {(att.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="p-1 rounded-full bg-gray-200 dark:bg-slate-700 text-gray-500 hover:text-red-500 transition-colors"
                  title="Remove attachment"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar Container */}
        <div className="relative flex items-end gap-2 p-2 rounded-2xl bg-gray-50 dark:bg-slate-900/90 border border-gray-200 dark:border-slate-800 focus-within:border-blue-500 dark:focus-within:border-blue-500 shadow-sm transition-all">
          {/* File input (hidden) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            multiple
            className="hidden"
            accept="image/*,text/*,.py,.js,.ts,.tsx,.jsx,.cpp,.c,.java,.html,.css,.json,.md,.txt"
          />

          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image, document, or code file"
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-200/60 dark:hover:bg-slate-800 transition-colors flex-shrink-0"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening... Speak now...'
                : 'Message CHAT AI... (Press Enter to send, Shift+Enter for new line)'
            }
            rows={1}
            disabled={disabled}
            className="flex-1 max-h-[200px] py-1.5 px-2 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none resize-none leading-relaxed"
          />

          {/* Voice Input (Microphone) */}
          <button
            type="button"
            onClick={toggleListening}
            title={isListening ? 'Stop listening' : 'Start voice input (Speech to Text)'}
            className={`p-2 rounded-xl transition-all flex-shrink-0 ${
              isListening
                ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30'
                : 'text-gray-500 dark:text-gray-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-gray-200/60 dark:hover:bg-slate-800'
            }`}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Send or Stop button */}
          {isStreaming ? (
            <button
              type="button"
              onClick={onStopStreaming}
              title="Stop generating"
              className="p-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-85 shadow-md flex-shrink-0 transition-transform active:scale-95"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || disabled}
              title="Send message"
              className="p-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white shadow-md shadow-blue-500/20 flex-shrink-0 transition-transform active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Small Disclaimer Footer */}
        <div className="text-center">
          <p className="text-[11px] text-gray-400 dark:text-gray-500">
            CHAT AI can make mistakes. Please verify important information.
          </p>
        </div>
      </div>
    </div>
  );
}

