"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getOrCreateAnonId } from "@/lib/anon";
import { speakQueue } from "@/lib/tts";
import { buildSpokenSequence } from "@/lib/hazardSpeech";
import { loadPreference, savePreference } from "@/lib/preferences";
import { getSubscriptionStatus } from "@/lib/subscription";
import { getTodayUsageCount } from "@/lib/usage";
import {
  isSpeechRecognitionSupported,
  startWakeWordListener,
} from "@/lib/speechRecognition";
import CameraCapture, { type CameraCaptureHandle } from "./CameraCapture";
import SceneCard, { type SceneSession } from "./SceneCard";
import SessionHistoryList from "./SessionHistoryList";
import QAThread from "./QAThread";
import LanguageToggle from "./LanguageToggle";
import UpgradeCTA from "./UpgradeCTA";

type CardState = "empty" | "loading" | "error" | "limit" | "ready";

const FREE_DAILY_LIMIT = 10;

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
  const [isPro, setIsPro] = useState(false);
  const [usageCount, setUsageCount] = useState(0);
  const [checkoutBanner, setCheckoutBanner] = useState<
    "success" | "cancel" | null
  >(null);
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
    Promise.all([getSubscriptionStatus(id), getTodayUsageCount(id)]).then(
      ([status, count]) => {
        setIsPro(status.isPro);
        setUsageCount(count);
        if (!status.isPro && count >= FREE_DAILY_LIMIT) {
          setCardState("limit");
        }
      },
    );

    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    if (checkout === "success" || checkout === "cancel") {
      setCheckoutBanner(checkout);
      window.history.replaceState({}, "", window.location.pathname);
      if (checkout === "success") {
        // Webhook may take a moment to land — poll briefly for the updated status.
        let attempts = 0;
        const interval = setInterval(() => {
          attempts += 1;
          refreshProStatus(id);
          if (attempts >= 5) clearInterval(interval);
        }, 1500);
      }
    }
  }, []);

  async function refreshProStatus(id: string) {
    const status = await getSubscriptionStatus(id);
    setIsPro(status.isPro);
  }

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
        setCardState("limit");
        setUsageCount(json.usageCount ?? FREE_DAILY_LIMIT);
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
      setUsageCount(json.usageCount ?? 0);
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
        <p className="text-xs font-medium">
          {isPro ? (
            <span className="text-green-700">✓ Vision Pro active — unlimited scans</span>
          ) : (
            <span className="text-neutral-400">
              {usageCount}/{FREE_DAILY_LIMIT} free scans used today
            </span>
          )}
        </p>
      </header>

      {checkoutBanner === "success" && (
        <div className="rounded-xl bg-green-50 border border-green-300 text-green-800 text-center p-3 text-sm font-medium">
          {isPro ? "Vision Pro active!" : "Payment received — activating Vision Pro…"}
        </div>
      )}
      {checkoutBanner === "cancel" && (
        <div className="rounded-xl bg-neutral-100 border border-neutral-300 text-neutral-600 text-center p-3 text-sm">
          Upgrade cancelled — you&apos;re still on free tier.
        </div>
      )}

      <CameraCapture
        ref={cameraRef}
        onCapture={handleCapture}
        disabled={cardState === "loading"}
      />

      {cardState === "limit" ? (
        <UpgradeCTA anonId={anonId} />
      ) : (
        <SceneCard state={cardState} session={active} errorMessage={errorMessage} />
      )}

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
