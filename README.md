# SplitSnap

> Scan the bill. Tap what you ate. Pay your share.

Week 1 MVP: upload a receipt, OCR with Tesseract, parse with OpenRouter, review and edit extracted items.

## Stack

- **Frontend:** React, TypeScript, Tailwind, Vite
- **Backend:** Express, MongoDB, Tesseract OCR, OpenRouter
- **Images:** Local temp storage, auto-deleted after 30 minutes (or immediately on success)

## Prerequisites

- Node.js 20+
- pnpm
- Docker Desktop (for MongoDB)
- Tesseract OCR installed (`tesseract --version`)

## Setup

```bash
# Install dependencies
pnpm install

# Start MongoDB
docker compose up -d

# Configure backend
cp backend/.env.example backend/.env
# Add your OPENROUTER_API_KEY to backend/.env

# Build shared package
pnpm --filter shared build

# Run dev servers (backend + frontend)
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## API

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/bills/upload` | Upload receipt image |
| GET | `/bills/:id` | Get bill with items |
| GET | `/bills/:id/status` | Poll processing status |
| PATCH | `/bills/:id` | Edit bill metadata |
| POST | `/bills/:id/items` | Add item |
| PATCH | `/bills/:id/items/:itemId` | Edit item |
| DELETE | `/bills/:id/items/:itemId` | Remove item |
| POST | `/bills/:id/retry` | Retry OCR/parse |

## Environment Variables

See `backend/.env.example`.

- `OPENROUTER_API_KEY` — optional; without it, a basic rule-based parser is used
- `TESSERACT_PATH` — path to tesseract.exe on Windows
- `TEMP_FILE_TTL_MS` — temp image retention (default 30 min)

## Week 2 (coming)

- Auth (guest + Google)
- Room creation, QR join
- Attach bill to room
