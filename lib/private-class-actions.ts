"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, requireAdmin, requireCoach } from "@/lib/data";

export type PrivateClassActionState = { error?: string; success?: string };

function errorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error)
    return String(error.message);
  return "تعذر تنفيذ الطلب، حاولي مرة ثانية.";
}

function riyadhTimestamp(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text))
    throw new Error("اختاري تاريخ ووقت صحيحين");
  return `${text}:00+03:00`;
}

export async function bookPrivateClass(
  _state: PrivateClassActionState,
  formData: FormData,
) {
  try {
    const profile = await getProfile();
    if (profile.subscription_package !== "diamond")
      return { error: "الكلاسات الخاصة حصرية للألماسي 💎" };
    const supabase = await createClient();
    const { error } = await supabase.rpc("book_private_class", {
      target_coach: String(formData.get("coach_id") ?? ""),
      candidate: riyadhTimestamp(formData.get("starts_at")),
      telegram: String(formData.get("telegram_username") ?? "").trim(),
    });
    if (error) return { error: error.message };
    revalidatePath("/private-classes");
    return { success: "تم تأكيد حجز جلستك بنجاح 🤍" };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function cancelPrivateClass(bookingId: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_private_class", {
    target_booking: bookingId,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/private-classes");
}

export async function reschedulePrivateClass(
  _state: PrivateClassActionState,
  formData: FormData,
) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("reschedule_private_class", {
      target_booking: String(formData.get("booking_id") ?? ""),
      candidate: riyadhTimestamp(formData.get("starts_at")),
      as_coach: formData.get("as_coach") === "true",
    });
    if (error) return { error: error.message };
    revalidatePath("/private-classes");
    revalidatePath("/coach/private-classes");
    return { success: "تم اعتماد الموعد البديل بدون خصم جلسة إضافية." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function setPrivateClassZoom(
  _state: PrivateClassActionState,
  formData: FormData,
) {
  try {
    await requireCoach();
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_private_class_zoom", {
      target_booking: String(formData.get("booking_id") ?? ""),
      target_url: String(formData.get("zoom_url") ?? "").trim(),
    });
    if (error) return { error: error.message };
    revalidatePath("/coach/private-classes");
    return { success: "تم حفظ رابط Zoom وإشعار العميلة." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function recordPrivateClassAttendance(
  bookingId: string,
  attended: boolean,
) {
  await requireCoach();
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_private_class_attendance", {
    target_booking: bookingId,
    attended,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/coach/private-classes");
  revalidatePath("/private-classes");
}

export async function submitPrivateClassReview(
  _state: PrivateClassActionState,
  formData: FormData,
) {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("submit_private_class_review", {
      target_booking: String(formData.get("booking_id") ?? ""),
      rating: Number(formData.get("stars")),
      review_comment: String(formData.get("comment") ?? "").trim(),
    });
    if (error) return { error: error.message };
    revalidatePath("/private-classes");
    return { success: "وصل تقييمك، شكرًا لك 🤍" };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function setPrivateClassAvailability(
  _state: PrivateClassActionState,
  formData: FormData,
) {
  try {
    await requireCoach();
    const time = String(formData.get("start_time") ?? "");
    const supabase = await createClient();
    const { error } = await supabase.rpc("set_private_class_availability", {
      target_date: String(formData.get("date") ?? ""),
      target_time: time === "all" ? null : `${time}:00`,
      blocked: formData.get("blocked") !== "false",
      block_reason: String(formData.get("reason") ?? "").trim() || null,
    });
    if (error) return { error: error.message };
    revalidatePath("/coach/private-classes");
    return {
      success:
        formData.get("blocked") === "false"
          ? "تمت إتاحة الموعد."
          : "تم إغلاق الموعد.",
    };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function savePrivateClassCoach(
  _state: PrivateClassActionState,
  formData: FormData,
) {
  try {
    await requireAdmin();
    const admin = createAdminClient();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const coachId = String(formData.get("coach_id") ?? "");
    const payload = {
      display_name: String(formData.get("display_name") ?? "").trim(),
      bio: String(formData.get("bio") ?? "").trim() || null,
      image_url: String(formData.get("image_url") ?? "").trim() || null,
      is_active: formData.get("is_active") === "on",
      is_bookable: formData.get("is_bookable") === "on",
      updated_at: new Date().toISOString(),
    };
    if (!payload.display_name) return { error: "الاسم الظاهر مطلوب." };
    if (coachId) {
      const { error } = await admin
        .from("private_class_coaches")
        .update(payload)
        .eq("id", coachId);
      if (error) return { error: error.message };
    } else {
      if (!email) return { error: "إيميل الحساب مطلوب." };
      const { data: users, error: userError } = await admin
        .from("profiles")
        .select("id,email")
        .ilike("email", email)
        .limit(1);
      if (userError || !users?.[0])
        return { error: "لا يوجد حساب بالموقع بهذا الإيميل." };
      const { error } = await admin
        .from("private_class_coaches")
        .insert({ user_id: users[0].id, ...payload });
      if (error) return { error: error.message };
    }
    revalidatePath("/admin/private-classes");
    revalidatePath("/private-classes");
    return { success: "تم حفظ بيانات الكوتش." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function moderatePrivateClassReview(
  _state: PrivateClassActionState,
  formData: FormData,
) {
  try {
    const adminProfile = await requireAdmin();
    const status = String(formData.get("status") ?? "");
    if (!["approved", "rejected", "hidden"].includes(status))
      return { error: "حالة المراجعة غير صحيحة." };
    const excluded = formData.get("excluded_from_average") === "on";
    const reason = String(formData.get("exclusion_reason") ?? "").trim();
    if (excluded && reason.length < 3)
      return { error: "اكتبي سبب استبعاد النجوم من المتوسط." };
    const admin = createAdminClient();
    const { error } = await admin
      .from("private_class_reviews")
      .update({
        moderation_status: status,
        excluded_from_average: excluded,
        exclusion_reason: excluded ? reason : null,
        moderated_by: adminProfile.id,
        moderated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", String(formData.get("review_id") ?? ""));
    if (error) return { error: error.message };
    revalidatePath("/admin/private-classes");
    revalidatePath("/private-classes");
    return { success: "تم تحديث التقييم مع الحفاظ على سجل الجلسة." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function adminCorrectAttendance(
  _state: PrivateClassActionState,
  formData: FormData,
) {
  try {
    const adminProfile = await requireAdmin();
    const status = String(formData.get("status") ?? "");
    if (!["scheduled", "completed", "no_show"].includes(status))
      return { error: "الحالة غير صحيحة." };
    const bookingId = String(formData.get("booking_id") ?? "");
    const admin = createAdminClient();
    const { data: current } = await admin
      .from("private_class_bookings")
      .select("status,starts_at")
      .eq("id", bookingId)
      .single();
    const { error } = await admin
      .from("private_class_bookings")
      .update({
        status,
        attendance_recorded_at:
          status === "scheduled" ? null : new Date().toISOString(),
        attendance_recorded_by: status === "scheduled" ? null : adminProfile.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);
    if (error) return { error: error.message };
    await admin.from("private_class_booking_events").insert({
      booking_id: bookingId,
      actor_id: adminProfile.id,
      event_type: "admin_attendance_correction",
      old_status: current?.status ?? null,
      new_status: status,
      old_starts_at: current?.starts_at ?? null,
      details: { reason: String(formData.get("reason") ?? "").trim() },
    });
    revalidatePath("/admin/private-classes");
    return { success: "تم التصحيح وتسجيله في سجل التدقيق." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function adminIntervenePrivateClass(
  _state: PrivateClassActionState,
  formData: FormData,
) {
  try {
    const adminProfile = await requireAdmin();
    const admin = createAdminClient();
    const bookingId = String(formData.get("booking_id") ?? "");
    const operation = String(formData.get("operation") ?? "");
    const reason = String(formData.get("reason") ?? "").trim();
    if (reason.length < 3) return { error: "سبب التدخل الإداري مطلوب." };
    const { data: booking, error: readError } = await admin
      .from("private_class_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();
    if (readError || !booking) return { error: "الحجز غير موجود." };
    if (operation === "cancel") {
      const { error } = await admin
        .from("private_class_bookings")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
          cancelled_by: adminProfile.id,
          cancellation_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
      if (error) return { error: error.message };
      await admin
        .from("private_class_booking_events")
        .insert({
          booking_id: bookingId,
          actor_id: adminProfile.id,
          event_type: "admin_exception_cancelled",
          old_status: booking.status,
          new_status: "cancelled",
          old_starts_at: booking.starts_at,
          details: { reason },
        });
    } else if (operation === "reschedule") {
      const candidate = riyadhTimestamp(formData.get("starts_at"));
      const local = new Date(candidate);
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Riyadh",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(local);
      const weekday = parts.find((p) => p.type === "weekday")?.value;
      const hour = Number(parts.find((p) => p.type === "hour")?.value);
      const minute = Number(parts.find((p) => p.type === "minute")?.value);
      if (
        ["Fri", "Sat"].includes(weekday ?? "") ||
        hour < 18 ||
        hour > 23 ||
        minute !== 0
      )
        return { error: "الموعد البديل خارج الأيام أو الساعات الأساسية." };
      const { error } = await admin
        .from("private_class_bookings")
        .update({
          starts_at: candidate,
          ends_at: new Date(
            new Date(candidate).getTime() + 3600000,
          ).toISOString(),
          reschedule_count: booking.reschedule_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId);
      if (error)
        return {
          error:
            error.code === "23505" ? "الموعد البديل محجوز." : error.message,
        };
      await admin
        .from("private_class_booking_events")
        .insert({
          booking_id: bookingId,
          actor_id: adminProfile.id,
          event_type: "admin_exception_rescheduled",
          old_starts_at: booking.starts_at,
          new_starts_at: candidate,
          old_status: booking.status,
          new_status: booking.status,
          details: { reason },
        });
    } else return { error: "اختاري نوع التدخل." };
    await admin
      .from("notifications")
      .insert({
        user_id: booking.student_id,
        title: "تحديث إداري على جلستك",
        body:
          operation === "cancel"
            ? "تم إلغاء الجلسة إداريًا وإعادة الاستحقاق."
            : "تم تعديل موعد الجلسة إداريًا.",
        type: "private_class_admin_update",
        link_url: "/private-classes",
        related_type: "booking",
        related_id: bookingId,
        idempotency_key: `booking:${bookingId}:admin:${Date.now()}`,
      });
    revalidatePath("/admin/private-classes");
    revalidatePath("/private-classes");
    revalidatePath("/coach/private-classes");
    return { success: "تم التدخل الاستثنائي وحفظه في سجل التدقيق." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}
