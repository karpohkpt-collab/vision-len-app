"use client";

import type { SceneSession } from "./SceneCard";

export default function SessionHistoryList({
  sessions,
  selectedId,
  onSelect,
}: {
  sessions: SceneSession[];
  selectedId?: string | null;
  onSelect: (session: SceneSession) => void;
}) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-neutral-400 text-center py-4">
        No sessions yet.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 overflow-hidden">
      {sessions.map((s) => (
        <li key={s.id}>
          <button
            onClick={() => onSelect(s)}
            className={`w-full text-left p-3 flex gap-3 items-center hover:bg-neutral-50 transition ${
              selectedId === s.id ? "bg-blue-50" : ""
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.image_url}
              alt=""
              className="w-14 h-14 rounded-lg object-cover shrink-0"
            />
            <div className="min-w-0">
              <p className="text-sm text-neutral-800 line-clamp-2">
                {s.description}
              </p>
              <p className="text-xs text-neutral-400 mt-1">
                {new Date(s.created_at).toLocaleString()}
                {s.hazards?.length > 0 && (
                  <span className="ml-2 text-red-600 font-medium">
                    {s.hazards.length} hazard{s.hazards.length > 1 ? "s" : ""}
                  </span>
                )}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
