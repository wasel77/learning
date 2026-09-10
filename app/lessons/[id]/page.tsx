import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { LessonContentTabs } from "@/components/LessonContentTabs";
import { LevelBadge } from "@/components/LevelBadge";
import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toggleLessonWatched } from "@/lib/actions";
import { getProfile } from "@/lib/data";
import { isLessonUnlocked } from "@/lib/lesson-locks";
import { createClient } from "@/lib/supabase/server";
import type { LessonSummaryLink, LessonVocabularyItem } from "@/lib/types";
import { getAllowedLevels } from "@/lib/utils";
import { hasBunnyVideo } from "@/lib/bunny-stream";

function normalizeVocabulary(value: unknown): LessonVocabularyItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const term = String(record.term ?? "").trim();
      const definition = String(record.definition ?? "").trim();
      return term || definition ? { term, definition } : null;
    })
    .filter(Boolean) as LessonVocabularyItem[];
}

function normalizeSummaryLinks(value: unknown): LessonSummaryLink[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const label = String(record.label ?? "").trim();
      const url = String(record.url ?? "").trim();
      if (!label || !url) return null;
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) return null;
        return { label, url };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as LessonSummaryLink[];
}

function getInitialTab(tab?: string | string[]) {
  const value = Array.isArray(tab) ? tab[0] : tab;
  if (value === "vocabulary" || value === "summary") return value;
  return "video";
}

export default async function LessonDetailPage(
  props: PageProps<"/lessons/[id]">,
) {
  const { id } = await props.params;
  const searchParams = await props.searchParams;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("*, lesson_progress(watched, watched_at, completed, completed_at, quiz_score, quiz_total, quiz_percentage, quiz_passed)")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!lesson || !getAllowedLevels(profile.level).includes(lesson.level)) {
    notFound();
  }

  const { data: availableLessons } = await supabase
    .from("lessons")
    .select("id,level,lesson_order,lesson_progress(completed,completed_at)")
    .in("level", getAllowedLevels(profile.level))
    .eq("is_active", true)
    .order("level")
    .order("lesson_order");

  if (!isLessonUnlocked(lesson.id, availableLessons ?? [])) {
    notFound();
  }

  const completed = Boolean(lesson.lesson_progress?.[0]?.completed);
  const watched = Boolean(lesson.lesson_progress?.[0]?.watched);
  const vocabulary = normalizeVocabulary(lesson.vocabulary);
  const summaryLinks = normalizeSummaryLinks(lesson.summary_links);

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-6xl space-y-8">
        <Card className="relative overflow-hidden p-7 md:p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(37,99,235,0.22),transparent_36%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-8">
            <div className="max-w-3xl">
              <Link
                href="/roadmap"
                className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-sky-300 transition hover:text-sky-200"
              >
                <ArrowRight className="h-4 w-4" />
                العودة للخارطة
              </Link>
              <div className="flex flex-wrap items-center gap-3">
                <LevelBadge level={lesson.level} />
                <span className="rounded-full bg-slate-950/70 px-3 py-1 text-xs font-bold text-slate-300">
                  الدرس {lesson.lesson_order}
                </span>
              </div>
              <h1 className="mt-6 text-4xl font-black leading-tight text-white md:text-5xl">
                {lesson.title}
              </h1>
              {lesson.description ? (
                <p className="mt-4 text-lg leading-8 text-slate-300">
                  {lesson.description}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center">
                <p className="text-sm font-bold text-slate-400">الوقت</p>
                <p className="mt-2 text-2xl font-black text-sky-300">
                  {lesson.duration_minutes ?? 0} دقيقة
                </p>
              </div>
              <form
                action={toggleLessonWatched.bind(null, lesson.id, !watched)}
                className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-center"
              >
                <p className="text-sm font-bold text-slate-400">
                  هل شاهدت الدرس؟
                </p>
                <button
                  type="submit"
                  className={[
                    "mt-3 inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition",
                    watched
                      ? "bg-emerald-400 text-emerald-950"
                      : "bg-blue-600 text-white hover:bg-blue-500",
                  ].join(" ")}
                  aria-pressed={watched}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {watched ? "تمت المشاهدة" : "تحديد كمشاهد"}
                </button>
                {!completed ? (
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    الدرس التالي يفتح بعد اجتياز الاختبار بنسبة 100%.
                  </p>
                ) : null}
              </form>
            </div>
          </div>
        </Card>

        <LessonContentTabs
          lessonId={lesson.id}
          title={lesson.title}
          driveFileId={lesson.drive_file_id}
          durationMinutes={lesson.duration_minutes}
          summary={lesson.summary}
          summaryLinks={summaryLinks}
          vocabulary={vocabulary}
          initialTab={getInitialTab(searchParams.tab)}
          videoProvider={hasBunnyVideo(lesson.title) ? "bunny" : "drive"}
        />

        <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-white">
              <Sparkles className="h-6 w-6 text-sky-300" />
              جاهز للتأكد من فهمك؟
            </h2>
            <p className="mt-2 text-slate-400">
              بعد مشاهدة الفيديو ومراجعة المفردات والملخص، اختبر نفسك بأسئلة
              قصيرة مرتبطة بهذا الدرس.
            </p>
          </div>
          <Link
            href={`/lessons/${lesson.id}/quiz`}
            className={buttonClassName("default")}
          >
            <Brain className="h-4 w-4" />
            اختبر نفسك
          </Link>
        </Card>
      </div>
    </AppShell>
  );
}
