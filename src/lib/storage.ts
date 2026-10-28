import { AppSettings, Conversation, DEFAULT_SETTINGS, Message } from '@/types/chat';

const DB_NAME = 'chat_ai_db';
const DB_VERSION = 1;
const STORE_CONVERSATIONS = 'conversations';
const STORE_MESSAGES = 'messages';
const SETTINGS_KEY = 'chat_ai_settings';

class StorageService {
  private dbPromise: Promise<IDBDatabase | null> | null = null;

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
  }

  private getDB(): Promise<IDBDatabase | null> {
    if (!this.isBrowser()) return Promise.resolve(null);
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_CONVERSATIONS)) {
            const convStore = db.createObjectStore(STORE_CONVERSATIONS, { keyPath: 'id' });
            convStore.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
          if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
            const msgStore = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
            msgStore.createIndex('conversationId', 'conversationId', { unique: false });
            msgStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          console.warn('IndexedDB failed to open, falling back to LocalStorage', request.error);
          resolve(null);
        };
      } catch (e) {
        console.warn('IndexedDB init error:', e);
        resolve(null);
      }
    });

    return this.dbPromise;
  }

  // --- Settings ---
  getSettings(): AppSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (!stored) return DEFAULT_SETTINGS;
      const parsed = JSON.parse(stored);

      // Auto-migrate legacy or verbose system prompt to the new concise directive
      if (
        !parsed.systemPrompt ||
        parsed.systemPrompt.includes('versatile') ||
        parsed.systemPrompt.includes('helpful, intelligent, polite') ||
        parsed.temperature === 0.7
      ) {
        parsed.systemPrompt = DEFAULT_SETTINGS.systemPrompt;
        parsed.temperature = 0.2;
        localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...parsed }));
      }

      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings: Partial<AppSettings>): AppSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    } catch (e) {
      console.error('Error saving settings', e);
      return DEFAULT_SETTINGS;
    }
  }

  // --- Conversations ---
  async getConversations(): Promise<Conversation[]> {
    const db = await this.getDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_CONVERSATIONS, 'readonly');
          const store = tx.objectStore(STORE_CONVERSATIONS);
          const req = store.getAll();
          req.onsuccess = () => {
            const list: Conversation[] = req.result || [];
            // Sort by pinned first, then updatedAt desc
            list.sort((a, b) => {
              if (a.pinned && !b.pinned) return -1;
              if (!a.pinned && b.pinned) return 1;
              return b.updatedAt - a.updatedAt;
            });
            resolve(list);
          };
          req.onerror = () => resolve(this.getConversationsFallback());
        } catch {
          resolve(this.getConversationsFallback());
        }
      });
    }
    return this.getConversationsFallback();
  }

  private getConversationsFallback(): Conversation[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem('chat_ai_fallback_convs');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveConversationsFallback(convs: Conversation[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('chat_ai_fallback_convs', JSON.stringify(convs));
    } catch (e) {
      console.error(e);
    }
  }

  async saveConversation(conv: Conversation): Promise<void> {
    const db = await this.getDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_CONVERSATIONS, 'readwrite');
          const store = tx.objectStore(STORE_CONVERSATIONS);
          store.put(conv);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    const current = this.getConversationsFallback();
    const idx = current.findIndex((c) => c.id === conv.id);
    if (idx >= 0) {
      current[idx] = conv;
    } else {
      current.unshift(conv);
    }
    this.saveConversationsFallback(current);
  }

  async deleteConversation(id: string): Promise<void> {
    const db = await this.getDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction([STORE_CONVERSATIONS, STORE_MESSAGES], 'readwrite');
          tx.objectStore(STORE_CONVERSATIONS).delete(id);

          const msgStore = tx.objectStore(STORE_MESSAGES);
          const index = msgStore.index('conversationId');
          const req = index.openCursor(IDBKeyRange.only(id));
          req.onsuccess = (e) => {
            const cursor = (e.target as IDBRequest).result;
            if (cursor) {
              cursor.delete();
              cursor.continue();
            }
          };
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    const convs = this.getConversationsFallback().filter((c) => c.id !== id);
    this.saveConversationsFallback(convs);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`chat_ai_msgs_${id}`);
    }
  }

  async clearAllConversations(): Promise<void> {
    const db = await this.getDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction([STORE_CONVERSATIONS, STORE_MESSAGES], 'readwrite');
          tx.objectStore(STORE_CONVERSATIONS).clear();
          tx.objectStore(STORE_MESSAGES).clear();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('chat_ai_fallback_convs');
      const keys = Object.keys(localStorage);
      for (const k of keys) {
        if (k.startsWith('chat_ai_msgs_')) {
          localStorage.removeItem(k);
        }
      }
    }
  }

  // --- Messages ---
  async getMessages(conversationId: string): Promise<Message[]> {
    const db = await this.getDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_MESSAGES, 'readonly');
          const store = tx.objectStore(STORE_MESSAGES);
          const index = store.index('conversationId');
          const req = index.getAll(IDBKeyRange.only(conversationId));
          req.onsuccess = () => {
            const msgs: Message[] = req.result || [];
            msgs.sort((a, b) => a.timestamp - b.timestamp);
            resolve(msgs);
          };
          req.onerror = () => resolve(this.getMessagesFallback(conversationId));
        } catch {
          resolve(this.getMessagesFallback(conversationId));
        }
      });
    }
    return this.getMessagesFallback(conversationId);
  }

  private getMessagesFallback(convId: string): Message[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(`chat_ai_msgs_${convId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private saveMessagesFallback(convId: string, msgs: Message[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`chat_ai_msgs_${convId}`, JSON.stringify(msgs));
    } catch (e) {
      console.error(e);
    }
  }

  async saveMessage(message: Message): Promise<void> {
    const db = await this.getDB();
    if (db) {
      return new Promise((resolve) => {
        try {
          const tx = db.transaction(STORE_MESSAGES, 'readwrite');
          const store = tx.objectStore(STORE_MESSAGES);
          store.put(message);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    const current = this.getMessagesFallback(message.conversationId);
    const idx = current.findIndex((m) => m.id === message.id);
    if (idx >= 0) {
      current[idx] = message;
    } else {
      current.push(message);
    }
    this.saveMessagesFallback(message.conversationId, current);
  }

  async deleteMessage(conversationId: string, messageId: string): Promise<void> {
    const db = await this.getDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(STORE_MESSAGES, 'readwrite');
          tx.objectStore(STORE_MESSAGES).delete(messageId);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
    const current = this.getMessagesFallback(conversationId).filter((m) => m.id !== messageId);
    this.saveMessagesFallback(conversationId, current);
  }

  // --- Search ---
  async search(query: string): Promise<{ conversation: Conversation; matchedSnippet?: string }[]> {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const convs = await this.getConversations();
    const results: { conversation: Conversation; matchedSnippet?: string }[] = [];

    for (const c of convs) {
      if (c.title.toLowerCase().includes(q)) {
        results.push({ conversation: c });
        continue;
      }
      const msgs = await this.getMessages(c.id);
      const match = msgs.find((m) => m.content.toLowerCase().includes(q));
      if (match) {
        const idx = match.content.toLowerCase().indexOf(q);
        const start = Math.max(0, idx - 30);
        const end = Math.min(match.content.length, idx + q.length + 30);
        const snippet = '...' + match.content.substring(start, end).replace(/\n/g, ' ') + '...';
        results.push({ conversation: c, matchedSnippet: snippet });
      }
    }
    return results;
  }

  // --- Export ---
  async exportConversation(id: string, format: 'markdown' | 'txt' | 'json'): Promise<string> {
    const convs = await this.getConversations();
    const conv = convs.find((c) => c.id === id);
    const msgs = await this.getMessages(id);

    if (format === 'json') {
      return JSON.stringify({ conversation: conv, messages: msgs }, null, 2);
    }

    const title = conv?.title || 'CHAT AI Conversation';
    const dateStr = conv ? new Date(conv.createdAt).toLocaleString() : new Date().toLocaleString();
    const mode = conv?.mode || 'online';

    if (format === 'markdown') {
      let md = `# ${title}\n\n`;
      md += `*Mode: ${mode.toUpperCase()} | Model: ${conv?.model || 'default'} | Date: ${dateStr}*\n\n---\n\n`;
      for (const m of msgs) {
        const roleName = m.role === 'user' ? '👤 User' : '🤖 CHAT AI';
        const time = new Date(m.timestamp).toLocaleTimeString();
        md += `### ${roleName} (${time})\n\n${m.content}\n\n`;
        if (m.sources && m.sources.length > 0) {
          md += `**Sources:**\n`;
          for (const s of m.sources) {
            md += `- [${s.title}](${s.url})\n`;
          }
          md += '\n';
        }
        md += `---\n\n`;
      }
      return md;
    } else {
      // Plain text
      let txt = `${title}\nMode: ${mode.toUpperCase()} | Date: ${dateStr}\n=========================================\n\n`;
      for (const m of msgs) {
        const role = m.role === 'user' ? 'USER' : 'CHAT AI';
        txt += `[${role}] - ${new Date(m.timestamp).toLocaleTimeString()}\n${m.content}\n\n`;
      }
      return txt;
    }
  }
}

export const storage = new StorageService();

