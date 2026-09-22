"use client";

import { useActionState, useEffect, useState } from "react";
import {
  bookPrivateClass,
  reschedulePrivateClass,
  setPrivateClassZoom,
  submitPrivateClassReview,
  setPrivateClassAvailability,
  savePrivateClassCoach,
  moderatePrivateClassReview,
  adminCorrectAttendance,
  adminIntervenePrivateClass,
  type PrivateClassActionState,
} from "@/lib/private-class-actions";

const initialState: PrivateClassActionState = {};
const field =
  "w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-sky-400";
const button =
  "rounded-xl bg-gradient-to-l from-sky-400 to-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50";

function Result({ state }: { state: PrivateClassActionState }) {
  if (!state.error && !state.success) return null;
  return (
    <p
      role="status"
      className={`rounded-xl border px-4 py-3 text-sm ${state.error ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"}`}
    >
      {state.error || state.success}
    </p>
  );
}

export function BookingForm({
  coaches,
  slots,
}: {
  coaches: { id: string; display_name: string }[];
  slots: { value: string; label: string; coachId: string }[];
}) {
  const [state, action, pending] = useActionState(
    bookPrivateClass,
    initialState,
  );
  const [coachId, setCoachId] = useState(coaches[0]?.id ?? "");
  const coachSlots = slots.filter((slot) => slot.coachId === coachId);
  return (
    <form
      action={action}
      className="grid gap-4 rounded-2xl border border-sky-400/20 bg-slate-900/70 p-5"
    >
      <h2 className="text-xl font-black">احجزي جلستك</h2>
      <label className="grid gap-2 text-sm font-bold">
        الكوتش
        <select
          name="coach_id"
          value={coachId}
          onChange={(e) => setCoachId(e.target.value)}
          className={field}
          required
        >
          {coaches.map((coach) => (
            <option key={coach.id} value={coach.id}>
              {coach.display_name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold">
        الموعد المتاح
        <select name="starts_at" className={field} required key={coachId}>
          <option value="">اختاري التاريخ والوقت</option>
          {coachSlots.map((slot) => (
            <option key={slot.value} value={slot.value}>
              {slot.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold">
        اسم مستخدم تيليجرام
        <input
          name="telegram_username"
          dir="ltr"
          placeholder="@username"
          className={field}
          required
          pattern="@?[A-Za-z0-9_]{5,32}"
        />
      </label>
      <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm leading-7 text-amber-100">
        يمكن الإلغاء أو إعادة الجدولة قبل الموعد بـ12 ساعة أو أكثر. بعد ذلك
        تُحسب الجلسة، والـNo-show يُحسب من رصيدك الشهري.
      </div>
      <Result state={state} />
      <button disabled={pending || !coachSlots.length} className={button}>
        {pending ? "جاري التأكيد..." : "تأكيد الحجز"}
      </button>
    </form>
  );
}

export function RescheduleForm({
  bookingId,
  slots,
  asCoach = false,
}: {
  bookingId: string;
  slots: { value: string; label: string }[];
  asCoach?: boolean;
}) {
  const [state, action, pending] = useActionState(
    reschedulePrivateClass,
    initialState,
  );
  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="as_coach" value={String(asCoach)} />
      <select name="starts_at" className={field} required>
        <option value="">موعد بديل</option>
        {slots.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      {asCoach ? (
        <p className="text-xs text-amber-200">
          لا تعتمدي التغيير إلا بعد الاتفاق مع العميلة على هذا الموعد.
        </p>
      ) : null}
      <Result state={state} />
      <button disabled={pending} className={button}>
        إعادة الجدولة
      </button>
    </form>
  );
}

export function ZoomForm({
  bookingId,
  currentUrl,
}: {
  bookingId: string;
  currentUrl?: string | null;
}) {
  const [state, action, pending] = useActionState(
    setPrivateClassZoom,
    initialState,
  );
  return (
    <form action={action} className="mt-4 grid gap-3">
      <input type="hidden" name="booking_id" value={bookingId} />
      <input
        name="zoom_url"
        type="url"
        dir="ltr"
        defaultValue={currentUrl ?? ""}
        placeholder="https://....zoom.us/..."
        className={field}
        required
      />
      <Result state={state} />
      <button disabled={pending} className={button}>
        حفظ رابط Zoom
      </button>
    </form>
  );
}

export function ReviewForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(
    submitPrivateClassReview,
    initialState,
  );
  return (
    <form
      action={action}
      className="mt-4 grid gap-3 rounded-xl border border-violet-400/20 bg-violet-500/5 p-4"
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <label className="grid gap-2 text-sm font-bold">
        التقييم
        <select name="stars" className={field} required>
          <option value="">اختاري النجوم</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {"★".repeat(n)}
            </option>
          ))}
        </select>
      </label>
      <textarea
        name="comment"
        className={field}
        placeholder="اكتبي تجربتك مع الجلسة"
        minLength={3}
        required
      />
      <Result state={state} />
      <button disabled={pending} className={button}>
        إرسال التقييم
      </button>
    </form>
  );
}

export function AvailabilityForm() {
  const [state, action, pending] = useActionState(
    setPrivateClassAvailability,
    initialState,
  );
  return (
    <form
      action={action}
      className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-5"
    >
      <h2 className="text-xl font-black">إدارة Availability</h2>
      <input name="date" type="date" className={field} required />
      <select name="start_time" className={field} required>
        <option value="all">اليوم كامل</option>
        {[18, 19, 20, 21, 22, 23].map((h) => (
          <option key={h} value={`${h}:00`}>
            {h > 12 ? h - 12 : h}:00 م
          </option>
        ))}
      </select>
      <input name="reason" className={field} placeholder="سبب داخلي اختياري" />
      <div className="flex gap-3">
        <button
          name="blocked"
          value="true"
          disabled={pending}
          className={button}
        >
          إغلاق
        </button>
        <button
          name="blocked"
          value="false"
          disabled={pending}
          className="rounded-xl border border-emerald-400/40 px-5 py-3 text-sm font-black text-emerald-200"
        >
          إتاحة
        </button>
      </div>
      <Result state={state} />
    </form>
  );
}

export function CoachAdminForm({
  coach,
}: {
  coach?: {
    id: string;
    display_name: string;
    bio: string | null;
    image_url: string | null;
    is_active: boolean;
    is_bookable: boolean;
  };
}) {
  const [state, action, pending] = useActionState(
    savePrivateClassCoach,
    initialState,
  );
  return (
    <form
      action={action}
      className="grid gap-3 rounded-2xl border border-slate-700 bg-slate-900/70 p-5"
    >
      <input type="hidden" name="coach_id" value={coach?.id ?? ""} />
      <h3 className="font-black">
        {coach ? `تعديل ${coach.display_name}` : "إضافة كوتش من حساب موجود"}
      </h3>
      {!coach ? (
        <input
          name="email"
          type="email"
          className={field}
          placeholder="إيميل الحساب"
          required
        />
      ) : null}
      <input
        name="display_name"
        defaultValue={coach?.display_name}
        className={field}
        placeholder="الاسم الظاهر"
        required
      />
      <textarea
        name="bio"
        defaultValue={coach?.bio ?? ""}
        className={field}
        placeholder="نبذة اختيارية"
      />
      <input
        name="image_url"
        type="url"
        dir="ltr"
        defaultValue={coach?.image_url ?? ""}
        className={field}
        placeholder="رابط الصورة اختياري"
      />
      <label className="flex gap-2">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={coach?.is_active ?? true}
        />
        حساب كوتش فعّال
      </label>
      <label className="flex gap-2">
        <input
          name="is_bookable"
          type="checkbox"
          defaultChecked={coach?.is_bookable ?? true}
        />
        تظهر للحجز
      </label>
      <Result state={state} />
      <button disabled={pending} className={button}>
        حفظ
      </button>
    </form>
  );
}

export function ReviewModerationForm({
  reviewId,
  currentStatus,
  excluded,
}: {
  reviewId: string;
  currentStatus: string;
  excluded: boolean;
}) {
  const [state, action, pending] = useActionState(
    moderatePrivateClassReview,
    initialState,
  );
  return (
    <form action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="review_id" value={reviewId} />
      <select name="status" defaultValue={currentStatus} className={field}>
        <option value="approved">Approve</option>
        <option value="rejected">Reject</option>
        <option value="hidden">Hide</option>
      </select>
      <label className="flex gap-2 text-xs">
        <input
          name="excluded_from_average"
          type="checkbox"
          defaultChecked={excluded}
        />
        استبعاد النجوم من المتوسط
      </label>
      <input
        name="exclusion_reason"
        className={field}
        placeholder="سبب داخلي مطلوب عند الاستبعاد"
      />
      <Result state={state} />
      <button disabled={pending} className={button}>
        اعتماد
      </button>
    </form>
  );
}

export function AttendanceCorrectionForm({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const [state, action, pending] = useActionState(
    adminCorrectAttendance,
    initialState,
  );
  return (
    <form action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="booking_id" value={bookingId} />
      <select name="status" defaultValue={status} className={field}>
        <option value="scheduled">Scheduled</option>
        <option value="completed">Completed</option>
        <option value="no_show">No-show</option>
      </select>
      <input
        name="reason"
        className={field}
        placeholder="سبب التصحيح"
        required
      />
      <Result state={state} />
      <button disabled={pending} className={button}>
        تصحيح إداري
      </button>
    </form>
  );
}

export function AdminInterventionForm({ bookingId }: { bookingId: string }) {
  const [state, action, pending] = useActionState(
    adminIntervenePrivateClass,
    initialState,
  );
  return (
    <form
      action={action}
      className="mt-3 grid gap-2 rounded-xl border border-amber-400/20 bg-amber-500/5 p-3"
    >
      <input type="hidden" name="booking_id" value={bookingId} />
      <select name="operation" className={field} required>
        <option value="reschedule">إعادة جدولة استثنائية</option>
        <option value="cancel">إلغاء إداري وإعادة الاستحقاق</option>
      </select>
      <input name="starts_at" type="datetime-local" className={field} />
      <input
        name="reason"
        className={field}
        placeholder="سبب التدخل الإداري"
        required
      />
      <Result state={state} />
      <button disabled={pending} className={button}>
        تنفيذ التدخل
      </button>
    </form>
  );
}

export function Countdown({ startsAt }: { startsAt: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const update = () => {
      const diff = new Date(startsAt).getTime() - Date.now();
      if (diff <= 0) {
        setText("بدأ موعد الجلسة");
        return;
      }
      const days = Math.floor(diff / 86400000),
        hours = Math.floor((diff % 86400000) / 3600000),
        minutes = Math.floor((diff % 3600000) / 60000);
      setText(`${days ? `${days} يوم ` : ""}${hours} ساعة ${minutes} دقيقة`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [startsAt]);
  return <span suppressHydrationWarning>{text}</span>;
}
