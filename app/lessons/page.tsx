import { AppShell } from "@/components/AppShell";
import { LessonLevelTabs } from "@/components/LessonLevelTabs";
import { getLessonsForLevel, getProfile } from "@/lib/data";
import { getAllowedLevels } from "@/lib/learning-path";
import type { Level } from "@/lib/types";

export default async function LessonsPage() {
  const profile = await getProfile();
  const lessons = await getLessonsForLevel(profile.level);
  const levels = getAllowedLevels(profile.level, profile.subscription_package) as Level[];

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
