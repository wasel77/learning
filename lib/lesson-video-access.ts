import { getActiveLessonCatalog } from "@/lib/data";
import { getLessonAccessState } from "@/lib/lesson-access";
import { createClient } from "@/lib/supabase/server";
import type { ContentPackageScope, Level, SubscriptionPackage } from "@/lib/types";

export type AccessibleLesson = {
  id: string;
  bunny_video_id: string;
  level: Level;
  lesson_order: number;
  title: string;
  package_access: ContentPackageScope;
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

  const { data: profile } = await supabase
    .from("profiles")
    .select("level,is_active,subscription_package")
    .eq("id", user.id)
    .maybeSingle<{
      level: Level;
      is_active: boolean;
      subscription_package: SubscriptionPackage;
    }>();

  if (!profile || profile.is_active === false) {
    return { error: "Account disabled", status: 403 };
  }

  const catalog = await getActiveLessonCatalog();
  const access = getLessonAccessState(profile, catalog, lessonId);
  if (access === "missing") return { error: "Lesson not found", status: 404 };
  if (access === "package_locked") {
    return { error: "This content is not available for your package", status: 403 };
  }
  if (access === "progression_locked") {
    return { error: "Lesson is locked", status: 403 };
  }

  const { data: lesson } = await supabase
    .from("lessons")
    .select("id,title,bunny_video_id,level,lesson_order,package_access")
    .eq("id", lessonId)
    .eq("is_active", true)
    .maybeSingle<AccessibleLesson>();

  if (!lesson?.bunny_video_id) return { error: "Lesson not found", status: 404 };

  return { lesson };
}
