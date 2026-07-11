"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateAnonId } from "@/lib/anon";
import { speakQueue } from "@/lib/tts";
import { buildSpokenSequence } from "@/lib/hazardSpeech";
import { loadPreference, savePreference } from "@/lib/preferences";
import {
  isSpeechRecognitionSupported,
  startWakeWordListener,
} from "@/lib/speechRecognition";
import CameraCapture, { type CameraCaptureHandle } from "./CameraCapture";
import SceneCard, { type SceneSession } from "./SceneCard";
import SessionHistoryList from "./SessionHistoryList";
import QAThread from "./QAThread";
import LanguageToggle from "./LanguageToggle";

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
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const cameraRef = useRef<CameraCaptureHandle>(null);

  useEffect(() => {
    const id = getOrCreateAnonId();
    setAnonId(id);
    loadPreference(id).then((pref) => {
      if (pref) {
        setLanguage(pref.language);
        setWakeWordEnabled(pref.wake_word_enabled);
      }
    });
  }, []);

  useEffect(() => {
    if (!wakeWordEnabled || !isSpeechRecognitionSupported()) return;
    const listener = startWakeWordListener("hey vision", language, () => {
      cameraRef.current?.capture();
    });
    return () => listener.stop();
  }, [wakeWordEnabled, language]);

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
        body: JSON.stringify({ anonId, imageDataUrl, language }),
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

  function handleLanguageChange(next: "en" | "zh") {
    setLanguage(next);
    if (anonId) savePreference(anonId, { language: next });
  }

  function toggleWakeWord() {
    setWakeWordEnabled((prev) => {
      const next = !prev;
      if (anonId) savePreference(anonId, { wake_word_enabled: next });
      return next;
    });
  }

  return (
    <main className="min-h-screen max-w-lg mx-auto p-4 space-y-6 pb-16">
      <header className="text-center py-2 space-y-3">
        <div>
          <h1 className="text-2xl font-bold">Vision Len</h1>
          <p className="text-sm text-neutral-500">Your hands-free visual assistant</p>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle language={language} onChange={handleLanguageChange} />
          {isSpeechRecognitionSupported() && (
            <button
              onClick={toggleWakeWord}
              className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium ${
                wakeWordEnabled
                  ? "bg-green-600 text-white border-green-700"
                  : "bg-white text-neutral-600 border-neutral-300"
              }`}
            >
              {wakeWordEnabled ? "Hey Vision: On" : "Hey Vision: Off"}
            </button>
          )}
        </div>
      </header>

      <CameraCapture
        ref={cameraRef}
        onCapture={handleCapture}
        disabled={cardState === "loading"}
      />

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
