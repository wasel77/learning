import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyLessonLocks } from "@/lib/lesson-locks";
import { getAllowedLevels } from "@/lib/learning-path";
import { canAccessPackageContent } from "@/lib/subscription-links";
import type {
  ContentPackageScope,
  Lesson,
  Level,
  Profile,
} from "@/lib/types";

type LessonCatalogRow = {
  id: string;
  level: Level;
  title: string;
  description: string | null;
  package_access: ContentPackageScope;
  lesson_order: number;
  duration_minutes: number | null;
  completed: boolean;
  completed_at: string | null;
};

export async function getActiveLessonCatalog() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_active_lesson_catalog");

  if (error) throw error;

  return ((data ?? []) as LessonCatalogRow[]).map((lesson) => ({
    id: lesson.id,
    level: lesson.level,
    title: lesson.title,
    description: lesson.description,
    package_access: lesson.package_access,
    lesson_order: lesson.lesson_order,
    duration_minutes: lesson.duration_minutes,
    is_active: true,
    summary: null,
    summary_links: null,
    vocabulary: null,
    bunny_video_id: null,
    created_at: "",
    lesson_progress: [
      {
        completed: lesson.completed,
        completed_at: lesson.completed_at,
      },
    ],
  })) satisfies Lesson[];
}

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireUser = cache(async () => {
  const user = await getUser();
  if (!user) redirect("/login");
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle<{ is_active: boolean }>();
  if (data?.is_active === false) redirect("/account-disabled");
  return user;
});

export const getProfile = cache(async () => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (error || !data) redirect("/login");
  if (data.is_active === false) redirect("/account-disabled");
  return data;
});

export async function requireAdmin() {
  const profile = await getProfile();
  if (profile.role !== "admin") redirect("/dashboard");
  return profile;
}

export async function requireCoach() {
  const profile = await getProfile();
  const admin = createAdminClient();
  const { data } = await admin
    .from("private_class_coaches")
    .select("id,user_id,display_name,bio,image_url,is_active,is_bookable")
    .eq("user_id", profile.id)
    .eq("is_active", true)
    .maybeSingle();
  if (!data) redirect("/private-classes");
  return { profile, coach: data };
}

export async function getDashboardData() {
  const profile = await getProfile();
  const supabase = await createClient();
  const levels = getAllowedLevels(profile.level, profile.subscription_package);

  const [attempt, lessons, live, notification, progressRows] = await Promise.all([
    supabase
      .from("test_attempts")
      .select("*")
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("lessons")
      .select("*, lesson_progress(completed, completed_at)")
      .in("level", levels)
      .eq("is_active", true)
      .order("lesson_order"),
    supabase
      .from("live_sessions")
      .select("*")
      .eq("is_active", true)
      .or(`applies_to_all.eq.true,level.in.(${levels.join(",")})`)
      .gte("end_time", new Date().toISOString())
      .order("start_time")
      .limit(1)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("lesson_progress")
      .select("completed_at")
      .eq("user_id", profile.id)
      .eq("completed", true)
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false }),
  ]);

  const lockedLessons = applyLessonLocks(lessons.data ?? []);
  const totalLessons = lockedLessons.length;
  const completedCount =
    lockedLessons.filter((lesson) => lesson.lesson_progress?.[0]?.completed).length ?? 0;
  const nextLesson = lockedLessons.find((lesson) => !lesson.lesson_progress?.[0]?.completed);
  const completedDates = progressRows.data?.map((row) => row.completed_at as string) ?? [];

  return {
    profile,
    attempt: attempt.data,
    totalLessons,
    completedCount,
    progress: totalLessons ? Math.round((completedCount / totalLessons) * 100) : 0,
    nextLesson,
    lessons: lockedLessons,
    completedDates,
    liveSession: live.data,
    notification: notification.data,
  };
}

export async function getLessonsForLevel(level: Level | null) {
  const profile = await getProfile();
  const lessons = await getActiveLessonCatalog();
  const allowedLevels = getAllowedLevels(
    level ?? profile.level,
    profile.subscription_package,
  );
  const accessibleLessons = lessons.filter(
    (lesson) =>
      allowedLevels.includes(lesson.level) &&
      canAccessPackageContent(profile.subscription_package, lesson.package_access),
  );
  const progressionLocks = new Map(
    applyLessonLocks(accessibleLessons).map((lesson) => [lesson.id, lesson.is_locked]),
  );

  return lessons.map((lesson) => ({
    ...lesson,
    is_package_locked: !canAccessPackageContent(
      profile.subscription_package,
      lesson.package_access,
    ),
    is_locked:
      !allowedLevels.includes(lesson.level) ||
      progressionLocks.get(lesson.id) !== false,
  }));
}
