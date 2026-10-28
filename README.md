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

## 📦 Vercel Deployment & Fixing 404 Errors

To deploy this chatbot seamlessly to Vercel:

1. **Push your code to GitHub / GitLab**.
2. **Import Project to Vercel**:
   - Framework Preset: **Vite**
   - Root Directory: `./`
3. **Add Environment Variable in Vercel**:
   - Open your project on Vercel -> **Settings** -> **Environment Variables**.
   - Key: `GEMINI_API_KEY`
   - Value: Your key from [Google AI Studio](https://aistudio.google.com/apikey)
   - Environments: Production, Preview, Development.
4. **Automatic Serverless Function Routing**:
   - The included `vercel.json` configures Serverless Functions in `api/chat.ts` and routes all non-API paths to `index.html`:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "rewrites": [
       {
         "source": "/((?!api).*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
5. **If you see "Server returned error status 404" on Vercel**:
   - Commit & push the updated `vercel.json` and `api/chat.ts`.
   - Go to Vercel Dashboard -> **Deployments** -> click the three dots (`...`) -> **Redeploy**.
   - OR simply click the **Settings icon (⚙️)** in the chatbot top-right corner to paste your free Gemini API key directly!

---

## 🛡️ License
Apache-2.0
