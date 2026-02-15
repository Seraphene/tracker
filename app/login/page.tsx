"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { callBoardApi } from "@/lib/client-api";

const AUTH_KEY = "budget-tracker-auth";

type AuthState = {
  username: string;
  pin: string;
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

const saveAuth = (auth: AuthState) => {
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(auth));
};

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existing = loadAuth();
    if (existing) {
      router.replace("/board");
    }
  }, [router]);

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

  const login = async () => {
    clearFeedback();
    setLoading(true);

    try {
      const data = await callBoardApi({ action: "login", username, pin });
      const resolvedUsername = data.user?.username ?? username;
      saveAuth({ username: resolvedUsername, pin });
      setMessage(`Logged in as ${resolvedUsername}`);
      router.push("/board");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main>
      <h1>Login</h1>
      <p>Access your boards and start tracking shared savings goals.</p>

      {message ? <div className="message">{message}</div> : null}
      {error ? <div className="message error">{error}</div> : null}

      <section className="card">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          placeholder="e.g. andrei"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={loading}
        />

        <label htmlFor="pin">PIN</label>
        <input
          id="pin"
          type="password"
          placeholder="4-6 digits"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          disabled={loading}
        />

        <button disabled={loading || !username || !pin} onClick={login}>
          Login
        </button>
      </section>
    </main>
  );
}
