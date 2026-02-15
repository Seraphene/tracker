# Budget Tracker

Budget Tracker helps individuals or small groups plan purchases, track savings goals, and make better buying decisions with AI-assisted market insights.

It combines:
- A Next.js web app for user interaction
- An n8n workflow for orchestration
- PostgreSQL for persistent data (users, boards, items)

## Purpose

This project is designed to answer three practical questions:
1. **What do I want to buy, and how much do I need?**
2. **How quickly can I save for it?**
3. **Is this a good time to buy, or are there better alternatives?**

The app supports collaborative boards so friends/family can share savings plans and item tracking in one place.

## Core Features

- **PIN-based login** using username + PIN
- **Shared boards** to organize savings targets
- **Board membership** (create, join, list, refresh)
- **Item tracking** with target price and savings timeline
- **Automatic AI analysis on add**:
  - Serper web search for market context
  - Gemini-powered reasoning for market price estimate, alternatives, and recommendation
- **Manual re-analysis** per item to refresh recommendations
- **Price validation and safe DB handling** (`target_price > 0`)

## How It Works (End-to-End)

### 1) User actions (frontend)
The frontend sends requests to `POST /api/board` with an `action` payload.

### 2) API relay (Next.js route)
`app/api/board/route.ts` validates payloads with Zod, then forwards to the n8n webhook.

### 3) Workflow execution (n8n)
The workflow in `n8n/workflows/budget_tracker_ai_agent.json` routes by action:

- `login` → authenticate or create user
- `create_board` → create board + owner membership
- `join_board` → join existing board
- `list_boards` → fetch all boards for the authenticated user
- `get_board` → fetch board + items
- `add_item` → **Serper Search → Build AI Prompt → AI Agent (Gemini) → Merge & Format → PG Add Item**
- `analyze_item` → same AI path, then item update

### 4) Response formatting
Results are normalized by `Format Common` and returned to the frontend as JSON.

## API Actions (`POST /api/board`)

All actions require:

```json
{
  "username": "andrei",
  "pin": "1234"
}
```

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

### `list_boards`

```json
{
  "action": "list_boards",
  "username": "andrei",
  "pin": "1234"
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

### `analyze_item`

```json
{
  "action": "analyze_item",
  "username": "andrei",
  "pin": "1234",
  "board_code": "BD123ABC",
  "item_id": 12,
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

## Environment Variables

Set these in your frontend host (for example, Vercel):

- `N8N_WEBHOOK_URL` (preferred)
- `N8N_WEBHOOK_SECRET`
- `NEXT_PUBLIC_API_URL` (optional fallback)

Example:

```env
N8N_WEBHOOK_URL=http://YOUR_N8N_HOST/webhook/budget_tracker
NEXT_PUBLIC_API_URL=http://YOUR_N8N_HOST/webhook/budget_tracker
N8N_WEBHOOK_SECRET=replace-me
```

Set these in your n8n environment:

- `SERPER_API_KEY`
- Gemini credential in n8n (`Google Gemini(PaLM) Api account`)

## n8n Setup

1. Import workflow: `n8n/workflows/budget_tracker_ai_agent.json`
2. Attach Postgres credentials to all Postgres nodes
3. Configure webhook secret header check:
   - Header name: `x-webhook-secret`
   - Value: same as `N8N_WEBHOOK_SECRET`
4. Ensure Serper and Gemini credentials are configured
5. Activate the workflow

## Local Development

```powershell
npm install
npm run dev
```

Health check:
- `GET http://localhost:3000/api/board`

## Notes

- The `items.target_price` column uses a database check constraint: `target_price > 0`.
- Frontend and workflow both validate price so invalid values fail with clear errors.
- Add Item returns updated board/items payload, so UI can update immediately without a second fetch.
