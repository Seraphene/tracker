<<<<<<< HEAD
# budget-tracker
Agentic AI powered budget tracker.
=======
﻿# Budget Tracker (Next.js + n8n + Postgres)

This repository now includes a working starter for your planned architecture:

- Next.js frontend (Vercel-ready) that calls one API route.
- API route that forwards actions to n8n webhook.
- Postgres schema for users/PIN, shared boards, board members, and items.
- Importable n8n workflow JSON for create/join/get/add item flows.
- Docker Compose for local n8n + Postgres.

## File map

- `app/page.tsx`: collaborative UI (create board, join board, add item, fetch board).
- `app/api/board/route.ts`: backend proxy from Next.js to n8n webhook.
- `db/schema.sql`: database schema.
- `infra/docker-compose.yml`: local n8n + Postgres stack.
- `n8n/workflows/budget_tracker-main.json`: n8n workflow export JSON.
- `.env.example`: environment variables for frontend.

## Quick start

1. Start infrastructure:

```powershell
cd infra
docker compose up -d
```

2. In n8n UI (`http://localhost:5678`), create Postgres credentials:
   - Host: `postgres`
   - DB: `budget`
   - User: `budget`
   - Password: `budget`

3. Import workflow:
   - Import `n8n/workflows/budget_tracker-main.json`
   - Assign Postgres credentials to all Postgres nodes
   - Activate the workflow

4. Configure frontend:

```powershell
cd ..
Copy-Item .env.example .env.local
npm install
npm run de
```

5. Open `http://localhost:3000`.

## API contract used by frontend

POST `/api/board`

Payload:

```json
{
  "action": "create_board | join_board | add_item | get_board",
  "username": "len",
  "pin": "1234",
  "board_code": "optional",
  "board_name": "optional",
  "item_name": "optional",
  "target_price": 12000,
  "start_date": "2026-02-16",
  "end_date": "2026-06-30"
}
```

## Important limitations and what you must do manually

1. I could not run live external AI/search APIs in this environment.
   - Current node `Calculate + AI Stub` generates placeholder market price and alternatives.
   - Replace this with real n8n AI Agent + Serper/SerpApi + Gemini/OpenAI nodes.

2. I could not verify your exact n8n version/node parameter compatibility.
   - If import shows parameter warnings, re-open each node and re-save it in your n8n UI.

3. Secrets and production hardening are still on you.
   - Change default n8n basic auth in `infra/docker-compose.yml`.
   - Use HTTPS and firewall/VPN for n8n in production.
   - Set a strong `N8N_WEBHOOK_SECRET` in both frontend env and n8n validation logic.

4. I did not run full end-to-end integration tests (Docker + n8n UI + credentials setup cannot be completed here).
   - After import, test each action from the UI: create board, join board, add item, refresh board.

## Suggested production next step

- Move Postgres from local container to Supabase and point n8n Postgres credentials to Supabase connection details.
>>>>>>> 77e62d8 (fixed)
