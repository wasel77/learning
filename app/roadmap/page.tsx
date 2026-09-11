import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Flame,
  Lock,
  Map,
  Sparkles,
  Trophy,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { getProfile } from "@/lib/data";
import { applyLessonLocks, isLessonCompleted } from "@/lib/lesson-locks";
import { getAllowedLevels, getLearningPath } from "@/lib/learning-path";
import { createClient } from "@/lib/supabase/server";
import type { Level } from "@/lib/types";

type RoadmapLesson = {
  id: string;
  level: Level;
  title: string;
  lesson_order: number;
  is_locked?: boolean;
  lesson_progress?: { completed: boolean; completed_at: string | null }[];
};

type LevelConfig = {
  level: Level;
  code: string;
  title: string;
  description: string;
  accent: string;
  glow: string;
};

const levelConfigs: LevelConfig[] = [
  {
    level: "beginner",
    code: "A1",
    title: "المبتدئ",
    description: "أساسيات التداول وبناء القاعدة",
    accent: "bg-emerald-400",
    glow: "from-emerald-500/20",
  },
  {
    level: "advanced",
    code: "A2",
    title: "المتقدم",
    description: "قراءة السوق وتطوير المهارات",
    accent: "bg-blue-500",
    glow: "from-blue-500/20",
  },
  {
    level: "expert",
    code: "B1",
    title: "الخبير",
    description: "استراتيجيات متقدمة وإدارة احترافية",
    accent: "bg-violet-500",
    glow: "from-violet-500/20",
  },
  {
    level: "professional",
    code: "B2",
    title: "المحترف",
    description: "تطبيق احترافي وتطوير أسلوب التداول",
    accent: "bg-amber-400",
    glow: "from-amber-500/20",
  },
  {
    level: "strategies",
    code: "C1",
    title: "الاستراتيجيات",
    description: "استراتيجيات عملية متقدمة وخطط تطبيقها",
    accent: "bg-rose-400",
    glow: "from-rose-500/20",
  },
];

function percent(completed: number, total: number) {
  return total ? Math.round((completed / total) * 100) : 0;
}

function chunkLessons(lessons: RoadmapLesson[], size: number) {
  return Array.from({ length: Math.ceil(lessons.length / size) }, (_, index) =>
    lessons.slice(index * size, index * size + size),
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-700">
      <div
        className="h-full rounded-full bg-gradient-to-l from-sky-300 to-blue-600 transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function SummaryTile({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: "green" | "blue" | "amber";
}) {
  const colors = {
    green: "border-emerald-500/35 bg-emerald-500/10 text-emerald-300",
    blue: "border-blue-500/35 bg-blue-500/10 text-blue-300",
    amber: "border-amber-500/35 bg-amber-500/10 text-amber-300",
  };

  return (
    <div className={`rounded-2xl border p-5 text-center ${colors[tone]}`}>
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-2 text-sm font-bold">{label}</p>
    </div>
  );
}

export default async function RoadmapPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const learningPath = getLearningPath(profile.subscription_package);
  const pathLevelConfigs = learningPath.map(
    (level) => levelConfigs.find((config) => config.level === level)!,
  );
  const allowedLevels = getAllowedLevels(
    profile.level,
    profile.subscription_package,
  ) as Level[];
  const currentLevel = profile.level ?? "beginner";
  const currentLevelIndex = pathLevelConfigs.findIndex(
    (config) => config.level === currentLevel,
  );

  const { data } = await supabase
    .from("lessons")
    .select("id,level,title,lesson_order,lesson_progress(completed,completed_at)")
    .eq("is_active", true)
    .order("level")
    .order("lesson_order");

  const lessons = applyLessonLocks((data ?? []) as RoadmapLesson[]);

  const completedLessons = lessons.filter(isLessonCompleted).length;
  const totalLessons = lessons.length;
  const overallProgress = percent(completedLessons, totalLessons);
  const availableLessons = lessons.filter((lesson) =>
    allowedLevels.includes(lesson.level),
  );
  const availableCompleted = availableLessons.filter(isLessonCompleted).length;
  const lockedLessons = lessons.length - availableLessons.length;
  const currentLessons = lessons.filter((lesson) => lesson.level === currentLevel);
  const currentCompleted = currentLessons.filter(isLessonCompleted).length;
  const currentProgress = percent(currentCompleted, currentLessons.length);
  const lessonsLeft = Math.max(0, currentLessons.length - currentCompleted);
  const currentConfig =
    pathLevelConfigs.find((config) => config.level === currentLevel) ??
    pathLevelConfigs[0];
  const weeklyLessons = chunkLessons(currentLessons, 7);

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-6xl space-y-8">
        <Card className="relative overflow-hidden p-8 text-center">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.22),transparent_45%)]" />
          <div className="relative">
            <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-blue-600/20 text-sky-300">
              <Map className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-black text-white md:text-5xl">
              خارطة الطريق إلى الاحتراف
            </h1>
            <p className="mt-4 text-lg text-slate-300">
              مسارك التعليمي من المستوى الحالي إلى آخر مستوى متاح في المنصة.
            </p>
            <p className="mt-2 text-sm font-bold text-sky-300">
              {pathLevelConfigs.length} مستويات • {totalLessons} درس • تقدمك الكلي{" "}
              {overallProgress}%
            </p>

            <div className="mx-auto mt-8 max-w-4xl text-right">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>{completedLessons} من {totalLessons} درس</span>
                <span>التقدم الإجمالي</span>
              </div>
              <ProgressBar value={overallProgress} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-2xl font-black text-white">
              <Clock3 className="h-6 w-6 text-sky-300" />
              ملخص المحتوى المتاح
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <SummaryTile
              value={availableLessons.length - availableCompleted}
              label="درس متبق لك"
              tone="amber"
            />
            <SummaryTile
              value={availableCompleted}
              label="مكتمل"
              tone="blue"
            />
            <SummaryTile
              value={availableLessons.length}
              label="متاح الآن"
              tone="green"
            />
          </div>
        </Card>

        <Card className="overflow-hidden border-blue-500/25 p-0">
          <div
            className={`bg-gradient-to-l ${currentConfig.glow} to-transparent p-6`}
          >
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <span className={`mt-1 h-20 w-2 rounded-full ${currentConfig.accent}`} />
                <div>
                  <div className="mb-2 inline-flex rounded-full bg-blue-500/15 px-3 py-1 text-xs font-black text-sky-200">
                    المستوى الحالي
                  </div>
                  <h2 className="text-4xl font-black text-white">
                    {currentConfig.code} - {currentConfig.title}
                  </h2>
                  <p className="mt-2 text-slate-400">
                    {currentConfig.description}
                  </p>
                </div>
              </div>
              <div className="min-w-40 text-center">
                <p className="text-4xl font-black text-rose-400">
                  {lessonsLeft}
                </p>
                <p className="mt-1 text-sm text-slate-400">درس متبق في مستواك</p>
              </div>
            </div>
            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                <span>{currentProgress}% مكتمل</span>
                <span>تقدمك في {currentConfig.code}</span>
              </div>
              <ProgressBar value={currentProgress} />
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          {weeklyLessons.length ? (
            weeklyLessons.map((week, index) => {
              const weekCompleted = week.filter(isLessonCompleted).length;
              const weekProgress = percent(weekCompleted, week.length);

              return (
                <Card key={index} className="overflow-hidden p-0">
                  <div className="flex items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/70 p-5">
                    <div className="flex items-center gap-4">
                      <span className="grid h-12 w-12 place-items-center rounded-xl bg-blue-600 text-lg font-black text-white">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-2xl font-black text-white">
                          الأسبوع {index + 1}
                        </h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {weekCompleted}/{week.length} مكتمل
                        </p>
                      </div>
                    </div>
                    <div className="w-36">
                      <ProgressBar value={weekProgress} />
                    </div>
                  </div>

                  <div className="space-y-3 p-5">
                    {week.map((lesson, lessonIndex) => {
                      const completed = isLessonCompleted(lesson);
                      const firstUnfinished =
                        !completed &&
                        currentLessons.find((item) => !isLessonCompleted(item))?.id ===
                          lesson.id;
                      const locked = Boolean(lesson.is_locked);

                      return (
                        <Link
                          key={lesson.id}
                          href={locked ? "/roadmap" : `/lessons/${lesson.id}`}
                          className={[
                            "flex items-center justify-between gap-4 rounded-2xl border p-4 transition hover:-translate-y-0.5",
                            completed
                              ? "border-emerald-500/35 bg-emerald-500/10"
                              : locked
                                ? "border-slate-700 bg-slate-900/50 opacity-70"
                              : firstUnfinished
                                ? "border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-950/20"
                                : "border-slate-700 bg-slate-800/70",
                          ].join(" ")}
                        >
                          <div className="flex items-center gap-4">
                            <span
                              className={[
                                "grid h-12 w-12 place-items-center rounded-full text-lg font-black text-white",
                                completed ? "bg-emerald-500" : locked ? "bg-slate-700" : "bg-teal-500",
                              ].join(" ")}
                            >
                              {index * 7 + lessonIndex + 1}
                            </span>
                            <div>
                              <h4 className="text-lg font-black text-white">
                                {lesson.title}
                              </h4>
                              <p className="mt-1 text-sm text-slate-400">
                                {locked ? "اجتز اختبار الدرس السابق 100% لفتحه" : "اضغط لفتح الدرس"}
                              </p>
                            </div>
                          </div>
                          {completed ? (
                            <CheckCircle2 className="h-6 w-6 text-emerald-300" />
                          ) : locked ? (
                            <Lock className="h-5 w-5 text-slate-400" />
                          ) : firstUnfinished ? (
                            <Flame className="h-6 w-6 text-amber-300" />
                          ) : (
                            <Lock className="h-5 w-5 text-slate-400" />
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-8 text-center">
              <p className="text-lg font-bold text-slate-300">
                لا توجد دروس مضافة لهذا المستوى حتى الآن.
              </p>
            </Card>
          )}
        </div>

        <section className="space-y-5">
          <h2 className="text-3xl font-black text-white">المستويات الأخرى</h2>
          {pathLevelConfigs
            .filter((config) => config.level !== currentLevel)
            .map((config) => {
              const levelLessons = lessons.filter(
                (lesson) => lesson.level === config.level,
              );
              const levelCompleted = levelLessons.filter(isLessonCompleted).length;
              const levelProgress = percent(levelCompleted, levelLessons.length);
              const unlocked = allowedLevels.includes(config.level);
              const isFuture =
                pathLevelConfigs.findIndex((item) => item.level === config.level) >
                currentLevelIndex;

              return (
                <Card key={config.level} className="overflow-hidden p-0">
                  <div className={`bg-gradient-to-l ${config.glow} to-transparent p-6`}>
                    <div className="flex flex-wrap items-center justify-between gap-5">
                      <div className="flex items-start gap-4">
                        <span className={`mt-1 h-20 w-2 rounded-full ${config.accent}`} />
                        <div>
                          <h3 className="text-3xl font-black text-white">
                            {config.code} - {config.title}
                          </h3>
                          <p className="mt-2 text-slate-400">
                            {config.description}
                          </p>
                          <p className="mt-3 text-sm font-bold text-slate-300">
                            {levelCompleted} من {levelLessons.length} مكتمل
                          </p>
                        </div>
                      </div>

                      <div className="text-center">
                        <p
                          className={[
                            "text-3xl font-black",
                            unlocked ? "text-emerald-300" : "text-slate-400",
                          ].join(" ")}
                        >
                          {levelLessons.length}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          {unlocked ? "متاح" : isFuture ? "قادم" : "سابق"}
                        </p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                        <span>{levelProgress}% مكتمل</span>
                        <span>{unlocked ? "متاح لك" : "يفتح بعد تقدمك"}</span>
                      </div>
                      <ProgressBar value={levelProgress} />
                    </div>
                  </div>
                </Card>
              );
            })}
        </section>

        <Card className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-white">
              <Trophy className="h-6 w-6 text-sky-300" />
              خطوتك التالية
            </h2>
            <p className="mt-2 text-slate-400">
              أكمل الدروس المفتوحة في مستواك الحالي ثم انتقل تدريجيا للمستوى التالي.
            </p>
          </div>
          <Link
            href="/lessons"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white shadow-lg shadow-blue-950/40 transition hover:bg-blue-500"
          >
            <Sparkles className="h-4 w-4" />
            متابعة التعلم
          </Link>
        </Card>

        {lockedLessons > 0 ? (
          <p className="text-center text-sm text-slate-500">
            يوجد {lockedLessons} درس في مستويات لاحقة سيظهر لك عند تقدمك في المسار.
          </p>
        ) : null}
      </div>
    </AppShell>
  );
}
