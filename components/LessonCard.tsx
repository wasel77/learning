import Link from "next/link";
import { CheckCircle2, Clock, Lock, PlayCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LevelBadge } from "@/components/LevelBadge";
import type { Lesson } from "@/lib/types";
import { DIAMOND_UPGRADE_URL } from "@/lib/subscription-links";

function LessonCardContent({ lesson }: { lesson: Lesson }) {
  const completed = Boolean(lesson.lesson_progress?.[0]?.completed);
  const locked = Boolean(lesson.is_locked);
  const packageLocked = Boolean(lesson.is_package_locked);

  return (
    <Card
      className={[
        "h-full p-5 transition",
        locked ? "border-slate-800 bg-slate-950/50 opacity-75" : "hover:-translate-y-1 hover:border-sky-400/40",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <LevelBadge level={lesson.level} />
        {completed ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            مكتمل
          </span>
        ) : locked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            <Lock className="h-3 w-3" />
            مقفول
          </span>
        ) : null}
      </div>
      <h3 className="mt-5 text-xl font-black text-white">{lesson.title}</h3>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{lesson.description}</p>
      {packageLocked ? (
        <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs font-bold leading-5 text-amber-200">
          <p>هذه الميزة غير متاحة لباقتك الحالية. هذا المحتوى حصري للألماسي 💎</p>
          <a
            href={DIAMOND_UPGRADE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex rounded-lg bg-amber-300 px-3 py-2 text-xs font-black text-amber-950"
          >
            الترقية للألماسية
          </a>
        </div>
      ) : locked ? (
        <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs font-bold leading-5 text-amber-200">
          يجب اجتياز اختبار الدرس السابق بنسبة 100% لفتح هذا الدرس.
        </p>
      ) : null}
      <div className="mt-6 flex items-center justify-between text-sm text-slate-400">
        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {lesson.duration_minutes ?? 0} دقيقة
        </span>
        {locked ? <Lock className="h-6 w-6 text-slate-500" /> : <PlayCircle className="h-6 w-6 text-sky-300" />}
      </div>
    </Card>
  );
}

export function LessonCard({ lesson }: { lesson: Lesson }) {
  if (lesson.is_locked || lesson.is_package_locked) {
    return <LessonCardContent lesson={lesson} />;
  }

  return (
    <Link href={`/lessons/${lesson.id}`}>
      <LessonCardContent lesson={lesson} />
    </Link>
  );
}
