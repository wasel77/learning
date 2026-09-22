import { AppShell } from "@/components/AppShell";
import { LessonLevelTabs } from "@/components/LessonLevelTabs";
import { getLessonsForLevel, getProfile } from "@/lib/data";
import { levels } from "@/lib/learning-path";

export default async function LessonsPage() {
  const profile = await getProfile();
  const lessons = await getLessonsForLevel(profile.level);

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-black">الدروس</h1>
      <p className="mt-3 text-slate-400">تظهر لك الدروس المتاحة حسب مستواك الحالي، مقسمة حسب المستوى.</p>
      <LessonLevelTabs
        levels={levels}
        lessons={lessons}
        emptyDescription="أضف دروسا من لوحة الإدارة."
      />
    </AppShell>
  );
}
