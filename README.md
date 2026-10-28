# CHAT AI 🌐 💻

A modern, professional, full-featured AI chatbot inspired by ChatGPT and Google Gemini.
Supports both **Online Mode (Cloud AI with Web Search)** and genuine **Offline Mode (100% On-Device Ollama)** with zero internet required.

![CHAT AI Interface](https://via.placeholder.com/1200x630/0f141c/3b82f6?text=CHAT+AI+-+Online+%26+Offline+Intelligent+Assistant)

---

## 🌟 Key Features

### 1. Modern Premium UI
- **Dual Engine Interface:** Inspired by ChatGPT and Google Gemini.
- **Theme Support:** Polished Dark Mode and Light Mode with instant toggle.
- **Responsive Layout:** Optimized for mobile phones, tablets, laptops, and ultra-wide desktops.
- **Collapsible Sidebar:** Grouped history ("Today", "Previous 7 Days", "Older"), live title search, pinning, in-place renaming, and deletion.
- **Suggested Prompts:** Quick starter cards for coding, writing, research, mathematics, translations, and education.

### 2. Online Mode 🌐 (Cloud Intelligence)
- Connects securely through backend server routes (`/api/chat/online`) to **Google Gemini** models:
  - `gemini-1.5-flash` (Default, Ultra Fast & Multimodal)
  - `gemini-2.0-flash-exp` (Next-generation high performance)
  - `gemini-1.5-pro` (Deep reasoning & complex documents)
- **Web Search Grounding:** Real-time internet access with clickable citations and sources.
- **Multilingual Excellence:** Fluent in English, Hindi, Urdu, Spanish, French, German, Arabic, Chinese, and more.
- **Streaming Responses:** High-speed token-by-token streaming using Server-Sent Events (SSE).
- **Secure Architecture:** API keys are never exposed in browser bundles.

### 3. Offline Mode 💻 (100% On-Device & Private)
- **Real Local Inference:** Communicates directly with locally installed **Ollama** models.
- **Zero Internet Requirement:** Once models are pulled, operates fully detached from the web.
- **Automatic Health & Model Detection:** Checks Ollama availability at `http://localhost:11434` and lists installed models (e.g. `llama3.2`, `mistral`, `phi3`, `gemma2`).
- **Interactive Diagnostics:** If Ollama is offline or has no models, displays an interactive card with exact copy-paste terminal commands.
- **Strict Privacy Guarantee:** Offline conversations never leave your computer.

### 4. Intelligent Chat Features
- **Multi-turn Context:** Remembers context across the conversation.
- **Code Highlighting:** Syntax highlighted code blocks with language badges and one-click "Copy Code".
- **File & Image Attachments:** Upload images for vision models or attach text/code/documents.
- **Voice Capabilities:**
  - 🎙️ Speech-to-Text microphone input with real-time waveform indicator.
  - 🔊 Text-to-Speech answer reading with play/stop controls.
- **Message Management:** Edit and resend previous messages, regenerate responses, copy message text.
- **Export Options:** One-click export to Markdown (`.md`) or Plain Text (`.txt`).
- **Client Storage:** IndexedDB with LocalStorage fallback for persistent local privacy.

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js:** v18.0.0 or later (v20+ recommended)
- **npm** or **pnpm**
- *(Optional for Offline Mode)*: [Ollama](https://ollama.com/download)

---

### Step 1: Clone or Navigate to the Workspace
```bash
cd "c:\Users\LENOVO\Desktop\chat ai"
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy the template file:
```bash
cp .env.example .env.local
```

Edit `.env.local` to add your free Google Gemini API Key:
```env
# Get your free key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# Local Ollama endpoint (default: http://localhost:11434)
OLLAMA_ENDPOINT=http://localhost:11434
```
*(Note: You can also enter or update your API Key anytime directly inside the CHAT AI Settings dialog in the browser!)*

---

### Step 4: Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

### Step 5: (Optional) Setup Offline Mode with Ollama
To chat 100% offline without internet:

1. Download and install Ollama from [ollama.com/download](https://ollama.com/download).
2. Open your terminal and pull a lightweight model:
   ```bash
   ollama run llama3.2
   ```
   *(Alternative models: `ollama run mistral` or `ollama run phi3:mini`)*
3. In CHAT AI, switch to **[ OFFLINE MODE 💻 ]** at the top. The app will automatically detect your installed models!

---

## 🏗️ Project Architecture

```
chat-ai/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/online/route.ts   # Secure Gemini Cloud streaming proxy
│   │   │   ├── health/route.ts        # Server status & key check
│   │   │   ├── ollama/chat/route.ts   # Local Ollama NDJSON to SSE streamer
│   │   │   └── ollama/status/route.ts # Ollama connection & model inspector
│   │   ├── globals.css                # Tailwind, themes & highlight styles
│   │   ├── layout.tsx                 # Root layout with responsive viewport
│   │   └── page.tsx                   # Main dual-mode chat application
│   ├── components/
│   │   ├── ChatInput.tsx              # Input box, attachments & voice STT
│   │   ├── ChatMessage.tsx            # Markdown, code blocks, citations & TTS
│   │   ├── Header.tsx                 # Mode switcher, model dropdown & theme
│   │   ├── HelpModal.tsx              # Quick guide & keyboard shortcuts
│   │   ├── OfflineDiagnostics.tsx     # Ollama troubleshooting card
│   │   ├── SettingsModal.tsx          # API keys, voice, temperature & storage
│   │   ├── Sidebar.tsx                # Chat history, search, pin & export
│   │   └── WelcomeScreen.tsx          # ChatGPT/Gemini style welcome & prompt cards
│   ├── lib/
│   │   ├── speech.ts                  # Web Speech API (STT & TTS)
│   │   └── storage.ts                 # IndexedDB / LocalStorage service
│   └── types/
│       └── chat.ts                    # TypeScript types and definitions
├── .env.example                       # Example environment file
├── .env.local                         # Local environment configuration
├── next.config.mjs                    # Next.js configuration
├── package.json                       # Dependencies & scripts
├── tailwind.config.ts                 # Tailwind configuration
└── tsconfig.json                      # TypeScript configuration
```

---

## 🔒 Security & Privacy

1. **Zero Secret Exposure:** Your `GEMINI_API_KEY` is processed strictly server-side by Next.js API routes.
2. **Offline Isolation:** In Offline Mode, prompts and messages are processed locally via Ollama. No data is transmitted to the cloud.
3. **Local Database:** Chat histories and uploaded attachments are saved directly to your browser's IndexedDB on your local device.

---

## 📜 License
MIT License. Free for personal and commercial use.

