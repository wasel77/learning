import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { LessonQuizClient } from "@/components/LessonQuizClient";
import { LevelBadge } from "@/components/LevelBadge";
import { buttonClassName } from "@/components/ui/button";
import { getProfile } from "@/lib/data";
import { isLessonUnlocked } from "@/lib/lesson-locks";
import { getAllowedLevels } from "@/lib/learning-path";
import { createClient } from "@/lib/supabase/server";
import type { LessonQuestion } from "@/lib/types";

export default async function LessonQuizPage(props: PageProps<"/lessons/[id]/quiz">) {
  const { id } = await props.params;
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  const allowedLevels = getAllowedLevels(profile.level, profile.subscription_package);
  if (!lesson || !allowedLevels.includes(lesson.level)) notFound();

  const { data: availableLessons } = await supabase
    .from("lessons")
    .select("id,level,lesson_order,lesson_progress(completed,completed_at)")
    .in("level", allowedLevels)
    .eq("is_active", true)
    .order("level")
    .order("lesson_order");

  if (!isLessonUnlocked(id, availableLessons ?? [])) notFound();

  const { data } = await supabase
    .from("lesson_questions")
    .select("*, options:lesson_question_options(*)")
    .eq("lesson_id", id)
    .eq("is_active", true)
    .order("question_order");

  const questions = (data ?? []) as LessonQuestion[];

  return (
    <AppShell profile={profile}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <LevelBadge level={lesson.level} />
          <h1 className="mt-4 text-3xl font-black">اختبر نفسك: {lesson.title}</h1>
          <p className="mt-2 text-sm text-slate-400">اختبار سريع للتأكد من فهمك للدرس.</p>
        </div>
        <Link href={`/lessons/${id}`} className={buttonClassName("secondary")}>
          العودة للدرس
        </Link>
      </div>
      {questions.length ? (
        <LessonQuizClient lessonId={id} questions={questions} />
      ) : (
        <EmptyState title="لا توجد أسئلة لهذا الدرس بعد" description="سيظهر الاختبار هنا بعد إضافة الأسئلة من لوحة الإدارة." />
      )}
    </AppShell>
  );
}
