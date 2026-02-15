export type BudgetAction = "login" | "create_board" | "join_board" | "add_item" | "get_board";

export interface ItemRecord {
  id: number;
  item_name: string;
  target_price: number;
  market_price: number | null;
  savings_daily: number | null;
  savings_weekly: number | null;
  start_date: string | null;
  end_date: string | null;
  alternatives: Array<{ name: string; estimated_price: number | null }>;
  added_by: string;
  created_at: string;
}

export interface BoardResponse {
  ok: boolean;
  error?: string;
  details?: unknown;
  message?: string;
  user?: {
    id?: number;
    username: string;
  };
  board?: {
    id: number;
    board_code: string;
    name: string;
  };
  items?: ItemRecord[];
}
