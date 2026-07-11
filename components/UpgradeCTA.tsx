"use client";

import { useState } from "react";

export default function UpgradeCTA({ anonId }: { anonId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setError(json.error ?? "Couldn't start checkout — try again");
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Couldn't start checkout — try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-center space-y-3">
      <p className="font-semibold text-amber-900">
        You&apos;ve used your 10 free scans today.
      </p>
      <p className="text-sm text-amber-700">
        Upgrade to Vision Pro for unlimited scene descriptions.
      </p>
      <button
        onClick={upgrade}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-amber-600 text-white font-semibold disabled:opacity-50"
      >
        {loading ? "Starting checkout…" : "Upgrade to Vision Pro"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
