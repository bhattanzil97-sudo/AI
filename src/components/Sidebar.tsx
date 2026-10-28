'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Search,
  Trash2,
  Edit2,
  Pin,
  Download,
  Settings as SettingsIcon,
  HelpCircle,
  X,
  Check,
  Globe,
  Laptop,
  Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { AppMode, Conversation } from '@/types/chat';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onTogglePin: (id: string) => void;
  onExportConversation: (id: string, format: 'markdown' | 'txt') => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  currentMode: AppMode;
}

export function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onTogglePin,
  onExportConversation,
  onOpenSettings,
  onOpenHelp,
  isOpen,
  onCloseMobile,
  currentMode,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'online' | 'offline'>('all');

  // Filter conversations
  const filtered = conversations.filter((c) => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMode = modeFilter === 'all' || c.mode === modeFilter;
    return matchesSearch && matchesMode;
  });

  // Group conversations by recency
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  const pinnedConvs = filtered.filter((c) => c.pinned);
  const unpinnedConvs = filtered.filter((c) => !c.pinned);

  const todayConvs = unpinnedConvs.filter((c) => now - c.updatedAt < oneDay);
  const weekConvs = unpinnedConvs.filter((c) => now - c.updatedAt >= oneDay && now - c.updatedAt < sevenDays);
  const olderConvs = unpinnedConvs.filter((c) => now - c.updatedAt >= sevenDays);

  const handleStartRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const renderConversationItem = (c: Conversation) => {
    const isActive = c.id === activeId;
    const isEditing = editingId === c.id;

    return (
      <div
        key={c.id}
        onClick={() => {
          onSelectConversation(c.id);
          onCloseMobile();
        }}
        className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all text-sm ${
          isActive
            ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 font-medium border border-blue-500/20'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-slate-800/60 border border-transparent'
        }`}
      >
        <span className="flex-shrink-0 text-gray-400">
          {c.mode === 'online' ? (
            <Globe className="w-4 h-4 text-blue-500" />
          ) : (
            <Laptop className="w-4 h-4 text-emerald-500" />
          )}
        </span>

        {isEditing ? (
          <form
            onSubmit={(e) => handleSaveRename(c.id, e)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 flex items-center gap-1 min-w-0"
          >
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              autoFocus
              className="w-full bg-white dark:bg-slate-900 border border-blue-500 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-white outline-none"
            />
            <button
              type="button"
              onClick={(e) => handleSaveRename(c.id, e)}
              className="p-1 hover:text-green-500 text-gray-400"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(null);
              }}
              className="p-1 hover:text-red-500 text-gray-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        ) : (
          <>
            <span className="flex-1 truncate text-xs">{c.title}</span>

            {c.pinned && (
              <Pin className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" />
            )}

            {/* Hover Action Buttons */}
            <div className="hidden group-hover:flex items-center gap-1 flex-shrink-0">
              <button
                title={c.pinned ? 'Unpin' : 'Pin to top'}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePin(c.id);
                }}
                className="p-1 hover:text-amber-500 text-gray-400"
              >
                <Pin className={`w-3.5 h-3.5 ${c.pinned ? 'fill-amber-500 text-amber-500' : ''}`} />
              </button>
              <button
                title="Rename chat"
                onClick={(e) => handleStartRename(c, e)}
                className="p-1 hover:text-blue-500 text-gray-400"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                title="Export chat as Markdown"
                onClick={(e) => {
                  e.stopPropagation();
                  onExportConversation(c.id, 'markdown');
                }}
                className="p-1 hover:text-emerald-500 text-gray-400"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                title="Delete chat"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm('Delete this conversation?')) {
                    onDeleteConversation(c.id);
                  }
                }}
                className="p-1 hover:text-red-500 text-gray-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 bg-gray-50 dark:bg-[#0b0f17] border-r border-gray-200 dark:border-slate-800 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-72'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-gray-200 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-base tracking-tight text-gray-900 dark:text-white">
                  CHAT AI
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 uppercase">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Online 🌐 & Offline 💻
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Action: New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-sm shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Chat</span>
          </button>
        </div>

        {/* Search & Filter */}
        <div className="px-3 pb-2 space-y-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-gray-200/60 dark:bg-slate-800/60 border border-gray-300/50 dark:border-slate-700/50 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Mode Filter Pills */}
          <div className="flex items-center gap-1 text-[11px] p-0.5 bg-gray-200/50 dark:bg-slate-800/40 rounded-lg">
            <button
              onClick={() => setModeFilter('all')}
              className={`flex-1 py-1 rounded-md transition-all text-center ${
                modeFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white font-medium shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              All ({conversations.length})
            </button>
            <button
              onClick={() => setModeFilter('online')}
              className={`flex-1 py-1 rounded-md transition-all text-center flex items-center justify-center gap-1 ${
                modeFilter === 'online'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-medium shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              <Globe className="w-3 h-3" /> Online
            </button>
            <button
              onClick={() => setModeFilter('offline')}
              className={`flex-1 py-1 rounded-md transition-all text-center flex items-center justify-center gap-1 ${
                modeFilter === 'offline'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 font-medium shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              <Laptop className="w-3 h-3" /> Offline
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 space-y-4 py-2">
          {filtered.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare className="w-8 h-8 mx-auto text-gray-400/50 mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                Start a new chat to begin!
              </p>
            </div>
          ) : (
            <>
              {/* Pinned */}
              {pinnedConvs.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-500/80 px-2 mb-1 flex items-center gap-1">
                    <Pin className="w-3 h-3 fill-amber-500" /> Pinned
                  </div>
                  <div className="space-y-1">
                    {pinnedConvs.map(renderConversationItem)}
                  </div>
                </div>
              )}

              {/* Today */}
              {todayConvs.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 mb-1">
                    Today
                  </div>
                  <div className="space-y-1">
                    {todayConvs.map(renderConversationItem)}
                  </div>
                </div>
              )}

              {/* Previous 7 Days */}
              {weekConvs.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 mb-1">
                    Previous 7 Days
                  </div>
                  <div className="space-y-1">
                    {weekConvs.map(renderConversationItem)}
                  </div>
                </div>
              )}

              {/* Older */}
              {olderConvs.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-2 mb-1">
                    Older
                  </div>
                  <div className="space-y-1">
                    {olderConvs.map(renderConversationItem)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info & Settings */}
        <div className="p-3 border-t border-gray-200 dark:border-slate-800/80 space-y-1 bg-white/50 dark:bg-slate-900/40">
          <div className="px-2 py-1 text-[11px] text-gray-400 flex items-center justify-between">
            <span>Storage: Local Device (Private)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Local storage active" />
          </div>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <SettingsIcon className="w-4 h-4 text-gray-500" />
            <span>Settings & Models</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <HelpCircle className="w-4 h-4 text-gray-500" />
            <span>Help & Setup Guide</span>
          </button>
        </div>
      </aside>
    </>
  );
}

