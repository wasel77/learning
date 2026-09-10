import { isLessonUnlocked } from "@/lib/lesson-locks";
import { createClient } from "@/lib/supabase/server";
import { getAllowedLevels } from "@/lib/utils";

export type AccessibleLesson = {
  id: string;
  drive_file_id: string;
  level: string;
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
      .select("level,is_active")
      .eq("id", user.id)
      .maybeSingle<{ level: string; is_active: boolean }>(),
    supabase
      .from("lessons")
      .select("id,title,drive_file_id,level,lesson_order")
      .eq("id", lessonId)
      .eq("is_active", true)
      .maybeSingle<AccessibleLesson>(),
  ]);

  if (!profile || profile.is_active === false) {
    return { error: "Account disabled", status: 403 };
  }
  if (!lesson) return { error: "Lesson not found", status: 404 };

  const allowedLevels = getAllowedLevels(profile.level);
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
