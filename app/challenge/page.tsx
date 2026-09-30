import { AppShell } from "@/components/AppShell";
import { VocabularyChallengeClient } from "@/components/VocabularyChallengeClient";
import { getActiveLessonCatalog, getProfile } from "@/lib/data";
import { getLessonAccessState } from "@/lib/lesson-access";
import { createClient } from "@/lib/supabase/server";
import type { LessonVocabularyItem } from "@/lib/types";

function normalizeVocabulary(value: unknown): LessonVocabularyItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const term = String(record.term ?? "").trim();
      const definition = String(record.definition ?? "").trim();
      return term && definition ? { term, definition } : null;
    })
    .filter(Boolean) as LessonVocabularyItem[];
}

export default async function ChallengePage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const catalog = await getActiveLessonCatalog();
  const accessibleLessonIds = catalog
    .filter((lesson) => getLessonAccessState(profile, catalog, lesson.id) === "allowed")
    .map((lesson) => lesson.id);
  const { data } = await supabase
    .from("lessons")
    .select("title,vocabulary")
    .eq("is_active", true)
    .in("id", accessibleLessonIds.length ? accessibleLessonIds : ["00000000-0000-0000-0000-000000000000"])
    .order("level")
    .order("lesson_order");

  const cards =
    data?.flatMap((lesson) =>
      normalizeVocabulary(lesson.vocabulary).map((item) => ({
        term: item.term,
        definition: item.definition,
        lessonTitle: String(lesson.title ?? "درس غير معروف"),
      })),
    ) ?? [];

  return (
    <AppShell profile={profile}>
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <p className="text-sm font-bold text-sky-300">اختبار مفردات الدروس</p>
          <h1 className="mt-2 text-4xl font-black text-white">التحدي</h1>
          <p className="mt-3 max-w-3xl leading-7 text-slate-400">
            يظهر لك مصطلح من مفردات الدروس، وتكتب التعريف الذي أضافه الأدمن.
            في النهاية تحصل على نتيجتك لتعرف مدى إتقانك للمفردات.
          </p>
        </div>
        <VocabularyChallengeClient cards={cards} />
      </div>
    </AppShell>
  );
}
