"use client";

import { useEffect, useState } from "react";
import type { BoardResponse, ItemRecord } from "@/lib/types";

interface ApiPayload {
  action: "login" | "create_board" | "join_board" | "add_item" | "get_board";
  username: string;
  pin: string;
  board_code?: string;
  board_name?: string;
  item_name?: string;
  target_price?: number;
  start_date?: string;
  end_date?: string;
}

async function callApi(payload: ApiPayload): Promise<BoardResponse> {
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

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [loggedInUser, setLoggedInUser] = useState<string | null>(null);

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

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

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

  const syncBoardState = (data: BoardResponse) => {
    if (data.board?.board_code) {
      setBoardCode(data.board.board_code);
      setBoardLabel(`${data.board.name} (${data.board.board_code})`);
    }
    setItems(data.items ?? []);
    if (data.message) {
      setMessage(data.message);
    }
  };

  const requireAuth = () => {
    if (!loggedInUser) {
      setError("Login first.");
      return false;
    }
    return true;
  };

  const login = async () => {
    clearFeedback();
    setLoading(true);

    try {
      const data = await callApi({ action: "login", username, pin });
      setLoggedInUser(data.user?.username ?? username);
      setMessage(`Logged in as ${data.user?.username ?? username}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setLoggedInUser(null);
    setBoardCode("");
    setBoardLabel("No board selected");
    setItems([]);
    setItemName("");
    setTargetPrice("");
    setStartDate("");
    setEndDate("");
    clearFeedback();
  };

  const createBoard = async () => {
    if (!requireAuth()) return;
    clearFeedback();
    setLoading(true);

    try {
      const data = await callApi({
        action: "create_board",
        username: loggedInUser ?? username,
        pin,
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
      const data = await callApi({
        action: "join_board",
        username: loggedInUser ?? username,
        pin,
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
      const data = await callApi({
        action: "get_board",
        username: loggedInUser ?? username,
        pin,
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
      const data = await callApi({
        action: "add_item",
        username: loggedInUser ?? username,
        pin,
        board_code: boardCode,
        item_name: itemName,
        target_price: Number(targetPrice),
        start_date: startDate,
        end_date: endDate,
      });

      if (data.board || data.items) {
        syncBoardState(data);
      } else {
        const refreshed = await callApi({
          action: "get_board",
          username: loggedInUser ?? username,
          pin,
          board_code: boardCode,
        });
        syncBoardState(refreshed);
      }

      setMessage("Item added.");
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

  return (
    <main>
      <h1>Collaborative Budget Tracker</h1>
      <p>Login, manage shared boards, add items, and view AI-based recommendations.</p>

      {message ? <div className="message">{message}</div> : null}
      {error ? <div className="message error">{error}</div> : null}

      <div className="grid">
        <section className="card">
          <h2>Login</h2>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            placeholder="e.g. andrei"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={loading || Boolean(loggedInUser)}
          />

          <label htmlFor="pin">PIN</label>
          <input
            id="pin"
            type="password"
            placeholder="4-6 digits"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            disabled={loading || Boolean(loggedInUser)}
          />

          {!loggedInUser ? (
            <button disabled={loading || !username || !pin} onClick={login}>
              Login
            </button>
          ) : (
            <>
              <p className="meta">Logged in as: {loggedInUser}</p>
              <button className="secondary" disabled={loading} onClick={logout}>
                Logout
              </button>
            </>
          )}
        </section>

        <section className="card">
          <h2>Board Access</h2>
          <label htmlFor="board-name">Board Name (create)</label>
          <input
            id="board-name"
            value={boardName}
            onChange={(event) => setBoardName(event.target.value)}
            disabled={!loggedInUser || loading}
          />

          <button disabled={!loggedInUser || loading || !boardName} onClick={createBoard}>
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
            disabled={!loggedInUser || loading}
          />

          <button
            className="secondary"
            disabled={!loggedInUser || loading || !boardCode}
            onClick={joinBoard}
          >
            Join Board
          </button>

          <button
            style={{ marginTop: 10 }}
            disabled={!loggedInUser || loading || !boardCode}
            onClick={refreshBoard}
          >
            Refresh Board
          </button>
        </section>
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Current Board</h2>
        <p className="meta">{boardLabel}</p>
        <p className="meta">Code: {boardCode || "Not selected yet"}</p>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Add Item</h2>
        <p className="meta">This triggers savings calculation + AI recommendations.</p>

        <label htmlFor="item-name">Item Name</label>
        <input
          id="item-name"
          placeholder="Sony camera"
          value={itemName}
          onChange={(event) => setItemName(event.target.value)}
          disabled={!loggedInUser || loading}
        />

        <label htmlFor="target-price">Target Price</label>
        <input
          id="target-price"
          type="number"
          min="1"
          value={targetPrice}
          onChange={(event) => setTargetPrice(event.target.value)}
          disabled={!loggedInUser || loading}
        />

        <label htmlFor="start-date">Start Date</label>
        <input
          id="start-date"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          disabled={!loggedInUser || loading}
        />

        <label htmlFor="end-date">End Date</label>
        <input
          id="end-date"
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          disabled={!loggedInUser || loading}
        />

        <button
          disabled={
            !loggedInUser ||
            loading ||
            !boardCode ||
            !itemName ||
            Number(targetPrice) <= 0 ||
            !startDate ||
            !endDate
          }
          onClick={addItem}
        >
          Add Item + Run AI
        </button>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Items</h2>
        {!items.length ? <p className="meta">No items yet.</p> : null}

        <div className="items">
          {items.map((item) => (
            <article key={item.id} className="item">
              <strong>{item.item_name}</strong>
              <p className="meta">
                Target: {item.target_price} | Market: {item.market_price ?? "n/a"}
              </p>
              <p className="meta">
                Save/day: {item.savings_daily ?? "n/a"} | Save/week: {item.savings_weekly ?? "n/a"}
              </p>
              <p className="meta">Added by: {item.added_by}</p>
              {item.alternatives?.length ? (
                <p className="meta">
                  Alternatives:{" "}
                  {item.alternatives
                    .map((alt) => `${alt.name}${alt.estimated_price ? ` (${alt.estimated_price})` : ""}`)
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
