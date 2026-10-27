# ⚡ Simple & Fast Gemini AI Chatbot

A modern, lightweight, high-performance conversational AI chatbot built with **React / Next.js architecture**, **Tailwind CSS**, and the official **Google Gemini API** (`@google/genai`).

Featuring real-time token streaming, complete multi-turn conversation CRUD with persistent `localStorage` synchronization, mobile-first responsive design, and server-side secret isolation.

---

## 🌟 Key Features

1. **Real-time Streaming Responses**: Consume chunked tokens directly via Server-Sent Events / Web Streams for instantaneous sub-second response times.
2. **Complete Conversation CRUD**:
   - **Create**: Instant new session creation (`⌘K` / `Ctrl+K`), automatic title generation from first prompt.
   - **Read**: Browse organized history categorized into *Today*, *Yesterday*, and *Previous 7 Days*.
   - **Update**: Rename chat titles and edit prior user prompts in-place with instant regeneration.
   - **Delete**: Remove individual chat threads or execute a clean reset with confirmation.
3. **Robust Local Persistence**: Conversations stay in your browser's `localStorage` across page reloads and browser restarts.
4. **Zero-Leak API Security**: All `@google/genai` calls run on the server. Your `GEMINI_API_KEY` is never bundled into client JavaScript.
5. **Configurable Free-Tier Models**:
   - `gemini-3.8-flash` (Recommended default: blazing fast, balanced reasoning)
   - `gemini-3.1-flash-lite` (Ultra-low latency)
   - `gemini-flash-latest` (Stable multi-turn chat)
6. **Polished User Experience**:
   - Keyboard shortcuts (`Enter` to send, `Shift + Enter` for new lines, `⌘K` for new chat).
   - Code syntax highlighting with one-click code copy.
   - Speech synthesis (text-to-speech) and speech recognition (voice input).
   - Google Grounding search toggle.
   - Error handling for API rate limits (`429`) with clear feedback.

---

## 🚀 Quickstart & Local Setup

### 1. Obtain a Free Gemini API Key
1. Navigate to [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Sign in with your Google account.
3. Click **"Create API key"** and copy your generated key.

### 2. Configure Environment Variables
Copy `.env.local.example` to `.env.local`:
```bash
cp .env.local.example .env.local
```
Add your key inside `.env.local`:
```env
GEMINI_API_KEY="AIzaSyYourGeneratedSecretKeyHere"
GEMINI_MODEL="gemini-3.8-flash"
PORT=3000
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Next.js 14 App Router Deployment

If deploying directly to Next.js 14 App Router:
- The streaming route handler is located at `src/app/api/chat/route.ts`.
- Set `GEMINI_API_KEY` in Vercel project environment settings.
- Do NOT prepend `NEXT_PUBLIC_` to prevent exposing your secret key.

---

## 🛡️ License
Apache-2.0
