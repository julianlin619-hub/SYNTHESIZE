# SYNTHESIZE

YouTube video summarizer. Paste a link, get an AI-powered summary streamed in real-time.

## Stack

- **Frontend:** React 18, Vite, Tailwind CSS, Framer Motion
- **Backend:** Express.js, Anthropic Claude API, SupaData API
- **Streaming:** Server-Sent Events (SSE)

## Setup

### 1. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Add your API keys to `server/.env`:
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
- `SUPADATA_API_KEY` — from [supadata.ai](https://supadata.ai)

### 3. Run locally

In two terminals:

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Deployment (Render)

**Backend** — Web Service:
- Build command: `cd server && npm install`
- Start command: `cd server && npm start`
- Set `ANTHROPIC_API_KEY` and `SUPADATA_API_KEY` env vars

**Frontend** — Static Site:
- Build command: `cd client && npm install && npm run build`
- Publish directory: `client/dist`
- Set `VITE_API_URL` env var to your backend URL if needed
