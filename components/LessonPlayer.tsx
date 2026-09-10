"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

type PlaybackState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error" };

export function LessonPlayer({
  lessonId,
  title,
}: {
  lessonId: string;
  title: string;
}) {
  const [playerKey, setPlayerKey] = useState(0);
  const [bunnyPlayback, setBunnyPlayback] = useState<PlaybackState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/lessons/${encodeURIComponent(lessonId)}/playback`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Playback authorization failed");
        const payload = (await response.json()) as { url?: unknown };
        if (typeof payload.url !== "string") throw new Error("Invalid playback response");
        setBunnyPlayback({ status: "ready", url: payload.url });
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setBunnyPlayback({ status: "error" });
      });

    return () => controller.abort();
  }, [lessonId, playerKey]);

  return (
    <div className="min-w-0 space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black shadow-2xl shadow-blue-950/30 sm:rounded-2xl">
        {bunnyPlayback.status === "ready" ? (
          <iframe
            key={playerKey}
            title={title}
            src={bunnyPlayback.url}
            className="absolute inset-0 block h-full w-full border-0"
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : bunnyPlayback.status === "error" ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center text-slate-200">
            <AlertCircle className="h-8 w-8 text-amber-300" />
            <p className="text-sm font-bold">تعذر تشغيل الفيديو مؤقتًا.</p>
            <button
              type="button"
              onClick={() => {
                setBunnyPlayback({ status: "loading" });
                setPlayerKey((value) => value + 1);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm font-bold transition hover:bg-slate-700"
            >
              <RotateCcw className="h-4 w-4" />
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-400">
            جارٍ تجهيز الفيديو...
          </div>
        )}
      </div>
    </div>
  );
}
