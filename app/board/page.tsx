"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BoardResponse, ItemRecord } from "@/lib/types";
import { callBoardApi } from "@/lib/client-api";

const AUTH_KEY = "budget-tracker-auth";

type AuthState = {
  username: string;
  pin: string;
};

type BoardSummary = {
  code: string;
  name: string;
};

const loadAuth = (): AuthState | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthState;
    if (!parsed?.username || !parsed?.pin) return null;
    return parsed;
  } catch {
    return null;
  }
};

const loadBoardSummary = (): BoardSummary | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem("budget-tracker-board");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as BoardSummary;
    if (!parsed?.code) return null;
    return parsed;
  } catch {
    return null;
  }
};

const saveBoardSummary = (summary: BoardSummary) => {
  sessionStorage.setItem("budget-tracker-board", JSON.stringify(summary));
};

const clearBoardSummary = () => {
  sessionStorage.removeItem("budget-tracker-board");
};

const formatPrice = (value: number | null) => {
  if (value === null || Number.isNaN(value)) return "n/a";
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(value);
};

const formatDate = (value: string | null) => (value ? value : "n/a");

export default function BoardPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<AuthState | null>(null);

  const [boardCode, setBoardCode] = useState("");
  const [boardName, setBoardName] = useState("My Savings Board");
  const [boardLabel, setBoardLabel] = useState("No board selected");
  const [items, setItems] = useState<ItemRecord[]>([]);

  const [itemName, setItemName] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisRunning, setAnalysisRunning] = useState<number | null>(null);

  useEffect(() => {
    const existing = loadAuth();
    if (!existing) {
      router.replace("/login");
      return;
    }
    setAuth(existing);
  }, [router]);

  useEffect(() => {
    const existingBoard = loadBoardSummary();
    if (existingBoard) {
      setBoardCode(existingBoard.code);
      if (existingBoard.name) {
        setBoardName(existingBoard.name);
        setBoardLabel(`${existingBoard.name} (${existingBoard.code})`);
      }
    }
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3500);
    return () => clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

  const syncBoardState = (data: BoardResponse) => {
    if (data.board?.board_code) {
      setBoardCode(data.board.board_code);
      const label = `${data.board.name} (${data.board.board_code})`;
      setBoardLabel(label);
      saveBoardSummary({ code: data.board.board_code, name: data.board.name });
    }
    setItems(data.items ?? []);
    if (data.message) {
      setMessage(data.message);
    }
  };

  const requireAuth = () => {
    if (!auth) {
      setError("Login first.");
      return false;
    }
    return true;
  };

  const logout = () => {
    sessionStorage.removeItem(AUTH_KEY);
    clearBoardSummary();
    router.replace("/login");
  };

  const createBoard = async () => {
    if (!requireAuth()) return;
    clearFeedback();
    setLoading(true);

    try {
      const data = await callBoardApi({
        action: "create_board",
        username: auth?.username ?? "",
        pin: auth?.pin ?? "",
        board_name: boardName,
      });
      syncBoardState(data);
      setMessage(`Board ready. Share code: ${data.board?.board_code ?? boardCode}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const joinBoard = async () => {
    if (!requireAuth()) return;
    clearFeedback();
    setLoading(true);

    try {
      const data = await callBoardApi({
        action: "join_board",
        username: auth?.username ?? "",
        pin: auth?.pin ?? "",
        board_code: boardCode,
      });
      syncBoardState(data);
      setMessage("Joined board.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const refreshBoard = async () => {
    if (!requireAuth()) return;
    clearFeedback();
    setLoading(true);

    try {
      const data = await callBoardApi({
        action: "get_board",
        username: auth?.username ?? "",
        pin: auth?.pin ?? "",
        board_code: boardCode,
      });
      syncBoardState(data);
      setMessage("Board refreshed.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const addItem = async () => {
    if (!requireAuth()) return;
    clearFeedback();
    setLoading(true);

    try {
      const data = await callBoardApi({
        action: "add_item",
        username: auth?.username ?? "",
        pin: auth?.pin ?? "",
        board_code: boardCode,
        item_name: itemName,
        target_price: Number(targetPrice),
        start_date: startDate,
        end_date: endDate,
      });

      if (data.board || data.items) {
        syncBoardState(data);
      } else {
        const refreshed = await callBoardApi({
          action: "get_board",
          username: auth?.username ?? "",
          pin: auth?.pin ?? "",
          board_code: boardCode,
        });
        syncBoardState(refreshed);
      }

      setMessage("Item added. Run analysis for recommendations.");
      setItemName("");
      setTargetPrice("");
      setStartDate("");
      setEndDate("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async (item: ItemRecord) => {
    if (!requireAuth()) return;
    if (!boardCode) {
      setError("Select a board first.");
      return;
    }
    const analysisStart = item.start_date ?? startDate;
    const analysisEnd = item.end_date ?? endDate;
    if (!analysisStart || !analysisEnd) {
      setError("Add start/end dates before running analysis.");
      return;
    }
    clearFeedback();
    setAnalysisRunning(item.id);

    try {
      const data = await callBoardApi({
        action: "analyze_item",
        username: auth?.username ?? "",
        pin: auth?.pin ?? "",
        board_code: boardCode,
        item_id: item.id,
        item_name: item.item_name,
        target_price: item.target_price,
        start_date: analysisStart,
        end_date: analysisEnd,
      });

      syncBoardState(data);
      setMessage("AI analysis updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setAnalysisRunning(null);
    }
  };

  const totals = useMemo(() => {
    const targetTotal = items.reduce((sum, item) => sum + item.target_price, 0);
    const marketTotal = items.reduce((sum, item) => sum + (item.market_price ?? 0), 0);
    return { targetTotal, marketTotal };
  }, [items]);

  return (
    <main>
      <h1>Board</h1>
      <p>Manage shared boards, add items, and run AI insights when you need them.</p>

      <div className="toolbar">
        <div>
          <p className="meta">Signed in as {auth?.username ?? ""}</p>
          <p className="meta">Active board: {boardLabel}</p>
        </div>
        <button className="secondary" onClick={logout}>
          Logout
        </button>
      </div>

      {message ? <div className="message">{message}</div> : null}
      {error ? <div className="message error">{error}</div> : null}

      <div className="grid">
        <section className="card">
          <h2>Board Access</h2>
          <label htmlFor="board-name">Board Name (create)</label>
          <input
            id="board-name"
            value={boardName}
            onChange={(event) => setBoardName(event.target.value)}
            disabled={loading}
          />

          <button disabled={loading || !boardName} onClick={createBoard}>
            Create Board
          </button>

          <label htmlFor="board-code" style={{ marginTop: 12 }}>
            Board Code
          </label>
          <input
            id="board-code"
            placeholder="Share or enter code"
            value={boardCode}
            onChange={(event) => setBoardCode(event.target.value.toUpperCase())}
            disabled={loading}
          />

          <button
            className="secondary"
            disabled={loading || !boardCode}
            onClick={joinBoard}
          >
            Join Board
          </button>

          <button
            style={{ marginTop: 10 }}
            disabled={loading || !boardCode}
            onClick={refreshBoard}
          >
            Refresh Board
          </button>
        </section>

        <section className="card">
          <h2>Board Overview</h2>
          <p className="meta">Total target: {formatPrice(totals.targetTotal)}</p>
          <p className="meta">Total market: {formatPrice(totals.marketTotal)}</p>
          <p className="meta">Items tracked: {items.length}</p>
          <p className="meta">Last refresh keeps everything synced.</p>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Add Item</h2>
        <p className="meta">Add the item first, then run AI analysis on demand.</p>

        <label htmlFor="item-name">Item Name</label>
        <input
          id="item-name"
          placeholder="Sony camera"
          value={itemName}
          onChange={(event) => setItemName(event.target.value)}
          disabled={loading}
        />

        <label htmlFor="target-price">Target Price</label>
        <input
          id="target-price"
          type="number"
          min="1"
          value={targetPrice}
          onChange={(event) => setTargetPrice(event.target.value)}
          disabled={loading}
        />

        <label htmlFor="start-date">Start Date</label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          disabled={loading}
        />

        <label htmlFor="end-date">End Date</label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          disabled={loading}
        />

        <button
          disabled={
            loading ||
            !boardCode ||
            !itemName ||
            Number(targetPrice) <= 0 ||
            !startDate ||
            !endDate
          }
          onClick={addItem}
        >
          Add Item
        </button>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Items</h2>
        {!items.length ? <p className="meta">No items yet.</p> : null}

        <div className="items">
          {items.map((item) => (
            <article key={item.id} className="item">
              <div className="item-header">
                <strong>{item.item_name}</strong>
                <button
                  className="ghost"
                  disabled={analysisRunning === item.id || loading}
                  onClick={() => runAnalysis(item)}
                >
                  {analysisRunning === item.id ? "Running AI..." : "Run AI Analysis"}
                </button>
              </div>
              <p className="meta">
                Target: {formatPrice(item.target_price)} | Market: {formatPrice(item.market_price)}
              </p>
              <p className="meta">
                Save/day: {formatPrice(item.savings_daily)} | Save/week: {formatPrice(item.savings_weekly)}
              </p>
              <p className="meta">Added by: {item.added_by}</p>
              <p className="meta">
                Start: {formatDate(item.start_date)} | End: {formatDate(item.end_date)}
              </p>
              {item.alternatives?.length ? (
                <p className="meta">
                  Alternatives:{" "}
                  {item.alternatives
                    .map((alt) =>
                      `${alt.name}${alt.estimated_price ? ` (${formatPrice(alt.estimated_price)})` : ""}`
                    )
                    .join(", ")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
