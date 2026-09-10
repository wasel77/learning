"use client";

import { useEffect, useRef, useState } from "react";

type MigrationResult = {
  complete?: boolean;
  remaining?: number;
  started?: Array<{ lessonId: string; title: string }>;
  linked?: Array<{ lessonId: string; title: string; videoId: string }>;
  pending?: Array<{
    lessonId: string;
    title: string;
    videoId: string;
    status: number;
    encodeProgress: number;
  }>;
  waitingToStart?: number;
  error?: string;
  failedLesson?: { lessonId: string; title: string };
};

export function AdminBunnyMigrationPanel({ initialRemaining }: { initialRemaining: number }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MigrationResult>({
    complete: initialRemaining === 0,
    remaining: initialRemaining,
  });
  const requestInFlight = useRef(false);

  useEffect(() => {
    if (!running) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function run() {
      if (requestInFlight.current || cancelled) return;
      requestInFlight.current = true;

      try {
        const response = await fetch("/api/admin/bunny-migration", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
        });
        const payload = (await response.json()) as MigrationResult;
        if (cancelled) return;
        setResult(payload);

        if (!response.ok || payload.error || payload.complete) {
          setRunning(false);
          return;
        }

        timer = setTimeout(run, 30_000);
      } catch {
        if (!cancelled) {
          setResult({ error: "تعذر متابعة النقل. توقفت الدفعة بدون بدء محاولة جديدة." });
          setRunning(false);
        }
      } finally {
        requestInFlight.current = false;
      }
    }

    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [running]);

  return (
    <section className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black text-white">نقل الدروس إلى Bunny</h2>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            يبدأ 3 دروس في كل دورة، ويتابع نفس النسخ تلقائيًا. الربط لا يتم إلا بعد اكتمال الترميز 100%.
          </p>
        </div>
        <button
          type="button"
          disabled={running || result.complete}
          onClick={() => setRunning(true)}
          className="rounded-xl bg-sky-400 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {result.complete ? "اكتمل النقل" : running ? "جاري النقل والمتابعة..." : "ابدأ أو تابع النقل"}
        </button>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <p className="rounded-xl bg-slate-950/50 px-3 py-2 text-slate-300">
          المتبقي: <strong className="text-white">{result.remaining ?? initialRemaining}</strong>
        </p>
        <p className="rounded-xl bg-slate-950/50 px-3 py-2 text-slate-300">
          قيد الترميز: <strong className="text-white">{result.pending?.length ?? 0}</strong>
        </p>
        <p className="rounded-xl bg-slate-950/50 px-3 py-2 text-slate-300">
          رُبط في آخر دورة: <strong className="text-white">{result.linked?.length ?? 0}</strong>
        </p>
      </div>

      {result.error ? (
        <div className="mt-3 rounded-xl border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
          توقف النقل: {result.error}
          {result.failedLesson ? ` — ${result.failedLesson.title}` : ""}
        </div>
      ) : null}

      {result.pending?.length ? (
        <div className="mt-3 space-y-1 text-xs text-slate-400">
          {result.pending.map((item) => (
            <p key={item.lessonId}>
              {item.title}: {item.encodeProgress}% (status {item.status})
            </p>
          ))}
        </div>
      ) : null}
    </section>
  );
}
