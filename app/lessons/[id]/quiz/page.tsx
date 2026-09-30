import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { LessonQuizClient } from "@/components/LessonQuizClient";
import { LevelBadge } from "@/components/LevelBadge";
import { PackageLockedState } from "@/components/PackageLockedState";
import { ProgressionLockedState } from "@/components/ProgressionLockedState";
import { buttonClassName } from "@/components/ui/button";
import { getActiveLessonCatalog, getProfile } from "@/lib/data";
import { getLessonAccessState } from "@/lib/lesson-access";
import { createClient } from "@/lib/supabase/server";
import type { LessonQuestion } from "@/lib/types";

export default async function LessonQuizPage(props: PageProps<"/lessons/[id]/quiz">) {
  const { id } = await props.params;
  const profile = await getProfile();
  const supabase = await createClient();
  const catalog = await getActiveLessonCatalog();
  const catalogLesson = catalog.find((lesson) => lesson.id === id);
  const access = getLessonAccessState(profile, catalog, id);

  if (!catalogLesson || access === "missing") notFound();
  if (access === "package_locked") {
    return (
      <AppShell profile={profile}>
        <PackageLockedState title={catalogLesson.title} />
      </AppShell>
    );
  }
  if (access === "progression_locked") {
    return (
      <AppShell profile={profile}>
        <ProgressionLockedState title={catalogLesson.title} />
      </AppShell>
    );
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!lesson) notFound();

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
