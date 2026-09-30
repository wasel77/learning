import { isLessonUnlocked } from "./lesson-locks";
import { getAllowedLevels } from "./learning-path";
import { canAccessPackageContent } from "./subscription-links";
import type { Lesson, Level, SubscriptionPackage } from "./types";

export type LessonAccessState =
  | "allowed"
  | "package_locked"
  | "progression_locked"
  | "missing";

type AccessProfile = {
  level: Level | null;
  subscription_package: SubscriptionPackage;
};

type AccessLesson = Pick<
  Lesson,
  "id" | "level" | "lesson_order" | "lesson_progress" | "package_access"
>;

export function getLessonAccessState(
  profile: AccessProfile,
  lessons: AccessLesson[],
  lessonId: string,
): LessonAccessState {
  const lesson = lessons.find((item) => item.id === lessonId);
  if (!lesson) return "missing";

  if (!canAccessPackageContent(profile.subscription_package, lesson.package_access)) {
    return "package_locked";
  }

  const allowedLevels = getAllowedLevels(
    profile.level,
    profile.subscription_package,
  );
  if (!allowedLevels.includes(lesson.level)) return "progression_locked";

  const progressionLessons = lessons.filter(
    (item) =>
      allowedLevels.includes(item.level) &&
      canAccessPackageContent(profile.subscription_package, item.package_access),
  );

  return isLessonUnlocked(lessonId, progressionLessons)
    ? "allowed"
    : "progression_locked";
}

export function applyLessonAccess<T extends AccessLesson>(
  profile: AccessProfile,
  lessons: T[],
) {
  return lessons.map((lesson) => {
    const access = getLessonAccessState(profile, lessons, lesson.id);
    return {
      ...lesson,
      is_package_locked: access === "package_locked",
      is_locked: access !== "allowed",
    };
  });
}
