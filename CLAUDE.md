# SYNTHESIZE

YouTube video summarizer — paste a link, get an AI-powered summary streamed in real-time.

## Architecture

Monorepo with two packages:

- **`server/`** — Express.js API (ES modules, Node `--watch` for dev)
- **`client/`** — React 18 SPA via Vite, styled with Tailwind CSS + Framer Motion

The single API endpoint `POST /api/summarize` fetches a YouTube transcript from SupaData, then streams a Claude-generated summary back to the client via Server-Sent Events (SSE). The client reads the SSE stream and renders markdown incrementally.

## Development

```bash
# Install deps (run once)
cd server && npm install && cd ../client && npm install && cd ..

# Run both server + client concurrently
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173 (Vite proxies `/api` → backend)

## Environment Variables

Defined in `server/.env` (see `server/.env.example`):

- `ANTHROPIC_API_KEY` — Claude API key
- `SUPADATA_API_KEY` — SupaData transcript API key
- `PORT` — server port (default 3001)

**Never commit `.env` files or API keys.**

## Key Files

| File | Purpose |
|---|---|
| `server/index.js` | Express server, SSE streaming endpoint, Claude integration |
| `client/src/App.jsx` | Main app — URL input, SSE client, state management |
| `client/src/components/SummaryDisplay.jsx` | Markdown rendering + streaming cursor |
| `client/src/index.css` | Global styles, Tailwind base, summary typography |
| `client/tailwind.config.js` | Custom theme (cream/terracotta palette, dark mode) |
| `client/vite.config.js` | Vite config with `/api` proxy to backend |

## Conventions

- ES modules everywhere (`"type": "module"` in both package.json files)
- No TypeScript — plain JSX and JS
- Tailwind utility classes for styling; custom theme tokens in `tailwind.config.js`
- Dark mode via `class` strategy (toggled in `<html>`)
- Custom lightweight markdown-to-HTML renderer (no external markdown library)
- Anthropic SDK used with `.stream()` for real-time token streaming

## Deployment

Deployed on Render:
- **Backend** — Web Service: `cd server && npm install` / `cd server && npm start`
- **Frontend** — Static Site: `cd client && npm install && npm run build` → publish `client/dist`
- Set `VITE_API_URL` env var on frontend if backend URL differs from default
