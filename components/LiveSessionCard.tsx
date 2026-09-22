import Link from "next/link";
import { CalendarClock, Lock, Radio, Video } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonClassName } from "@/components/ui/button";
import { CountdownTimer } from "@/components/CountdownTimer";
import { LevelBadge } from "@/components/LevelBadge";
import { formatArabicDate } from "@/lib/utils";
import type { LiveSession } from "@/lib/types";
import { DIAMOND_UPGRADE_URL } from "@/lib/subscription-links";

export function LiveSessionCard({ session, now }: { session: LiveSession; now: number }) {
  const start = new Date(session.start_time).getTime();
  const end = new Date(session.end_time).getTime();
  const liveNow = now >= start && now <= end;
  const within24 = start > now && start - now <= 86_400_000;
  const ended = now > end;
  const packageLocked = Boolean(session.is_package_locked);
  const locked = packageLocked || Boolean(session.is_level_locked);

  return (
    <Card className="overflow-hidden transition hover:border-sky-400/40 hover:shadow-[0_20px_70px_rgba(37,99,235,0.12)]">
      <div className="flex min-h-44 items-center justify-center border-b border-slate-800/80 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.13),transparent_58%)] p-6 text-center">
        {liveNow ? (
          <div className="inline-flex items-center justify-center gap-3 rounded-3xl border border-red-400/25 bg-red-500/15 px-7 py-4 text-3xl font-black text-red-100 shadow-[0_0_40px_rgba(239,68,68,0.12)] sm:text-4xl">
            <Radio className="h-8 w-8" />
            مباشر الآن
          </div>
        ) : within24 ? (
          <CountdownTimer startTime={session.start_time} variant="hero" />
        ) : (
          <div className="inline-flex max-w-full items-center justify-center gap-3 rounded-3xl border border-sky-400/20 bg-sky-400/10 px-6 py-4 text-center text-2xl font-black leading-tight text-sky-100 sm:text-3xl">
            <CalendarClock className="h-7 w-7 text-cyan-200" />
            يبدأ في {formatArabicDate(session.start_time)}
          </div>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LevelBadge level={session.level} />
          {liveNow ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-200">
              <Radio className="h-3 w-3" />
              متاحة الآن
            </span>
          ) : null}
        </div>

        <div>
          <h3 className="text-xl font-black text-white">{session.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{session.description}</p>
        </div>

        <div className="space-y-1 text-sm">
          <p className="text-slate-300">
            {formatArabicDate(session.start_time)} - {formatArabicDate(session.end_time)}
          </p>
          <p className="text-xs font-bold text-sky-300">بتوقيت السعودية</p>
          <p className="text-slate-400">المدرب: {session.instructor_name || "سيتم التحديد"}</p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {locked ? (
            <div className="w-full rounded-xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm font-bold leading-6 text-amber-200">
              <p className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                {packageLocked
                  ? "هذه الميزة غير متاحة لباقتك الحالية"
                  : "تفتح هذه الحصة عند الوصول إلى مستواها"}
              </p>
              {packageLocked ? (
                <a
                  href={DIAMOND_UPGRADE_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex rounded-lg bg-amber-300 px-3 py-2 text-xs font-black text-amber-950"
                >
                  الترقية للألماسية
                </a>
              ) : null}
            </div>
          ) : session.live_url && !ended ? (
            <Link href={session.live_url} target="_blank" className={buttonClassName("default")}>
              <Video className="h-4 w-4" />
              انضمام
            </Link>
          ) : null}
          {ended && session.replay_url ? (
            <Link href={session.replay_url} target="_blank" className={buttonClassName("secondary")}>
              مشاهدة الإعادة
            </Link>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
