# Budget Tracker

Next.js frontend on Vercel with n8n + Postgres backend.

## Architecture

- Frontend: Next.js (`app/page.tsx`)
- Frontend server API: `app/api/board/route.ts`
- Backend: n8n webhook + PostgreSQL on GCP VM

## Live backend endpoint

- Base URL: `http://35.222.181.63:5678`
- Webhook URL: `http://35.222.181.63:5678/webhook/budget_tracker`

## Environment variables

Set these in Vercel Project Settings -> Environment Variables:

- `NEXT_PUBLIC_API_URL` = `http://35.222.181.63:5678/webhook/budget_tracker`
- `N8N_WEBHOOK_SECRET` = your webhook secret

Local `.env.local` example:

```env
NEXT_PUBLIC_API_URL=http://35.222.181.63:5678/webhook/budget_tracker
N8N_WEBHOOK_SECRET=replace-me
```

## Request flow

1. Browser calls `POST /api/board`.
2. Next.js route validates action payload.
3. Next.js route forwards to `NEXT_PUBLIC_API_URL` with header:
   - `x-webhook-secret: ${process.env.N8N_WEBHOOK_SECRET}`
4. n8n returns JSON response to frontend.

This keeps the secret server-side and out of browser JavaScript.

## API contract

All requests are `POST /api/board` with JSON body:

### `create_board`
```json
{
  "action": "create_board",
  "username": "len",
  "pin": "1234",
  "board_name": "My Savings"
}
```

### `join_board`
```json
{
  "action": "join_board",
  "username": "len",
  "pin": "1234",
  "board_code": "BD123ABC"
}
```

### `add_item`
```json
{
  "action": "add_item",
  "username": "len",
  "pin": "1234",
  "board_code": "BD123ABC",
  "item_name": "Sony camera",
  "target_price": 12000,
  "start_date": "2026-02-16",
  "end_date": "2026-06-30"
}
```

### `get_board`
```json
{
  "action": "get_board",
  "username": "len",
  "pin": "1234",
  "board_code": "BD123ABC"
}
```

## n8n workflow

Import:

- `n8n/workflows/budget-tracker-main.json`

Then attach Postgres credentials to all Postgres nodes and activate the workflow.

## Local run

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Health check:

- `GET http://localhost:3000/api/board`
