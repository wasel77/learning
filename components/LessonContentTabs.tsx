"use client";

import Link from "next/link";
import { BookOpen, Brain, Clock3, ExternalLink, FileText, Play } from "lucide-react";
import { useState } from "react";
import { LessonPlayer } from "@/components/LessonPlayer";
import { Card } from "@/components/ui/card";
import type { LessonSummaryLink, LessonVocabularyItem } from "@/lib/types";

type LessonTab = "video" | "vocabulary" | "summary" | "quiz";

type LessonContentTabsProps = {
  lessonId: string;
  title: string;
  driveFileId: string;
  durationMinutes: number | null;
  summary: string | null;
  summaryLinks: LessonSummaryLink[];
  vocabulary: LessonVocabularyItem[];
  initialTab?: Exclude<LessonTab, "quiz">;
  videoProvider?: "drive" | "bunny";
};

const tabs = [
  { id: "video", label: "الفيديو", icon: Play },
  { id: "vocabulary", label: "المفردات", icon: BookOpen },
  { id: "summary", label: "الملخص", icon: FileText },
  { id: "quiz", label: "الاختبار", icon: Brain },
] satisfies { id: LessonTab; label: string; icon: typeof Play }[];

export function LessonContentTabs({
  lessonId,
  title,
  driveFileId,
  durationMinutes,
  summary,
  summaryLinks,
  vocabulary,
  initialTab = "video",
  videoProvider = "drive",
}: LessonContentTabsProps) {
  const [activeTab, setActiveTab] = useState<LessonTab>(initialTab);

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid gap-2 border-b border-slate-800 bg-slate-950/70 p-3 md:grid-cols-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          if (tab.id === "quiz") {
            return (
              <Link
                key={tab.id}
                href={`/lessons/${lessonId}/quiz`}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </Link>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={[
                "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-black transition",
                active
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white",
              ].join(" ")}
              aria-pressed={active}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="p-3 sm:p-6 md:p-8">
        {activeTab === "video" ? (
          <div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-6 sm:gap-4">
              <h2 className="text-xl font-black text-white sm:text-3xl">شاهد وتعلم</h2>
              <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-sky-400/10 px-3 py-1 text-xs font-bold text-sky-200">
                <Clock3 className="h-3 w-3" />
                {durationMinutes ?? 0} دقيقة
              </span>
            </div>
            <div className="-mx-3 sm:mx-0">
              <LessonPlayer
                lessonId={lessonId}
                driveFileId={driveFileId}
                title={title}
                videoProvider={videoProvider}
              />
            </div>
          </div>
        ) : null}

        {activeTab === "vocabulary" ? (
          <div>
            <div className="mb-6 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-sky-300" />
              <h2 className="text-3xl font-black text-white">المفردات</h2>
            </div>
            {vocabulary.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {vocabulary.map((item, index) => (
                  <div
                    key={`${item.term}-${index}`}
                    className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5"
                  >
                    <p className="text-xl font-black text-sky-300">
                      {item.term || `مصطلح ${index + 1}`}
                    </p>
                    <p className="mt-3 leading-7 text-slate-300">
                      {item.definition || "لا يوجد تعريف مضاف."}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-6 text-slate-400">
                لا توجد مفردات مضافة لهذا الدرس حتى الآن.
              </div>
            )}
          </div>
        ) : null}

        {activeTab === "summary" ? (
          <div>
            <div className="mb-6 flex items-center gap-2">
              <FileText className="h-6 w-6 text-sky-300" />
              <h2 className="text-3xl font-black text-white">الملخص</h2>
            </div>
            {summary ? (
              <p className="whitespace-pre-line text-lg leading-9 text-slate-300">
                {summary}
              </p>
            ) : (
              <p className="text-slate-400">
                لا يوجد ملخص مضاف لهذا الدرس حتى الآن.
              </p>
            )}
            {summaryLinks.length ? (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {summaryLinks.map((item, index) => (
                  <a
                    key={`${item.url}-${index}`}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-between gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm font-bold text-sky-100 transition hover:border-sky-300/50 hover:bg-sky-400/15"
                  >
                    <span className="min-w-0 truncate">{item.label}</span>
                    <ExternalLink className="h-4 w-4 shrink-0" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
