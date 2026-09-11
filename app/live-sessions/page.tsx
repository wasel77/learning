import { CalendarDays, Clock3 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { LiveSessionCard } from "@/components/LiveSessionCard";
import { Card } from "@/components/ui/card";
import { getProfile } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { LiveSession } from "@/lib/types";
import {
  formatArabicDate,
  getSaudiDateKey,
  getSaudiDateParts,
  SAUDI_TIME_ZONE,
} from "@/lib/utils";
import { getAllowedLevels } from "@/lib/learning-path";

const weekDays = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

function buildCalendarDays(referenceDate: Date) {
  const { year, month } = getSaudiDateParts(referenceDate);
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate();
  const leadingDays = new Date(Date.UTC(year, month - 1, 1, 12)).getUTCDay();

  return [
    ...Array.from({ length: leadingDays }, (_, index) => ({
      key: `empty-${index}`,
      date: null,
    })),
    ...Array.from({ length: daysInMonth }, (_, index) => ({
      key: `day-${index + 1}`,
      date: new Date(Date.UTC(year, month - 1, index + 1, 12)),
    })),
  ];
}

function LiveSessionsCalendar({
  sessions,
  now,
}: {
  sessions: LiveSession[];
  now: Date;
}) {
  const calendarDays = buildCalendarDays(now);
  const monthLabel = new Intl.DateTimeFormat("ar-EG", {
    timeZone: SAUDI_TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(now);
  const todayKey = getSaudiDateKey(now);

  return (
    <Card className="mt-8 overflow-hidden p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <p className="text-sm font-bold text-sky-300">تقويم الحصص القادمة</p>
          <h2 className="mt-1 text-2xl font-black text-white">{monthLabel}</h2>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-100">
          <CalendarDays className="h-4 w-4" />
          {sessions.length} حصة قادمة
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-400">
        {weekDays.map((day) => (
          <div key={day} className="rounded-xl bg-slate-950/70 px-2 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {calendarDays.map(({ key, date }) => {
          if (!date) {
            return (
              <div
                key={key}
                className="min-h-28 rounded-2xl border border-transparent"
              />
            );
          }

          const dateKey = getSaudiDateKey(date);
          const daySessions = sessions.filter((session) => getSaudiDateKey(session.start_time) === dateKey);
          const isToday = dateKey === todayKey;

          return (
            <div
              key={key}
              className={[
                "min-h-28 rounded-2xl border p-2 transition",
                daySessions.length
                  ? "border-sky-400/40 bg-sky-400/10 shadow-lg shadow-blue-950/20"
                  : "border-slate-800 bg-slate-950/50",
                isToday ? "ring-2 ring-blue-500/70" : "",
              ].join(" ")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-black text-white">
                  {date.getUTCDate()}
                </span>
                {daySessions.length ? (
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-black text-white">
                    {daySessions.length}
                  </span>
                ) : null}
              </div>

              <div className="mt-2 space-y-1">
                {daySessions.slice(0, 2).map((session) => (
                  <div
                    key={session.id}
                    className="rounded-xl border border-slate-700 bg-slate-900/90 px-2 py-1.5 text-right"
                  >
                    <p className="truncate text-[11px] font-bold text-slate-100">
                      {session.title}
                    </p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-400">
                      <Clock3 className="h-3 w-3 text-sky-300" />
                      {formatArabicDate(session.start_time, {
                        dateStyle: undefined,
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                ))}
                {daySessions.length > 2 ? (
                  <p className="text-[10px] font-bold text-sky-300">
                    +{daySessions.length - 2} حصص أخرى
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default async function LiveSessionsPage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const now = new Date();
  const levels = getAllowedLevels(profile.level, profile.subscription_package);
  const { data } = await supabase
    .from("live_sessions")
    .select("*")
    .eq("is_active", true)
    .gte("end_time", now.toISOString())
    .or(`applies_to_all.eq.true,level.in.(${levels.join(",")})`)
    .order("start_time");

  const sessions = (data ?? []) as LiveSession[];

  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-black">الحصص المباشرة</h1>
      <p className="mt-3 max-w-3xl text-slate-400">
        تقويم واضح لكل الحصص القادمة وروابط الانضمام. يظهر العد التنازلي تلقائيا
        .عندما يتبقى أقل من 24 ساعة على بداية الحصة. كل الأوقات المعروضة بتوقيت السعودية.
      </p>

      {sessions.length ? (
        <>
          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {sessions.map((session) => (
              <LiveSessionCard
                key={session.id}
                session={session}
                now={now.getTime()}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="mt-8">
          <EmptyState title="لا توجد حصص قادمة حاليا" />
        </div>
      )}
      <LiveSessionsCalendar sessions={sessions} now={now} />
    </AppShell>
  );
}
