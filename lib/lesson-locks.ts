import type { Lesson } from "@/lib/types";
import { getLevelOrder } from "@/lib/learning-path";

type LockableLesson = Pick<Lesson, "id" | "level" | "lesson_order" | "lesson_progress">;

export function isLessonCompleted(lesson: LockableLesson) {
  return lesson.lesson_progress?.some((progress) => progress.completed) ?? false;
}

export function sortLessonsByPath<T extends Pick<Lesson, "level" | "lesson_order">>(lessons: T[]) {
  return [...lessons].sort((first, second) => {
    const byLevel = getLevelOrder(first.level) - getLevelOrder(second.level);
    if (byLevel !== 0) return byLevel;
    return first.lesson_order - second.lesson_order;
  });
}

export function applyLessonLocks<T extends LockableLesson>(lessons: T[]) {
  let foundCurrentLesson = false;

  return sortLessonsByPath(lessons).map((lesson) => {
    const completed = isLessonCompleted(lesson);
    const is_locked = foundCurrentLesson;

    if (!completed && !foundCurrentLesson) {
      foundCurrentLesson = true;
    }

    return {
      ...lesson,
      is_locked,
    };
  });
}

export function isLessonUnlocked(lessonId: string, lessons: LockableLesson[]) {
  return applyLessonLocks(lessons).some((lesson) => lesson.id === lessonId && !lesson.is_locked);
}
