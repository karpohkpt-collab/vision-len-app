"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { speak } from "@/lib/tts";
import { isSpeechRecognitionSupported, listenOnce } from "@/lib/speechRecognition";

type QaExchange = {
  id: string;
  question: string;
  answer: string;
  created_at: string;
};

export default function QAThread({
  sessionId,
  anonId,
  language,
}: {
  sessionId: string;
  anonId: string;
  language: "en" | "zh";
}) {
  const [exchanges, setExchanges] = useState<QaExchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("qa_exchanges")
        .select("id, question, answer, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setExchanges((data as QaExchange[]) ?? []);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  async function submitQuestion(text: string) {
    if (!text.trim() || asking) return;
    setAsking(true);
    setError(null);
    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId, sessionId, question: text, language }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Vision couldn't answer that — try again");
        return;
      }
      setExchanges((prev) => [...prev, json.qa]);
      setQuestion("");
      speak(json.qa.answer, language);
    } catch {
      setError("Vision couldn't answer that — try again");
    } finally {
      setAsking(false);
    }
  }

  async function handleVoiceInput() {
    setListening(true);
    try {
      const transcript = await listenOnce(language);
      setQuestion(transcript);
      await submitQuestion(transcript);
    } catch {
      setError("Didn't catch that — try typing your question");
    } finally {
      setListening(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-neutral-600">Ask a question</h2>

      {loading ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : exchanges.length === 0 ? (
        <p className="text-sm text-neutral-400">
          Ask anything about what you see
        </p>
      ) : (
        <ul className="space-y-2">
          {exchanges.map((qa) => (
            <li
              key={qa.id}
              className="rounded-lg border border-neutral-200 p-3 space-y-1"
            >
              <p className="text-sm font-medium text-neutral-700">
                Q: {qa.question}
              </p>
              <p className="text-sm text-neutral-600">A: {qa.answer}</p>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submitQuestion(question);
        }}
        className="flex gap-2"
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Is it safe to cross?"
          disabled={asking}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        {isSpeechRecognitionSupported() && (
          <button
            type="button"
            onClick={handleVoiceInput}
            disabled={asking || listening}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50"
            aria-label="Ask by voice"
          >
            {listening ? "Listening…" : "🎤"}
          </button>
        )}
        <button
          type="submit"
          disabled={asking || !question.trim()}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {asking ? "…" : "Ask"}
        </button>
      </form>
    </section>
  );
}
