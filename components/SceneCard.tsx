"use client";

type Hazard = { type: string; detail: string; severity: "high" | "medium" | "low" };

export type SceneSession = {
  id: string;
  image_url: string;
  description: string;
  hazards: Hazard[];
  language: string;
  created_at: string;
};

const SEVERITY_STYLES: Record<Hazard["severity"], string> = {
  high: "bg-red-600 text-white border-red-700",
  medium: "bg-amber-500 text-white border-amber-600",
  low: "bg-neutral-600 text-white border-neutral-700",
};

export function HazardAlert({ hazards }: { hazards: Hazard[] }) {
  if (!hazards || hazards.length === 0) return null;
  return (
    <div className="space-y-2">
      {hazards.map((h, i) => (
        <div
          key={i}
          role="alert"
          className={`rounded-lg border px-4 py-3 font-semibold ${SEVERITY_STYLES[h.severity] ?? SEVERITY_STYLES.low}`}
        >
          ⚠ {h.detail}
        </div>
      ))}
    </div>
  );
}

export default function SceneCard({
  state,
  session,
  errorMessage,
}: {
  state: "empty" | "loading" | "error" | "ready";
  session?: SceneSession | null;
  errorMessage?: string;
}) {
  if (state === "empty") {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-neutral-500">
        Point your camera to begin
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="rounded-xl border border-neutral-200 p-8 text-center text-neutral-500 animate-pulse">
        Vision is looking…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {errorMessage ?? "Vision couldn't see clearly — try again"}
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-3">
      <HazardAlert hazards={session.hazards} />
      <div className="rounded-xl border border-neutral-200 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={session.image_url}
          alt="Captured scene"
          className="w-full aspect-video object-cover"
        />
        <div className="p-4">
          <p className="text-lg leading-relaxed">{session.description}</p>
          <p className="mt-2 text-xs text-neutral-400">
            {new Date(session.created_at).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
