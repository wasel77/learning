import { isLessonUnlocked } from "@/lib/lesson-locks";
import { getAllowedLevels } from "@/lib/learning-path";
import { createClient } from "@/lib/supabase/server";
import type { Level, SubscriptionPackage } from "@/lib/types";

export type AccessibleLesson = {
  id: string;
  bunny_video_id: string;
  level: Level;
  lesson_order: number;
  title: string;
};

export type LessonAccessResult =
  | { lesson: AccessibleLesson }
  | { error: string; status: number };

export async function getAccessibleLesson(lessonId: string): Promise<LessonAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized", status: 401 };

  const [{ data: profile }, { data: lesson }] = await Promise.all([
    supabase
      .from("profiles")
      .select("level,is_active,subscription_package")
      .eq("id", user.id)
      .maybeSingle<{
        level: Level;
        is_active: boolean;
        subscription_package: SubscriptionPackage;
      }>(),
    supabase
      .from("lessons")
      .select("id,title,bunny_video_id,level,lesson_order")
      .eq("id", lessonId)
      .eq("is_active", true)
      .maybeSingle<AccessibleLesson>(),
  ]);

  if (!profile || profile.is_active === false) {
    return { error: "Account disabled", status: 403 };
  }
  if (!lesson?.bunny_video_id) return { error: "Lesson not found", status: 404 };

  const allowedLevels = getAllowedLevels(profile.level, profile.subscription_package);
  if (!allowedLevels.includes(lesson.level)) {
    return { error: "Lesson not found", status: 404 };
  }

  const { data: availableLessons } = await supabase
    .from("lessons")
    .select("id,level,lesson_order,lesson_progress(completed,completed_at)")
    .in("level", allowedLevels)
    .eq("is_active", true)
    .order("level")
    .order("lesson_order");

  if (!isLessonUnlocked(lesson.id, availableLessons ?? [])) {
    return { error: "Lesson is locked", status: 403 };
  }

  return { lesson };
}
