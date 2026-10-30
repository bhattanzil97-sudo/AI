'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { WelcomeScreen } from '@/components/WelcomeScreen';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { OfflineModelGatekeeper } from '@/components/OfflineModelGatekeeper';
import { OfflineDiagnostics } from '@/components/OfflineDiagnostics';
import { SettingsModal } from '@/components/SettingsModal';
import { HelpModal } from '@/components/HelpModal';
import {
  AppMode,
  Attachment,
  Conversation,
  DEFAULT_SETTINGS,
  Message,
  OllamaModel,
  OllamaStatus,
  ONLINE_MODELS,
} from '@/types/chat';
import { storage } from '@/lib/storage';
import { voiceService } from '@/lib/speech';
import { cleanReasoning } from '@/lib/clean-response';

export default function ChatAIPage() {
  // App Settings & Theme
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [currentMode, setCurrentMode] = useState<AppMode>('online');
  const [activeModel, setActiveModel] = useState<string>('gemini-1.5-flash');

  // Conversations & Active Chat
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // Ollama Offline Status
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isCheckingOllama, setIsCheckingOllama] = useState(false);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Modals & Sidebar UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const skipLoadForConvRef = useRef<string | null>(null);
  const scrollRafRef = useRef<number | null>(null);

  // --- Initial Mount & Load ---
  useEffect(() => {
    // Load Settings
    const loadedSettings = storage.getSettings();
    setSettings(loadedSettings);
    setCurrentMode(loadedSettings.defaultMode || 'online');
    setActiveModel(
      loadedSettings.defaultMode === 'offline'
        ? loadedSettings.offlineModel || 'llama3.2'
        : loadedSettings.onlineModel || 'gemini-1.5-flash'
    );

    // Apply Theme
    applyTheme(loadedSettings.theme);

    // Load Conversations
    storage.getConversations().then((convs) => {
      setConversations(convs);
    });

    // Check Ollama status
    checkOllamaStatus(loadedSettings.ollamaEndpoint);

    // Background warmup for local AI model to eliminate cold-start delay
    fetch('/api/ollama/warmup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: loadedSettings.ollamaEndpoint,
        model: loadedSettings.offlineModel || 'qwen3.5:4b',
      }),
    }).catch(() => {});
  }, []);

  // Theme helper
  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  };

  const handleToggleTheme = () => {
    const newTheme = settings.theme === 'dark' ? 'light' : 'dark';
    const updated = storage.saveSettings({ theme: newTheme });
    setSettings(updated);
    applyTheme(newTheme);
  };

  // Check Ollama connectivity
  const checkOllamaStatus = async (endpoint: string = settings.ollamaEndpoint) => {
    setIsCheckingOllama(true);
    try {
      const res = await fetch(`/api/ollama/status?endpoint=${encodeURIComponent(endpoint)}`);
      const data: OllamaStatus = await res.json();
      setOllamaStatus(data);

      if (data.online && data.models && data.models.length > 0) {
        // If current offline model is not in list, auto-select first available
        const isCurrentValid = data.models.some((m) => m.name === activeModel);
        if (!isCurrentValid && currentMode === 'offline') {
          setActiveModel(data.models[0].name);
          storage.saveSettings({ offlineModel: data.models[0].name });
        }
      }
    } catch (e) {
      setOllamaStatus({
        online: false,
        endpoint,
        models: [],
        error: 'Unable to reach local Ollama service',
      });
    } finally {
      setIsCheckingOllama(false);
    }
  };

  // Switch Mode (Online / Offline)
  const handleToggleMode = async (mode: AppMode) => {
    setCurrentMode(mode);
    storage.saveSettings({ defaultMode: mode });

    if (mode === 'online') {
      setActiveModel(settings.onlineModel || 'gemini-1.5-flash');
    } else {
      // Offline mode: check Ollama & warmup in background
      setIsCheckingOllama(true);
      fetch('/api/ollama/warmup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: settings.ollamaEndpoint,
          model: settings.offlineModel || 'qwen3.5:4b',
        }),
      }).catch(() => {});
      try {
        const res = await fetch(`/api/ollama/status?endpoint=${encodeURIComponent(settings.ollamaEndpoint)}`);
        const data: OllamaStatus = await res.json();
        setOllamaStatus(data);
        if (data.online && data.models && data.models.length > 0) {
          const currentValid = data.models.find((m) => m.name === activeModel);
          const chosen = currentValid ? currentValid.name : data.models[0].name;
          setActiveModel(chosen);
          storage.saveSettings({ offlineModel: chosen });
        } else {
          setActiveModel(settings.offlineModel || 'qwen3.5:4b');
        }
      } catch {
        setActiveModel(settings.offlineModel || 'qwen3.5:4b');
      } finally {
        setIsCheckingOllama(false);
      }
    }
  };

  // Switch Model
  const handleSelectModel = (model: string) => {
    setActiveModel(model);
    if (currentMode === 'online') {
      storage.saveSettings({ onlineModel: model });
    } else {
      storage.saveSettings({ offlineModel: model });
    }
  };

  // Toggle Web Search
  const handleToggleWebSearch = () => {
    const updated = !settings.webSearchEnabled;
    storage.saveSettings({ webSearchEnabled: updated });
    setSettings((prev) => ({ ...prev, webSearchEnabled: updated }));
  };

  // Load Messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    // Prevent overwriting messages if this conversation was just created in handleSendMessage
    if (skipLoadForConvRef.current === activeConversationId) {
      skipLoadForConvRef.current = null;
      return;
    }

    // Do not wipe out active streaming state
    if (isStreaming) {
      return;
    }

    let isMounted = true;
    storage.getMessages(activeConversationId).then((msgs) => {
      if (isMounted) {
        setMessages(msgs);
        scrollToBottom();
      }
    });

    return () => {
      isMounted = false;
    };
  }, [activeConversationId]);

  // Select conversation safely
  const handleSelectConversation = (id: string) => {
    if (id === activeConversationId) return;
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveConversationId(id);
  };

  // High-performance display-rate throttled scroll (smooth 60 FPS streaming)
  const scrollToBottom = (smooth = false) => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = window.requestAnimationFrame(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'end',
        });
      }
      scrollRafRef.current = null;
    });
  };

  // Start New Chat
  const handleNewChat = () => {
    if (isStreaming) {
      handleStopStreaming();
    }
    setActiveConversationId(null);
    setMessages([]);
  };

  // Delete Conversation
  const handleDeleteConversation = async (id: string) => {
    await storage.deleteConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      handleNewChat();
    }
  };

  // Rename Conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    const target = conversations.find((c) => c.id === id);
    if (target) {
      const updated = { ...target, title: newTitle, updatedAt: Date.now() };
      await storage.saveConversation(updated);
      setConversations((prev) => prev.map((c) => (c.id === id ? updated : c)));
    }
  };

  // Toggle Pin
  const handleTogglePin = async (id: string) => {
    const target = conversations.find((c) => c.id === id);
    if (target) {
      const updated = { ...target, pinned: !target.pinned };
      await storage.saveConversation(updated);
      const reloaded = await storage.getConversations();
      setConversations(reloaded);
    }
  };

  // Export Conversation
  const handleExportConversation = async (id: string, format: 'markdown' | 'txt') => {
    const content = await storage.exportConversation(id, format);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-ai-export-${id}.${format === 'markdown' ? 'md' : 'txt'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear All Data
  const handleClearAllData = async () => {
    await storage.clearAllConversations();
    setConversations([]);
    setActiveConversationId(null);
    setMessages([]);
  };

  // Stop Streaming
  const handleStopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  };

  // Text to Speech
  const handleSpeak = (text: string) => {
    if (voiceService.isSpeaking()) {
      voiceService.stopSpeaking();
      setSpeakingMessageId(null);
      return;
    }

    setSpeakingMessageId(text);
    voiceService.speak(
      text,
      settings.speechLanguage,
      settings.speechVoice,
      () => { },
      () => setSpeakingMessageId(null)
    );
  };

  // Send Message
  const handleSendMessage = async (
    content: string,
    attachments: Attachment[] = [],
    historyOverride?: Message[]
  ) => {
    if (isStreaming) return;

    let convId = activeConversationId;
    let currentConvs = [...conversations];

    // If no active conversation, create a new one
    if (!convId) {
      convId = 'conv_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const title =
        content.length > 38 ? content.substring(0, 38).trim() + '...' : content || 'New Chat';

      const newConv: Conversation = {
        id: convId,
        title,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mode: currentMode,
        model: activeModel,
        messageCount: 0,
      };

      await storage.saveConversation(newConv);
      currentConvs.unshift(newConv);
      setConversations(currentConvs);

      // Signal to effect to skip reloading from disk for this newly initiated conversation
      skipLoadForConvRef.current = convId;
      setActiveConversationId(convId);
    } else {
      // Update existing conversation timestamp
      const existing = currentConvs.find((c) => c.id === convId);
      if (existing) {
        const updatedConv = {
          ...existing,
          updatedAt: Date.now(),
          mode: currentMode,
          model: activeModel,
        };
        await storage.saveConversation(updatedConv);
        setConversations((prev) => [
          updatedConv,
          ...prev.filter((c) => c.id !== convId),
        ]);
      }
    }

    // User Message
    const userMessage: Message = {
      id: 'msg_' + Date.now().toString(36) + '_u',
      conversationId: convId,
      role: 'user',
      content,
      timestamp: Date.now(),
      mode: currentMode,
      model: activeModel,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    await storage.saveMessage(userMessage);

    // Prepare assistant placeholder message
    const assistantMessageId = 'msg_' + Date.now().toString(36) + '_a';
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      conversationId: convId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      mode: currentMode,
      model: activeModel,
      isStreaming: true,
    };

    // Atomic update with both user message and assistant placeholder
    const baseHistory = historyOverride || messages;
    const updatedMessages = [...baseHistory, userMessage];
    setMessages([...updatedMessages, initialAssistantMessage]);
    setIsStreaming(true);
    scrollToBottom();

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const endpoint =
        currentMode === 'online' ? '/api/chat/online' : '/api/ollama/chat';

      const payload: any = {
        messages: updatedMessages.map((m) => ({
          role: m.role,
          content: m.role === 'assistant' ? cleanReasoning(m.content) : m.content,
          attachments: m.attachments,
        })),
        model: activeModel,
        temperature: settings.temperature,
        systemPrompt: settings.systemPrompt,
        userApiKey: settings.geminiApiKey || undefined,
      };

      if (currentMode === 'online') {
        payload.webSearch = settings.webSearchEnabled;
      } else {
        payload.endpoint = settings.ollamaEndpoint;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      // Handle direct HTTP error from backend
      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const errMsg =
          errJson?.message || `Request failed with HTTP status ${response.status}`;

        const errMessage: Message = {
          ...initialAssistantMessage,
          content: errMsg,
          isStreaming: false,
          isError: true,
          errorDetails:
            errJson?.error === 'MISSING_API_KEY'
              ? 'Please configure your Gemini API Key in the settings.'
              : errJson?.error === 'OLLAMA_UNREACHABLE'
                ? 'Check that Ollama is running locally.'
                : undefined,
        };

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessageId ? errMessage : m))
        );
        await storage.saveMessage(errMessage);
        setIsStreaming(false);
        return;
      }

      // Read SSE Stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream available');

      const decoder = new TextDecoder();
      let accumulatedContent = '';
      let accumulatedSources: any[] = [];
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const evt of events) {
          const lines = evt.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.replace('data: ', '').trim();
              if (!dataStr) continue;

              try {
                const data = JSON.parse(dataStr);

                if (data.type === 'chunk' && data.content) {
                  accumulatedContent += data.content;
                  setMessages((prev) => {
                    const exists = prev.some((m) => m.id === assistantMessageId);
                    if (!exists) {
                      return [
                        ...prev,
                        { ...initialAssistantMessage, content: accumulatedContent },
                      ];
                    }
                    return prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, content: accumulatedContent }
                        : m
                    );
                  });
                  scrollToBottom();
                } else if (data.type === 'sources' && data.sources) {
                  accumulatedSources = data.sources;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMessageId
                        ? { ...m, sources: accumulatedSources }
                        : m
                    )
                  );
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (parseErr) {
                console.warn('SSE Parse error', parseErr);
              }
            }
          }
        }
      }

      // Finalize completed message with clean reasoning filter
      const finalCleanContent = cleanReasoning(accumulatedContent) || accumulatedContent;
      const finalizedAssistantMessage: Message = {
        ...initialAssistantMessage,
        content: finalCleanContent,
        sources: accumulatedSources.length > 0 ? accumulatedSources : undefined,
        isStreaming: false,
      };

      setMessages((prev) => {
        const exists = prev.some((m) => m.id === assistantMessageId);
        if (!exists) {
          return [...prev, finalizedAssistantMessage];
        }
        return prev.map((m) => (m.id === assistantMessageId ? finalizedAssistantMessage : m));
      });
      await storage.saveMessage(finalizedAssistantMessage);

      // Auto read if enabled
      if (settings.autoReadAnswers && finalCleanContent) {
        handleSpeak(finalCleanContent);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Stream aborted by user
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? { ...m, isStreaming: false, content: m.content + ' [Stopped]' }
              : m
          )
        );
      } else {
        console.error('Generation failed:', err);
        const errMessage: Message = {
          ...initialAssistantMessage,
          content: 'An error occurred during response generation.',
          errorDetails: err.message || 'Network or model error',
          isStreaming: false,
          isError: true,
        };
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMessageId ? errMessage : m))
        );
        await storage.saveMessage(errMessage);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate Response
  const handleRegenerate = async () => {
    if (messages.length < 2 || isStreaming) return;

    // Find last user message
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }

    if (lastUserIdx === -1) return;

    const lastUserMessage = messages[lastUserIdx];
    const historyBefore = messages.slice(0, lastUserIdx);

    // Remove any assistant replies after it
    handleSendMessage(
      lastUserMessage.content,
      lastUserMessage.attachments || [],
      historyBefore
    );
  };

  // Edit Message
  const handleEditMessage = (index: number, newContent: string) => {
    const historyBefore = messages.slice(0, index);
    handleSendMessage(newContent, [], historyBefore);
  };

  const activeConv = conversations.find((c) => c.id === activeConversationId);

  // Determine whether to display the Offline Diagnostics card
  const showOfflineDiagnostics =
    currentMode === 'offline' && (!ollamaStatus?.online || (ollamaStatus.models?.length ?? 0) === 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#0f141c]">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onTogglePin={handleTogglePin}
        onExportConversation={handleExportConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
        currentMode={currentMode}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Top Header */}
        <Header
          currentMode={currentMode}
          onToggleMode={handleToggleMode}
          activeModel={activeModel}
          onSelectModel={handleSelectModel}
          ollamaModels={ollamaStatus?.models || []}
          ollamaOnline={Boolean(ollamaStatus?.online)}
          onRefreshOllama={() => checkOllamaStatus()}
          webSearchEnabled={settings.webSearchEnabled}
          onToggleWebSearch={handleToggleWebSearch}
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          chatTitle={activeConv?.title}
        />

        {/* Message Container / Welcome Screen */}
        <div className="flex-1 overflow-y-auto flex flex-col">
          {messages.length === 0 ? (
            <>
              {showOfflineDiagnostics ? (
                <div className="flex-1 p-4 flex items-center justify-center">
                  <OfflineModelGatekeeper
                    status={ollamaStatus}
                    onRefresh={() => checkOllamaStatus()}
                    onSwitchToOnline={() => handleToggleMode('online')}
                    onModelReady={(modelName) => {
                      setActiveModel(modelName);
                      storage.saveSettings({ offlineModel: modelName });
                      checkOllamaStatus();
                    }}
                  />
                </div>
              ) : (
                <WelcomeScreen
                  currentMode={currentMode}
                  activeModel={activeModel}
                  onSelectPrompt={(prompt) => handleSendMessage(prompt)}
                />
              )}
            </>
          ) : (
            <div className="flex-1 py-4">
              {showOfflineDiagnostics && (
                <div className="px-4 mb-4">
                  <OfflineModelGatekeeper
                    status={ollamaStatus}
                    onRefresh={() => checkOllamaStatus()}
                    onSwitchToOnline={() => handleToggleMode('online')}
                    onModelReady={(modelName) => {
                      setActiveModel(modelName);
                      storage.saveSettings({ offlineModel: modelName });
                      checkOllamaStatus();
                    }}
                  />
                </div>
              )}

              {messages.map((m, idx) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  isStreaming={m.isStreaming}
                  onRegenerate={
                    idx === messages.length - 1 && m.role === 'assistant'
                      ? handleRegenerate
                      : undefined
                  }
                  onEditMessage={
                    m.role === 'user'
                      ? (newContent) => handleEditMessage(idx, newContent)
                      : undefined
                  }
                  onSpeak={m.role === 'assistant' ? handleSpeak : undefined}
                  isSpeaking={speakingMessageId === m.content}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Message Input Area */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isStreaming={isStreaming}
          onStopStreaming={handleStopStreaming}
          speechLanguage={settings.speechLanguage}
          disabled={showOfflineDiagnostics}
        />
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={(patch) => {
          const updated = storage.saveSettings(patch);
          setSettings(updated);
          if (patch.theme) applyTheme(patch.theme);
        }}
        ollamaModels={ollamaStatus?.models || []}
        onClearAllData={handleClearAllData}
      />

      {/* Help & Guide Modal */}
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}

