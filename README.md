# Budget Tracker

Next.js frontend (Vercel) + n8n webhook + Postgres backend.

## Architecture

- Login: username + PIN (`action: "login"`).
- Board creation: `action: "create_board"`.
- Board joining: `action: "join_board"`.
- Board refresh + items + item owner username: `action: "get_board"`.
- Item add + savings math + AI recommendations: `action: "add_item"`.

## Environment variables

Set these in Vercel:

- `N8N_WEBHOOK_URL` (preferred)
- `N8N_WEBHOOK_SECRET`
- `NEXT_PUBLIC_API_URL` (optional fallback)

Example:

```env
N8N_WEBHOOK_URL=http://35.222.181.63:5678/webhook/budget_tracker
NEXT_PUBLIC_API_URL=http://35.222.181.63:5678/webhook/budget_tracker
N8N_WEBHOOK_SECRET=replace-me
```

## API contract (`POST /api/board`)

### `login`
```json
{
  "action": "login",
  "username": "andrei",
  "pin": "1234"
}
```

### `create_board`
```json
{
  "action": "create_board",
  "username": "andrei",
  "pin": "1234",
  "board_name": "To save"
}
```

### `join_board`
```json
{
  "action": "join_board",
  "username": "andrei",
  "pin": "1234",
  "board_code": "BD123ABC"
}
```

### `add_item`
```json
{
  "action": "add_item",
  "username": "andrei",
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
  "username": "andrei",
  "pin": "1234",
  "board_code": "BD123ABC"
}
```

## n8n workflow file

Import:

- `n8n/workflows/budget-tracker-main.json`

Then:

1. Attach Postgres credentials to all Postgres nodes.
2. Set webhook auth header:
   - Name: `x-webhook-secret`
   - Value: same as `N8N_WEBHOOK_SECRET`.
3. Add `SERPER_API_KEY` and `GEMINI_API_KEY` envs in n8n (optional, workflow has fallback values when AI output is missing).
4. Activate workflow.

## Run locally

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Health:

- `GET http://localhost:3000/api/board`
