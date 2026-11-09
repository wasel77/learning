"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionPackage } from "@/lib/types";

type ActionState = { error?: string; success?: string };

type AuthActionError = {
  code?: string;
  message?: string;
};

function isSubscriptionPackage(value: string): value is SubscriptionPackage {
  return value === "bronze" || value === "diamond";
}

function formatSignUpError(error: AuthActionError): string {
  const message = error.message?.trim() ?? "";
  const normalized = message.toLowerCase();

  if (error.code === "over_email_send_rate_limit" || normalized.includes("rate limit")) {
    return "تم تجاوز عدد محاولات التسجيل المسموح مؤقتًا. حاول مرة أخرى لاحقًا.";
  }
  if (error.code === "user_already_exists" || normalized.includes("already registered")) {
    return "يوجد حساب مسجل بهذا البريد الإلكتروني بالفعل.";
  }
  if (error.code === "weak_password" || normalized.includes("password")) {
    return "كلمة المرور غير مقبولة. استخدم كلمة مرور أقوى ثم حاول مرة أخرى.";
  }
  if (error.code === "email_address_invalid" || normalized.includes("invalid email")) {
    return "البريد الإلكتروني غير صالح. تحقق منه ثم حاول مرة أخرى.";
  }
  if (!message || message === "{}" || message === "[object Object]") {
    return "تعذر إنشاء الحساب حاليًا بسبب مشكلة مؤقتة في خدمة التسجيل. حاول مرة أخرى لاحقًا.";
  }

  return message;
}

async function removeIncompleteUser(userId: string) {
  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.deleteUser(userId, false);
  return error;
}

export async function adminCreateUser(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const requestedPackage = String(formData.get("subscription_package") ?? "bronze");

  if (!fullName) return { error: "أدخل الاسم الكامل." };
  if (!email) return { error: "أدخل البريد الإلكتروني." };
  if (password.length < 6) return { error: "كلمة المرور يجب ألا تقل عن 6 أحرف." };
  if (!isSubscriptionPackage(requestedPackage)) return { error: "اختر باقة صحيحة." };

  const adminClient = createAdminClient();
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: {
      full_name: fullName,
      subscription_package: requestedPackage,
    },
  });

  if (error || !data.user) return { error: formatSignUpError(error ?? {}) };

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id,subscription_package")
    .eq("id", data.user.id)
    .maybeSingle<{ id: string; subscription_package: SubscriptionPackage }>();

  if (profileError || !profile || profile.subscription_package !== requestedPackage) {
    const cleanupError = await removeIncompleteUser(data.user.id);
    return cleanupError
      ? { error: "أُنشئ الحساب دون ملف شخصي وتعذر التراجع عنه. راجعي إدارة الحسابات قبل المحاولة مجددًا." }
      : { error: "تعذر ربط الحساب بملفه الشخصي. لم يتم الاحتفاظ بالحساب." };
  }

  const { error: confirmationError } = await adminClient.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: "https://miskacademy.online/auth/callback",
    },
  });

  if (confirmationError) {
    const cleanupError = await removeIncompleteUser(data.user.id);
    return cleanupError
      ? { error: "أُنشئ الحساب لكن تعذر إرسال رسالة التأكيد أو التراجع عن الإنشاء. راجعي إدارة الحسابات." }
      : { error: formatSignUpError(confirmationError) };
  }

  revalidatePath("/admin/users");
  return { success: "تم إنشاء الحساب وإرسال رسالة التأكيد إلى العميل." };
}
