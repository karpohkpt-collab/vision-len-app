"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateAnonId } from "@/lib/anon";
import { speakQueue } from "@/lib/tts";
import { buildSpokenSequence } from "@/lib/hazardSpeech";
import CameraCapture from "./CameraCapture";
import SceneCard, { type SceneSession } from "./SceneCard";
import SessionHistoryList from "./SessionHistoryList";
import QAThread from "./QAThread";

type CardState = "empty" | "loading" | "error" | "ready";

export default function VisionApp({
  initialSessions,
}: {
  initialSessions: SceneSession[];
}) {
  const [anonId, setAnonId] = useState("");
  const [sessions, setSessions] = useState<SceneSession[]>(initialSessions);
  const [active, setActive] = useState<SceneSession | null>(
    initialSessions[0] ?? null,
  );
  const [cardState, setCardState] = useState<CardState>(
    initialSessions[0] ? "ready" : "empty",
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  useEffect(() => {
    setAnonId(getOrCreateAnonId());
  }, []);

  async function refreshSessions() {
    const supabase = createClient();
    const { data } = await supabase
      .from("scene_sessions")
      .select(
        "id, image_url, description, description_confidence, hazards, language, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setSessions(data as SceneSession[]);
  }

  async function handleCapture(imageDataUrl: string) {
    setCardState("loading");
    setErrorMessage(undefined);
    try {
      const res = await fetch("/api/describe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anonId, imageDataUrl, language: "en" }),
      });
      const json = await res.json();

      if (res.status === 402) {
        setCardState("error");
        setErrorMessage("You've used your 10 free scans today.");
        return;
      }
      if (!res.ok) {
        setCardState("error");
        setErrorMessage(json.error ?? "Vision couldn't see clearly — try again");
        return;
      }

      const session: SceneSession = json.session;
      setActive(session);
      setCardState("ready");
      speakQueue(
        buildSpokenSequence(session),
        session.language === "zh" ? "zh" : "en",
      );
      refreshSessions();
    } catch {
      setCardState("error");
      setErrorMessage("Vision couldn't see clearly — try again");
    }
  }

  function selectSession(session: SceneSession) {
    setActive(session);
    setCardState("ready");
  }

  return (
    <main className="min-h-screen max-w-lg mx-auto p-4 space-y-6 pb-16">
      <header className="text-center py-2">
        <h1 className="text-2xl font-bold">Vision Len</h1>
        <p className="text-sm text-neutral-500">Your hands-free visual assistant</p>
      </header>

      <CameraCapture onCapture={handleCapture} disabled={cardState === "loading"} />

      <SceneCard state={cardState} session={active} errorMessage={errorMessage} />

      {active && cardState === "ready" && anonId && (
        <QAThread
          sessionId={active.id}
          anonId={anonId}
          language={active.language === "zh" ? "zh" : "en"}
        />
      )}

      <section>
        <h2 className="text-sm font-semibold text-neutral-600 mb-2">
          Session history
        </h2>
        <SessionHistoryList
          sessions={sessions}
          selectedId={active?.id}
          onSelect={selectSession}
        />
      </section>
    </main>
  );
}
