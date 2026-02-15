"use client";

import { useState } from "react";
import type { BoardResponse, ItemRecord } from "@/lib/types";

interface ApiPayload {
  action: "create_board" | "join_board" | "add_item" | "get_board";
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
    const details =
      typeof (data as { details?: unknown }).details === "string"
        ? (data as { details?: string }).details
        : undefined;
    throw new Error(
      `${data.error ?? `Request failed (${response.status})`}${details ? ` - ${details}` : ""}`,
    );
  }

  return data;
}

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [boardCode, setBoardCode] = useState("");
  const [boardName, setBoardName] = useState("My Savings Board");
  const [itemName, setItemName] = useState("");
  const [targetPrice, setTargetPrice] = useState("0");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [items, setItems] = useState<ItemRecord[]>([]);
  const [boardLabel, setBoardLabel] = useState("No board selected");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

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

  const createBoard = async () => {
    clearFeedback();
    setLoading(true);

    try {
      const data = await callApi({
        action: "create_board",
        username,
        pin,
        board_name: boardName,
      });
      syncBoardState(data);
      setMessage(`Board ready. Share code: ${data.board?.board_code}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const joinBoard = async () => {
    clearFeedback();
    setLoading(true);

    try {
      const data = await callApi({
        action: "join_board",
        username,
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
    clearFeedback();
    setLoading(true);

    try {
      const data = await callApi({
        action: "get_board",
        username,
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
    clearFeedback();
    setLoading(true);

    try {
      const data = await callApi({
        action: "add_item",
        username,
        pin,
        board_code: boardCode,
        item_name: itemName,
        target_price: Number(targetPrice),
        start_date: startDate,
        end_date: endDate,
      });
      syncBoardState(data);
      setMessage("Item added.");
      setItemName("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>Collaborative Budget Tracker</h1>
      <p>
        Keep a shared savings board with username/PIN, timeline math, and AI price
        alternatives from n8n.
      </p>

      {message ? <div className="message">{message}</div> : null}
      {error ? <div className="message error">{error}</div> : null}

      <div className="grid">
        <section className="card">
          <h2>Access</h2>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            placeholder="e.g. len"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />

          <label htmlFor="pin">PIN</label>
          <input
            id="pin"
            type="password"
            placeholder="4-6 digits"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
          />

          <label htmlFor="board-name">Board Name (create only)</label>
          <input
            id="board-name"
            value={boardName}
            onChange={(event) => setBoardName(event.target.value)}
          />

          <button disabled={loading || !username || !pin} onClick={createBoard}>
            Create Board
          </button>

          <label htmlFor="board-code" style={{ marginTop: 12 }}>
            Board Code
          </label>
          <input
            id="board-code"
            placeholder="Share this code"
            value={boardCode}
            onChange={(event) => setBoardCode(event.target.value.toUpperCase())}
          />

          <button
            className="secondary"
            disabled={loading || !boardCode || !username || !pin}
            onClick={joinBoard}
          >
            Join Board
          </button>
          <button
            style={{ marginTop: 10 }}
            disabled={loading || !boardCode || !username || !pin}
            onClick={refreshBoard}
          >
            Refresh Board
          </button>
        </section>

        <section className="card">
          <h2>Add Item</h2>
          <p className="meta">Board: {boardLabel}</p>

          <label htmlFor="item-name">Item Name</label>
          <input
            id="item-name"
            placeholder="Sony camera"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
          />

          <label htmlFor="target-price">Target Price</label>
          <input
            id="target-price"
            type="number"
            min="1"
            value={targetPrice}
            onChange={(event) => setTargetPrice(event.target.value)}
          />

          <label htmlFor="start-date">Start Date</label>
          <input
            id="start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />

          <label htmlFor="end-date">End Date</label>
          <input
            id="end-date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />

          <button
            disabled={
              loading ||
              !boardCode ||
              !username ||
              !pin ||
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
      </div>

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
              <p className="meta">By: {item.added_by}</p>
              {item.alternatives?.length ? (
                <p className="meta">
                  Alternatives: {item.alternatives.map((alt) => alt.name).join(", ")}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
