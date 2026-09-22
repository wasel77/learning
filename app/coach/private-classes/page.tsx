/* eslint-disable react-hooks/purity -- request-time server rendering intentionally checks attendance windows */
import { AppShell } from "@/components/AppShell";
import {
  AvailabilityForm,
  RescheduleForm,
  ZoomForm,
} from "@/components/PrivateClassForms";
import { recordPrivateClassAttendance } from "@/lib/private-class-actions";
import { requireCoach } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildAvailableSlots, formatRiyadhDate } from "@/lib/private-classes";
import type { PrivateClassBooking, PrivateClassCoach } from "@/lib/types";

export default async function CoachPrivateClassesPage() {
  const { profile, coach } = await requireCoach();
  const admin = createAdminClient();
  const [{ data: bookingsData }, { data: availability }, { data: occupied }] =
    await Promise.all([
      admin
        .from("private_class_bookings")
        .select("*")
        .eq("coach_id", coach.id)
        .order("starts_at", { ascending: false }),
      admin
        .from("private_class_availability")
        .select("coach_id,blocked_date,start_time,is_blocked")
        .eq("coach_id", coach.id)
        .order("blocked_date"),
      admin
        .from("private_class_bookings")
        .select("coach_id,starts_at,status")
        .eq("coach_id", coach.id)
        .neq("status", "cancelled")
        .gte("starts_at", new Date().toISOString()),
    ]);
  const studentIds = [
    ...new Set((bookingsData ?? []).map((b) => b.student_id)),
  ];
  const { data: students } = studentIds.length
    ? await admin
        .from("profiles")
        .select("id,full_name,email")
        .in("id", studentIds)
    : { data: [] };
  const bookings = (bookingsData ?? []).map((b) => ({
    ...b,
    student: students?.find((s) => s.id === b.student_id),
  })) as PrivateClassBooking[];
  const slots = buildAvailableSlots(
    [coach as PrivateClassCoach],
    occupied ?? [],
    availability ?? [],
  ).map(({ value, label }) => ({ value, label }));
  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-black">
        جلساتي الخاصة — {coach.display_name}
      </h1>
      <p className="mt-2 text-slate-400">
        تشوفين حجوزاتك فقط، وتديرين الرابط والتوفر والحضور.
      </p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div>
          <AvailabilityForm />
          <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="font-black">الأوقات المغلقة</h2>
            {(availability ?? [])
              .filter((a) => a.is_blocked)
              .map((a) => (
                <p
                  key={`${a.blocked_date}-${a.start_time}`}
                  className="mt-2 text-sm text-slate-400"
                >
                  {a.blocked_date} —{" "}
                  {a.start_time.startsWith("00:00")
                    ? "اليوم كامل"
                    : a.start_time.slice(0, 5)}
                </p>
              ))}
          </div>
        </div>
        <div className="grid gap-5">
          {bookings.map((booking) => {
            const canAttend =
              booking.status === "scheduled" &&
              Date.now() >= new Date(booking.ends_at).getTime();
            const canMove =
              booking.status === "scheduled" &&
              new Date(booking.starts_at).getTime() - Date.now() >=
                12 * 3600000;
            return (
              <article
                key={booking.id}
                className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h2 className="font-black">
                      {booking.student?.full_name || booking.student?.email}
                    </h2>
                    <p className="mt-2 text-sm text-slate-300">
                      {formatRiyadhDate(booking.starts_at)}
                    </p>
                    <p className="mt-2 text-sm text-sky-300" dir="ltr">
                      @{booking.telegram_username}
                    </p>
                  </div>
                  <span className="h-fit rounded-full bg-slate-800 px-3 py-1 text-xs">
                    {booking.status}
                  </span>
                </div>
                {booking.status === "scheduled" ? (
                  <ZoomForm
                    bookingId={booking.id}
                    currentUrl={booking.zoom_url}
                  />
                ) : null}
                {canMove ? (
                  <RescheduleForm
                    bookingId={booking.id}
                    slots={slots}
                    asCoach
                  />
                ) : null}
                {canAttend ? (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <form
                      action={recordPrivateClassAttendance.bind(
                        null,
                        booking.id,
                        true,
                      )}
                    >
                      <button className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold">
                        حضرت العميلة
                      </button>
                    </form>
                    <form
                      action={recordPrivateClassAttendance.bind(
                        null,
                        booking.id,
                        false,
                      )}
                    >
                      <button className="w-full rounded-xl border border-red-400/40 px-4 py-3 font-bold text-red-200">
                        لم تحضر العميلة
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
