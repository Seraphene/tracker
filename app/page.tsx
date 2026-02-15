"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const AUTH_KEY = "budget-tracker-auth";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem(AUTH_KEY);
    router.replace(stored ? "/board" : "/login");
  }, [router]);

  return (
    <main>
      <h1>Budget Tracker</h1>
      <p>Redirecting to your workspace...</p>
    </main>
  );
}
