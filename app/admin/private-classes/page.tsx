import { AppShell } from "@/components/AppShell";
import {
  AdminInterventionForm,
  AttendanceCorrectionForm,
  CoachAdminForm,
  ReviewModerationForm,
} from "@/components/PrivateClassForms";
import { requireAdmin } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRiyadhDate } from "@/lib/private-classes";

export default async function AdminPrivateClassesPage() {
  const profile = await requireAdmin();
  const admin = createAdminClient();
  const [
    { data: coaches },
    { data: bookings },
    { data: reviews },
    { data: outbox },
  ] = await Promise.all([
    admin.from("private_class_coaches").select("*").order("created_at"),
    admin
      .from("private_class_bookings")
      .select("*")
      .order("starts_at", { ascending: false }),
    admin
      .from("private_class_reviews")
      .select("*")
      .order("created_at", { ascending: false }),
    admin
      .from("notification_email_outbox")
      .select("id,status")
      .eq("status", "pending"),
  ]);
  const profileIds = [
    ...new Set([
      ...(bookings ?? []).map((b) => b.student_id),
      ...(coaches ?? []).map((c) => c.user_id),
    ]),
  ];
  const { data: people } = profileIds.length
    ? await admin
        .from("profiles")
        .select("id,full_name,email")
        .in("id", profileIds)
    : { data: [] };
  const coachName = (id: string) =>
    coaches?.find((c) => c.id === id)?.display_name ?? "—";
  const person = (id: string) =>
    people?.find((p) => p.id === id)?.full_name ||
    people?.find((p) => p.id === id)?.email ||
    id;
  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-black">إدارة Private Classes</h1>
      <p className="mt-2 text-slate-400">
        الإدارة الحساسة محصورة بحساب الإدارة، وكل تصحيح حضور يُسجّل في Audit
        trail.
      </p>
      <section className="mt-8">
        <h2 className="text-2xl font-black">Coaches</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <CoachAdminForm />
          {(coaches ?? []).map((c) => (
            <CoachAdminForm key={c.id} coach={c} />
          ))}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-black">الحجوزات</h2>
        <div className="mt-4 grid gap-4">
          {(bookings ?? []).map((b) => (
            <article
              key={b.id}
              className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
            >
              <div className="grid gap-2 md:grid-cols-4">
                <p>
                  <span className="text-xs text-slate-500">العميلة</span>
                  <br />
                  {person(b.student_id)}
                </p>
                <p>
                  <span className="text-xs text-slate-500">الكوتش</span>
                  <br />
                  {coachName(b.coach_id)}
                </p>
                <p>
                  <span className="text-xs text-slate-500">الموعد</span>
                  <br />
                  {formatRiyadhDate(b.starts_at)}
                </p>
                <p>
                  <span className="text-xs text-slate-500">الحالة</span>
                  <br />
                  {b.status}
                </p>
              </div>
              <AttendanceCorrectionForm bookingId={b.id} status={b.status} />
              <AdminInterventionForm bookingId={b.id} />
            </article>
          ))}
        </div>
      </section>
      <section className="mt-10">
        <h2 className="text-2xl font-black">التقييمات</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {(reviews ?? []).map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-slate-700 bg-slate-900 p-5"
            >
              <p className="text-amber-300">{"★".repeat(r.stars)}</p>
              <p className="mt-3 leading-7">{r.comment}</p>
              <p className="mt-2 text-xs text-slate-500">
                {coachName(r.coach_id)} — {r.moderation_status}
              </p>
              <ReviewModerationForm
                reviewId={r.id}
                currentStatus={r.moderation_status}
                excluded={r.excluded_from_average}
              />
            </article>
          ))}
        </div>
      </section>
      <section className="mt-10 rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5">
        <h2 className="font-black">Email Outbox</h2>
        <p className="mt-2 text-sm text-slate-300">
          {outbox?.length ?? 0} رسالة بانتظار ربط مزود البريد الإنتاجي. إشعارات
          الموقع والـreminders تعمل بشكل مستقل.
        </p>
      </section>
    </AppShell>
  );
}
