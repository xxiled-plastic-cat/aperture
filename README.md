# aperture

## Apps

- `frontend` (this root SvelteKit app)
- `backend` (`backend/` Node + Express API)

## Frontend setup

1. Copy `.env.example` to `.env`
2. Set `PUBLIC_API_BASE_URL` (for local dev, `http://localhost:8787`)
3. Run:

```bash
npm install
npm run dev
```

## Backend setup

1. Copy `backend/.env.example` to `backend/.env`
2. Fill backend secrets (`DATABASE_URL`, `ALPHA_API_KEY`, etc.)
3. Run:

```bash
cd backend
npm install
npm run dev
```

## API endpoints

- `GET /api/health` — service status and markets aggregation summary (`feedMode`, `meta`)
- `GET /api/markets` — canonical multi-venue market snapshot (frontend builds dashboard UI from this)
- `GET /api/markets/status/{alpha|polymarket|kalshi|limitless}` — per-venue connectivity