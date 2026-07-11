"use client";

import { useEffect, useRef, useState } from "react";

const MAX_WIDTH = 640;
const JPEG_QUALITY = 0.6;

export default function CameraCapture({
  onCapture,
  disabled,
}: {
  onCapture: (imageDataUrl: string) => void;
  disabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setReady(true);
      } catch {
        setError("Camera access needed — tap to open settings");
      }
    }
    startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    if (!video || !ready) return;

    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    onCapture(dataUrl);
  }

  if (error) {
    return (
      <button
        onClick={() => window.location.reload()}
        className="w-full aspect-video rounded-xl bg-neutral-900 text-white flex items-center justify-center text-center p-6"
      >
        {error}
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <video
          ref={videoRef}
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
            Starting camera…
          </div>
        )}
      </div>
      <button
        onClick={capture}
        disabled={!ready || disabled}
        className="w-full py-4 rounded-xl bg-blue-600 text-white text-lg font-semibold disabled:opacity-50 active:scale-[0.99] transition"
      >
        {disabled ? "Vision is looking…" : "Describe what I see"}
      </button>
    </div>
  );
}
