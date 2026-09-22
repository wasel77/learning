/* eslint-disable react-hooks/purity -- request-time server rendering intentionally checks policy windows */
import Link from "next/link";
import { Gem, Lock, CalendarPlus, Video, Clock3, Star } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  BookingForm,
  Countdown,
  RescheduleForm,
  ReviewForm,
} from "@/components/PrivateClassForms";
import { cancelPrivateClass } from "@/lib/private-class-actions";
import { getProfile } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  buildAvailableSlots,
  formatRiyadhDate,
  googleCalendarUrl,
} from "@/lib/private-classes";
import type {
  PrivateClassBooking,
  PrivateClassCoach,
  PrivateClassReview,
} from "@/lib/types";
import { DIAMOND_UPGRADE_URL } from "@/lib/subscription-links";

export default async function PrivateClassesPage() {
  const profile = await getProfile();
  const admin = createAdminClient();
  const supabase = await createClient();
  const [
    { data: coachRows },
    { data: bookingRows },
    { data: availability },
    { data: reviewRows },
  ] = await Promise.all([
    admin
      .from("private_class_coaches")
      .select("*")
      .eq("is_active", true)
      .order("display_name"),
    admin
      .from("private_class_bookings")
      .select("*")
      .eq("student_id", profile.id)
      .order("starts_at", { ascending: false }),
    admin
      .from("private_class_availability")
      .select("coach_id,blocked_date,start_time,is_blocked")
      .eq("is_blocked", true),
    admin
      .from("private_class_reviews")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);
  const coaches = (coachRows ?? []) as PrivateClassCoach[];
  const allReviews = (reviewRows ?? []) as PrivateClassReview[];
  for (const coach of coaches) {
    const eligible = allReviews.filter(
      (r) => r.coach_id === coach.id && !r.excluded_from_average,
    );
    coach.average_rating = eligible.length
      ? eligible.reduce((sum, r) => sum + r.stars, 0) / eligible.length
      : null;
    coach.rating_count = eligible.length;
  }
  const bookings = ((bookingRows ?? []) as PrivateClassBooking[]).map(
    (booking) => ({
      ...booking,
      coach: coaches.find((coach) => coach.id === booking.coach_id),
      has_review: allReviews.some((review) => review.booking_id === booking.id),
    }),
  );
  const activeBookings = await admin
    .from("private_class_bookings")
    .select("coach_id,starts_at,status")
    .neq("status", "cancelled")
    .gte("starts_at", new Date().toISOString());
  const slots = buildAvailableSlots(
    coaches,
    activeBookings.data ?? [],
    availability ?? [],
  );
  const monthKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const used = bookings.filter(
    (b) =>
      b.status !== "cancelled" &&
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Riyadh",
        year: "numeric",
        month: "2-digit",
      }).format(new Date(b.starts_at)) === monthKey,
  ).length;
  const next = bookings
    .filter(
      (b) => b.status === "scheduled" && new Date(b.starts_at) > new Date(),
    )
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
  const joinUrls = Object.fromEntries(
    await Promise.all(
      bookings
        .filter((b) => b.status === "scheduled")
        .map(async (b) => {
          const { data } = await supabase.rpc("private_class_join_url", {
            target_booking: b.id,
          });
          return [b.id, data as string | null];
        }),
    ),
  );
  const isDiamond = profile.subscription_package === "diamond";
  const isCoach = coaches.some((coach) => coach.user_id === profile.id);
  return (
    <AppShell profile={profile}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-black">
            <Gem className="text-sky-300" />
            الكلاسات الخاصة
          </h1>
          <p className="mt-2 text-slate-400">
            جلسات فردية لمدة 60 دقيقة بتوقيت الرياض.
          </p>
        </div>
        {isCoach ? (
          <Link
            href="/coach/private-classes"
            className="rounded-xl border border-sky-400/30 px-4 py-3 font-bold text-sky-200"
          >
            لوحة الكوتش
          </Link>
        ) : null}
      </div>
      {!isDiamond ? (
        <section className="mt-8 rounded-3xl border border-amber-400/25 bg-gradient-to-l from-amber-500/10 to-slate-900 p-8 text-center">
          <Lock className="mx-auto h-12 w-12 text-amber-300" />
          <h2 className="mt-4 text-2xl font-black">
            الكلاسات الخاصة حصرية للألماسي 💎
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-8 text-slate-300">
            4 جلسات خاصة شهريًا مع كوتش تختارينها، وحجز الموعد المناسب لك.
            <br />
            رقّي للألماسي لفتح الميزة.
          </p>
          <a
            href={DIAMOND_UPGRADE_URL}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-amber-300 px-5 text-sm font-black text-amber-950 transition hover:bg-amber-200"
          >
            الترقية للألماسية
          </a>
        </section>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-sky-400/20 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">رصيد الشهر</p>
              <p className="mt-2 text-3xl font-black text-sky-300">
                {Math.max(0, 4 - used)} / 4
              </p>
            </div>
            <div className="rounded-2xl border border-violet-400/20 bg-slate-900 p-5 md:col-span-2">
              <p className="text-sm text-slate-400">الجلسة القادمة</p>
              <p className="mt-2 font-black">
                {next ? formatRiyadhDate(next.starts_at) : "ما عندك جلسة قادمة"}
              </p>
              {next ? (
                <p className="mt-2 text-sm text-violet-200">
                  <Countdown startsAt={next.starts_at} />
                </p>
              ) : null}
            </div>
          </section>
          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.25fr]">
            <div className="space-y-4">
              <h2 className="text-xl font-black">اختاري الكوتش</h2>
              {coaches
                .filter((c) => c.is_bookable)
                .map((coach) => (
                  <article
                    key={coach.id}
                    className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
                  >
                    <h3 className="text-lg font-black">{coach.display_name}</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-400">
                      {coach.bio}
                    </p>
                    <p className="mt-3 flex items-center gap-2 text-amber-300">
                      <Star className="h-4 w-4 fill-current" />
                      {coach.average_rating?.toFixed(1) ?? "جديد"}{" "}
                      <span className="text-xs text-slate-500">
                        ({coach.rating_count})
                      </span>
                    </p>
                    {allReviews
                      .filter(
                        (r) =>
                          r.coach_id === coach.id &&
                          r.moderation_status === "approved",
                      )
                      .slice(0, 2)
                      .map((r) => (
                        <blockquote
                          key={r.id}
                          className="mt-3 rounded-xl bg-slate-950 p-3 text-xs text-slate-300"
                        >
                          {"★".repeat(r.stars)} — {r.comment}
                        </blockquote>
                      ))}
                  </article>
                ))}
            </div>
            <BookingForm
              coaches={coaches
                .filter((c) => c.is_bookable)
                .map((c) => ({ id: c.id, display_name: c.display_name }))}
              slots={slots}
            />
          </section>
        </>
      )}
      <section className="mt-10">
        <h2 className="text-2xl font-black">مواعيدي / جلساتي الخاصة</h2>
        <div className="mt-5 grid gap-5">
          {bookings.length ? (
            bookings.map((booking) => {
              const canChange =
                booking.status === "scheduled" &&
                new Date(booking.starts_at).getTime() - Date.now() >=
                  12 * 3600000;
              const coachSlots = slots.filter(
                (s) => s.coachId === booking.coach_id,
              );
              return (
                <article
                  key={booking.id}
                  className="rounded-2xl border border-slate-700 bg-slate-900/80 p-5"
                >
                  <div className="flex flex-wrap justify-between gap-4">
                    <div>
                      <h3 className="font-black">
                        {booking.coach?.display_name}
                      </h3>
                      <p className="mt-2 text-sm text-slate-300">
                        {formatRiyadhDate(booking.starts_at)}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        الحالة: {booking.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {joinUrls[booking.id] ? (
                        <a
                          href={joinUrls[booking.id]!}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold"
                        >
                          <Video className="h-4 w-4" />
                          انضمي للجلسة
                        </a>
                      ) : booking.status === "scheduled" ? (
                        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-xs text-slate-400">
                          <Clock3 className="h-4 w-4" />
                          يظهر قبل الموعد بـ15 دقيقة
                        </span>
                      ) : null}
                      <a
                        href={googleCalendarUrl(
                          booking,
                          booking.coach?.display_name ?? "الكوتش",
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 px-4 py-2 text-sm text-sky-200"
                      >
                        <CalendarPlus className="h-4 w-4" />
                        Add to Calendar
                      </a>
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-amber-200">
                    الإلغاء وإعادة الجدولة متاحة قبل الموعد بـ12 ساعة أو أكثر.
                  </p>
                  {canChange ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <form action={cancelPrivateClass.bind(null, booking.id)}>
                        <button className="w-full rounded-xl border border-red-400/30 px-4 py-3 text-sm font-bold text-red-200">
                          إلغاء الحجز
                        </button>
                      </form>
                      <RescheduleForm
                        bookingId={booking.id}
                        slots={coachSlots}
                      />
                    </div>
                  ) : null}
                  {booking.status === "completed" && !booking.has_review ? (
                    <ReviewForm bookingId={booking.id} />
                  ) : null}
                </article>
              );
            })
          ) : (
            <p className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-slate-500">
              لا توجد جلسات بعد.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}
