import type { BoardResponse, BudgetAction } from "@/lib/types";

export interface ApiPayload {
  action: BudgetAction;
  username: string;
  pin: string;
  board_code?: string;
  board_name?: string;
  item_id?: number;
  item_name?: string;
  target_price?: number;
  start_date?: string;
  end_date?: string;
}

export async function callBoardApi(payload: ApiPayload): Promise<BoardResponse> {
  const response = await fetch("/api/board", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();
  let data: BoardResponse;

  try {
    data = JSON.parse(raw) as BoardResponse;
  } catch {
    throw new Error(`Request failed (${response.status}): ${raw.slice(0, 240)}`);
  }

  if (!response.ok || !data.ok) {
    const details = typeof data.details === "string" ? data.details : undefined;
    throw new Error(
      `${data.error ?? `Request failed (${response.status})`}${details ? ` - ${details}` : ""}`,
    );
  }

  return data;
}
