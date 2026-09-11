"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { AdminForm } from "@/components/AdminForm";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { deleteLesson } from "@/lib/actions";
import { cn, getContentPackageScopeLabel, getLevelLabel } from "@/lib/utils";
import type { Lesson, Level } from "@/lib/types";
import { levels } from "@/lib/learning-path";

export function AdminLessonTabs({ lessons }: { lessons: Lesson[] }) {
  const [activeLevel, setActiveLevel] = useState<Level>("beginner");
  const visibleLessons = lessons.filter((lesson) => lesson.level === activeLevel);

  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
        {levels.map((level) => {
          const count = lessons.filter((lesson) => lesson.level === level).length;
          return (
            <button
              key={level}
              type="button"
              onClick={() => setActiveLevel(level)}
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-bold transition",
                activeLevel === level
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/30"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
              )}
            >
              {getLevelLabel(level)}
              <span className="ms-2 rounded-full bg-slate-950/40 px-2 py-0.5 text-[11px]">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-5 grid gap-4">
        {visibleLessons.map((lesson) => (
          <div key={lesson.id} className="space-y-3">
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-white">{lesson.title}</h2>
                  <p className="mt-2 text-sm text-slate-400">{lesson.description || "لا يوجد وصف"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-slate-300">
                    ترتيب {lesson.lesson_order}
                  </span>
                  <span className="rounded-full bg-amber-400/10 px-3 py-1 font-bold text-amber-200">
                    {getContentPackageScopeLabel(lesson.package_access)}
                  </span>
                  <span
                    className={
                      lesson.is_active
                        ? "rounded-full bg-emerald-400/10 px-3 py-1 text-emerald-200"
                        : "rounded-full bg-red-400/10 px-3 py-1 text-red-200"
                    }
                  >
                    {lesson.is_active ? "نشط" : "غير نشط"}
                  </span>
                  <form action={deleteLesson.bind(null, lesson.id)}>
                    <Button variant="danger" size="sm">
                      <Trash2 className="h-4 w-4" />
                      حذف الدرس
                    </Button>
                  </form>
                </div>
              </div>
            </Card>

            <details className="rounded-2xl border border-slate-800 bg-slate-950/40 p-3">
              <summary className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-sky-300">
                <Pencil className="h-4 w-4" />
                تعديل الدرس
              </summary>
              <div className="mt-4">
                <AdminForm type="lesson" lesson={lesson} />
              </div>
            </details>
          </div>
        ))}
        {!visibleLessons.length ? (
          <Card className="p-6 text-slate-400">لا توجد دروس في هذا المستوى.</Card>
        ) : null}
      </div>
    </div>
  );
}
