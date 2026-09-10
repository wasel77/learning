import { AdminLessonsManager } from "@/components/AdminLessonsManager";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/data";
import type { Lesson, LessonQuestion } from "@/lib/types";

export default async function AdminLessonsPage() {
  const profile = await requireAdmin();
  const supabase = await createClient();
  const [lessonsResult, questionsResult] = await Promise.all([
    supabase.from("lessons").select("*").order("level").order("lesson_order"),
    supabase
      .from("lesson_questions")
      .select("*, options:lesson_question_options(*), lesson:lessons(id,title,level)")
      .order("question_order"),
  ]);

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-black">إدارة الدروس</h1>
      <p className="mt-2 text-sm text-slate-400">
        أضف الدروس من تبويب الدروس، ثم اربط أسئلة “اختبر نفسك” بكل درس من تبويب أسئلة الدروس.
      </p>
      <form action="/api/admin/bunny-transfer-test" method="post" className="mt-4">
        <button
          type="submit"
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400"
        >
          تشغيل اختبار نقل الدرس الأول (الجزء الثاني) إلى Bunny
        </button>
      </form>
      <AdminLessonsManager
        lessons={(lessonsResult.data ?? []) as Lesson[]}
        lessonQuestions={(questionsResult.data ?? []) as LessonQuestion[]}
      />
    </AppShell>
  );
}
