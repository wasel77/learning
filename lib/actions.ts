"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { calculateLevel, formatArabicDate, parseSaudiDateTimeToUtcIso } from "@/lib/utils";
import { getProfile, requireAdmin, requireUser } from "@/lib/data";
import { getAllowedLevels, getNextLevel } from "@/lib/learning-path";
import type {
  ContentPackageScope,
  LessonQuestion,
  Level,
  Question,
  SubscriptionPackage,
} from "@/lib/types";

type ActionState = { error?: string; success?: string };

function isSubscriptionPackage(value: string): value is SubscriptionPackage {
  return value === "bronze" || value === "diamond";
}

function isContentPackageScope(value: string): value is ContentPackageScope {
  return isSubscriptionPackage(value) || value === "both";
}

export async function signUp(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const requestedPackage = String(formData.get("subscription_package") ?? "bronze");
  const subscriptionPackage: SubscriptionPackage = isSubscriptionPackage(requestedPackage)
    ? requestedPackage
    : "bronze";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, subscription_package: subscriptionPackage },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) return { error: error.message };
  return { success: "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب." };
}

export async function signIn(_state: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function setAccountActive(userId: string, isActive: boolean): Promise<ActionState> {
  const admin = await requireAdmin();
  if (admin.id === userId) {
    return { error: "لا يمكن تغيير حالة حساب المدير الحالي." };
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ is_active: isActive })
      .eq("id", userId)
      .eq("role", "student")
      .select("id")
      .maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "الحساب غير موجود أو أنه حساب إداري محمي." };
    revalidatePath("/admin/users");
    return { success: isActive ? "تم تفعيل الحساب." : "تم تعطيل الحساب." };
  } catch {
    return { error: "تعذر الاتصال بعميل Supabase الإداري. تحقق من مفتاح الخادم." };
  }
}

export async function updateUserSubscriptionPackage(
  userId: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (admin.id === userId) return { error: "لا يمكن تعديل باقة حساب المدير الحالي." };

  const requestedPackage = String(formData.get("subscription_package") ?? "");
  if (!isSubscriptionPackage(requestedPackage)) {
    return { error: "اختر باقة صحيحة." };
  }

  try {
    const supabase = createAdminClient();
    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("id,role")
      .eq("id", userId)
      .maybeSingle<{ id: string; role: string }>();

    if (targetError || !target) return { error: "الحساب المطلوب غير موجود." };
    if (target.role !== "student") return { error: "الباقات مخصصة لحسابات الأعضاء فقط." };

    const { error } = await supabase
      .from("profiles")
      .update({ subscription_package: requestedPackage })
      .eq("id", userId);

    if (error) return { error: error.message };
    revalidatePath("/admin/users");
    return { success: "تم تحديث باقة العضو." };
  } catch {
    return { error: "تعذر الاتصال بعميل Supabase الإداري. تحقق من مفتاح الخادم." };
  }
}

export async function deleteUserAccount(userId: string): Promise<ActionState> {
  const admin = await requireAdmin();
  if (admin.id === userId) return { error: "لا يمكن حذف حساب المدير الحالي." };

  try {
    const supabase = createAdminClient();
    const { data: target, error: targetError } = await supabase
      .from("profiles")
      .select("id,role")
      .eq("id", userId)
      .maybeSingle<{ id: string; role: string }>();

    if (targetError || !target) return { error: "الحساب المطلوب غير موجود." };
    if (target.role !== "student") return { error: "لا يمكن حذف حساب إداري من هذه الواجهة." };

    const { error } = await supabase.auth.admin.deleteUser(userId, false);
    if (error) return { error: error.message };

    revalidatePath("/admin/users");
    return { success: "تم حذف حساب العضو وبياناته نهائيًا." };
  } catch {
    return { error: "تعذر الاتصال بعميل Supabase الإداري. تحقق من مفتاح الخادم." };
  }
}

export async function startBeginner() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ level: "beginner", has_completed_placement_test: false })
    .eq("id", user.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function savePlacementAttempt(answers: Record<string, string>) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("*, options:question_options(*)")
    .eq("is_active", true)
    .order("question_order", { ascending: true });

  const activeQuestions = (questions ?? []) as Question[];

  if (questionsError || !activeQuestions.length) {
    return { error: "لا توجد أسئلة متاحة حاليا" };
  }

  const total = activeQuestions.length;
  if (Object.keys(answers).length < total) {
    return { error: "أجب عن كل الأسئلة قبل عرض النتيجة" };
  }

  const correct = activeQuestions.filter((question) => {
    const selected = answers[question.id];
    return question.options.some((option) => option.id === selected && option.is_correct);
  }).length;
  const percentage = Math.round((correct / total) * 100);
  const finalLevel = calculateLevel(percentage);

  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .insert({
      user_id: user.id,
      score: correct,
      total_questions: total,
      percentage,
      final_level: finalLevel,
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error || !attempt) return { error: error?.message ?? "تعذر حفظ النتيجة" };

  const rows = activeQuestions.map((question) => {
    const selected = answers[question.id];
    const option = question.options.find((item) => item.id === selected);
    return {
      attempt_id: attempt.id,
      user_id: user.id,
      question_id: question.id,
      selected_option_id: selected,
      is_correct: Boolean(option?.is_correct),
    };
  });

  await supabase.from("user_answers").insert(rows);
  await supabase
    .from("profiles")
    .update({ level: finalLevel, has_completed_placement_test: true })
    .eq("id", user.id);

  revalidatePath("/dashboard");
  return { score: correct, percentage, finalLevel };
}

export async function toggleLessonWatched(lessonId: string, watched: boolean) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      watched,
      watched_at: watched ? new Date().toISOString() : null,
    },
    { onConflict: "user_id,lesson_id" },
  );
  revalidatePath("/lessons");
  revalidatePath(`/lessons/${lessonId}`);
  revalidatePath("/dashboard");
}

export async function submitLessonQuiz(lessonId: string, answers: Record<string, string>) {
  const user = await requireUser();
  const supabase = await createClient();

  const [profileResult, lessonResult, questionsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("level,subscription_package")
      .eq("id", user.id)
      .single<{ level: Level | null; subscription_package: SubscriptionPackage }>(),
    supabase
      .from("lessons")
      .select("id,level")
      .eq("id", lessonId)
      .single<{ id: string; level: Level }>(),
    supabase
      .from("lesson_questions")
      .select("*, options:lesson_question_options(*)")
      .eq("lesson_id", lessonId)
      .eq("is_active", true)
      .order("question_order"),
  ]);

  const activeQuestions = (questionsResult.data ?? []) as LessonQuestion[];
  if (questionsResult.error || lessonResult.error || !lessonResult.data || !activeQuestions.length) {
    return { error: "لا توجد أسئلة متاحة لهذا الدرس حالياً" };
  }

  const total = activeQuestions.length;
  if (Object.keys(answers).length < total) {
    return { error: "أجب عن كل أسئلة الدرس قبل عرض النتيجة" };
  }

  const score = activeQuestions.filter((question) => {
    const selected = answers[question.id];
    return question.options.some((option) => option.id === selected && option.is_correct);
  }).length;
  const percentage = Math.round((score / total) * 100);
  const passed = percentage === 100;

  const { data: existing } = await supabase
    .from("lesson_progress")
    .select("completed, quiz_passed")
    .eq("user_id", user.id)
    .eq("lesson_id", lessonId)
    .maybeSingle<{ completed: boolean; quiz_passed: boolean | null }>();

  const alreadyPassed = Boolean(existing?.completed || existing?.quiz_passed);
  const shouldComplete = passed || alreadyPassed;

  await supabase.from("lesson_progress").upsert(
    {
      user_id: user.id,
      lesson_id: lessonId,
      completed: shouldComplete,
      completed_at: shouldComplete ? new Date().toISOString() : null,
      quiz_score: score,
      quiz_total: total,
      quiz_percentage: percentage,
      quiz_passed: shouldComplete,
    },
    { onConflict: "user_id,lesson_id" },
  );

  let promotedLevel: Level | null = null;
  const currentLevel = profileResult.data?.level;
  const lessonLevel = lessonResult.data.level;
  const subscriptionPackage = profileResult.data?.subscription_package;
  const nextLevel = currentLevel && subscriptionPackage
    ? getNextLevel(currentLevel, subscriptionPackage)
    : null;

  if (shouldComplete && currentLevel && nextLevel && lessonLevel === currentLevel) {
    const { data: currentLevelLessons } = await supabase
      .from("lessons")
      .select("id, lesson_progress(completed)")
      .eq("level", currentLevel)
      .eq("is_active", true);

    const allCurrentLevelLessonsCompleted = Boolean(
      currentLevelLessons?.length &&
        currentLevelLessons.every((lesson) =>
          lesson.lesson_progress?.some((progress) => progress.completed),
        ),
    );

    if (allCurrentLevelLessonsCompleted) {
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ level: nextLevel })
        .eq("id", user.id);

      if (!profileError) {
        promotedLevel = nextLevel;
      }
    }
  }

  revalidatePath("/lessons");
  revalidatePath(`/lessons/${lessonId}`);
  revalidatePath(`/lessons/${lessonId}/quiz`);
  revalidatePath("/dashboard");
  revalidatePath("/roadmap");
  revalidatePath("/profile");

  return { score, total, percentage, passed: shouldComplete, promotedLevel };
}

export async function markNotificationRead(id: string) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id);
  revalidatePath("/notifications");
}

export async function saveQuestion(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "") || randomUUID();
  const correctIndex = Number(formData.get("correct_option") ?? 0);
  const optionTexts = [0, 1, 2, 3].map((index) => String(formData.get(`option_${index}`) ?? "").trim());

  if (!String(formData.get("question_text") ?? "").trim()) return { error: "اكتب نص السؤال" };
  if (optionTexts.some((option) => !option)) return { error: "أدخل أربع إجابات" };
  if (Number.isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) return { error: "حدد الإجابة الصحيحة" };

  const { error } = await supabase.from("questions").upsert({
    id,
    level: String(formData.get("level") ?? "beginner"),
    question_text: String(formData.get("question_text") ?? "").trim(),
    explanation: String(formData.get("explanation") ?? "").trim() || null,
    question_order: Number(formData.get("question_order") ?? 1),
    is_active: formData.get("is_active") === "on",
  });

  if (error) return { error: error.message };

  await supabase.from("question_options").delete().eq("question_id", id);
  const { error: optionsError } = await supabase.from("question_options").insert(
    optionTexts.map((option_text, index) => ({
      id: randomUUID(),
      question_id: id,
      option_text,
      is_correct: index === correctIndex,
    })),
  );

  if (optionsError) return { error: optionsError.message };
  revalidatePath("/admin/questions");
  revalidatePath("/placement-test");
  return { success: "تم حفظ السؤال" };
}

export async function deleteQuestion(questionId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("questions").delete().eq("id", questionId);
  revalidatePath("/admin/questions");
  revalidatePath("/placement-test");
}

export async function saveLesson(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const terms = formData
    .getAll("vocabulary_term")
    .map((value) => String(value).trim());
  const definitions = formData
    .getAll("vocabulary_definition")
    .map((value) => String(value).trim());
  const vocabulary = terms
    .map((term, index) => ({
      term,
      definition: definitions[index] ?? "",
    }))
    .filter((item) => item.term || item.definition);
  const linkLabels = formData
    .getAll("summary_link_label")
    .map((value) => String(value).trim());
  const linkUrls = formData
    .getAll("summary_link_url")
    .map((value) => String(value).trim());
  const summaryLinks = linkLabels
    .map((label, index) => {
      const rawUrl = linkUrls[index] ?? "";
      const url = rawUrl && !/^https?:\/\//i.test(rawUrl) ? `https://${rawUrl}` : rawUrl;
      return { label, url };
    })
    .filter((item) => item.label || item.url);

  const invalidLink = summaryLinks.find((item) => {
    if (!item.label || !item.url) return true;
    try {
      const parsed = new URL(item.url);
      return !["http:", "https:"].includes(parsed.protocol);
    } catch {
      return true;
    }
  });

  if (invalidLink) {
    return { error: "أدخل عنوان ورابط صحيح لكل رابط في الملخص" };
  }

  const bunnyVideoId = String(formData.get("bunny_video_id") ?? "").trim();
  if (
    !bunnyVideoId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(bunnyVideoId)
  ) {
    return { error: "أدخل Bunny Video ID صحيح" };
  }

  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    drive_file_id: String(formData.get("drive_file_id") ?? "").trim(),
    bunny_video_id: bunnyVideoId || null,
    package_access: String(formData.get("package_access") ?? "both"),
    level: String(formData.get("level") ?? "beginner"),
    lesson_order: Number(formData.get("lesson_order") ?? 1),
    duration_minutes: formData.get("duration_minutes")
      ? Number(formData.get("duration_minutes"))
      : null,
    description: String(formData.get("description") ?? "").trim() || null,
    summary: String(formData.get("summary") ?? "").trim() || null,
    summary_links: summaryLinks,
    vocabulary,
    is_active: formData.get("is_active") === "on",
  };

  if (!payload.title) return { error: "اكتب عنوان الدرس" };
  if (!payload.drive_file_id) return { error: "أدخل معرف فيديو Google Drive" };
  if (!isContentPackageScope(payload.package_access)) return { error: "اختر باقة صحيحة للدرس" };

  const query = id
    ? supabase.from("lessons").update(payload).eq("id", id)
    : supabase.from("lessons").insert(payload);
  const { error } = await query;

  if (error) return { error: error.message };
  revalidatePath("/admin/lessons");
  revalidatePath("/lessons");
  revalidatePath("/dashboard");
  revalidatePath("/roadmap");
  return { success: "تم حفظ الدرس" };
}

export async function deleteLesson(lessonId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("lessons").delete().eq("id", lessonId);
  revalidatePath("/admin/lessons");
  revalidatePath("/lessons");
  revalidatePath("/dashboard");
}

export async function saveLessonQuestion(_state: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "") || randomUUID();
  const lessonId = String(formData.get("lesson_id") ?? "");
  const correctIndex = Number(formData.get("correct_option") ?? 0);
  const optionTexts = [0, 1, 2, 3].map((index) => String(formData.get(`option_${index}`) ?? "").trim());
  const questionText = String(formData.get("question_text") ?? "").trim();

  if (!lessonId) return { error: "اختر الدرس المرتبط بالسؤال" };
  if (!questionText) return { error: "اكتب نص السؤال" };
  if (optionTexts.some((option) => !option)) return { error: "أدخل أربع إجابات" };
  if (Number.isNaN(correctIndex) || correctIndex < 0 || correctIndex > 3) {
    return { error: "حدد الإجابة الصحيحة" };
  }

  const { error } = await supabase.from("lesson_questions").upsert({
    id,
    lesson_id: lessonId,
    question_text: questionText,
    explanation: String(formData.get("explanation") ?? "").trim() || null,
    question_order: Number(formData.get("question_order") ?? 1),
    is_active: formData.get("is_active") === "on",
  } satisfies Partial<LessonQuestion>);

  if (error) return { error: error.message };

  await supabase.from("lesson_question_options").delete().eq("lesson_question_id", id);
  const { error: optionsError } = await supabase.from("lesson_question_options").insert(
    optionTexts.map((option_text, index) => ({
      id: randomUUID(),
      lesson_question_id: id,
      option_text,
      is_correct: index === correctIndex,
    })),
  );

  if (optionsError) return { error: optionsError.message };
  revalidatePath("/admin/lessons");
  revalidatePath(`/lessons/${lessonId}`);
  revalidatePath(`/lessons/${lessonId}/quiz`);
  return { success: "تم حفظ سؤال الدرس" };
}

export async function deleteLessonQuestion(questionId: string, lessonId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("lesson_questions").delete().eq("id", questionId);
  revalidatePath("/admin/lessons");
  revalidatePath(`/lessons/${lessonId}`);
  revalidatePath(`/lessons/${lessonId}/quiz`);
}

export async function saveLiveSession(_state: ActionState, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const payload: Record<string, unknown> = Object.fromEntries(formData.entries());
  delete payload.id;
  Object.keys(payload).forEach((key) => {
    if (payload[key] === "") payload[key] = null;
    if (payload[key] === "on") payload[key] = true;
    if ((key === "start_time" || key === "end_time") && typeof payload[key] === "string") {
      payload[key] = parseSaudiDateTimeToUtcIso(payload[key]);
    }
  });
  payload.applies_to_all = formData.get("applies_to_all") === "on";
  const packageAccess = String(formData.get("package_access") ?? "both");
  if (!isContentPackageScope(packageAccess)) return { error: "اختر باقة صحيحة للحصة" };
  payload.package_access = packageAccess;
  if (payload.applies_to_all && !payload.level) payload.level = "beginner";
  if (!payload.start_time || !payload.end_time) {
    return { error: "حدد وقت بداية ونهاية الحصة بتوقيت السعودية" };
  }
  if (new Date(String(payload.end_time)).getTime() <= new Date(String(payload.start_time)).getTime()) {
    return { error: "وقت نهاية الحصة يجب أن يكون بعد وقت البداية" };
  }

  if (id) {
    const { error } = await supabase.from("live_sessions").update(payload).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/admin/live-sessions");
    revalidatePath("/live-sessions");
    return { success: "تم تحديث الحصة" };
  }

  const { data: session, error } = await supabase
    .from("live_sessions")
    .insert(payload)
    .select("id,title,level,start_time,applies_to_all,package_access")
    .single();

  if (error || !session) return { error: error?.message ?? "تعذر حفظ الحصة" };

  let profilesQuery = supabase
    .from("profiles")
    .select("id,level,subscription_package")
    .eq("role", "student")
    .eq("is_active", true);

  if (session.package_access !== "both") {
    profilesQuery = profilesQuery.eq("subscription_package", session.package_access);
  }
  const { data: profiles } = await profilesQuery;
  const eligibleProfiles = (profiles ?? []).filter((profile) =>
    session.applies_to_all ||
    getAllowedLevels(profile.level, profile.subscription_package).includes(session.level),
  );

  if (eligibleProfiles.length) {
    await supabase.from("notifications").insert(
      eligibleProfiles.map((profile) => ({
        user_id: profile.id,
        title: `حصة مباشرة جديدة: ${session.title}`,
        body: `تمت إضافة حصة مباشرة جديدة تبدأ في ${formatArabicDate(session.start_time)}.`,
        type: "live_session",
        link_url: "/live-sessions",
      })),
    );
  }

  revalidatePath("/admin/live-sessions");
  revalidatePath("/live-sessions");
  revalidatePath("/notifications");
  return { success: "تم حفظ الحصة وإرسال إشعار للطلاب" };
}

export async function deleteLiveSession(sessionId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("live_sessions").delete().eq("id", sessionId);
  revalidatePath("/admin/live-sessions");
  revalidatePath("/live-sessions");
  revalidatePath("/dashboard");
}

export async function saveNotification(_state: ActionState, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const audienceType = String(formData.get("audience_type") ?? "user");
  const targetUserId = String(formData.get("target_user_id") ?? "");
  const targetPackage = String(formData.get("target_package") ?? "both");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim() || null;
  const type = String(formData.get("type") ?? "").trim() || null;
  const linkUrl = String(formData.get("link_url") ?? "").trim() || null;

  if (!title) return { error: "اكتب عنوان الإشعار" };
  if (audienceType !== "user" && audienceType !== "package") {
    return { error: "اختر جمهور الإشعار" };
  }

  let profilesQuery = supabase
    .from("profiles")
    .select("id")
    .eq("role", "student")
    .eq("is_active", true);

  if (audienceType === "user") {
    if (!targetUserId) return { error: "اختر العضو المستهدف" };
    profilesQuery = profilesQuery.eq("id", targetUserId);
  } else {
    if (!isContentPackageScope(targetPackage)) return { error: "اختر باقة صحيحة" };
    if (targetPackage !== "both") {
      profilesQuery = profilesQuery.eq("subscription_package", targetPackage);
    }
  }

  const { data: recipients, error: recipientsError } = await profilesQuery;
  if (recipientsError) return { error: recipientsError.message };
  if (!recipients?.length) return { error: "لا يوجد أعضاء نشطون ضمن الجمهور المحدد" };

  const { error } = await supabase.from("notifications").insert(
    recipients.map((recipient) => ({
      user_id: recipient.id,
      title,
      body,
      type,
      link_url: linkUrl,
    })),
  );

  if (error) return { error: error.message };
  revalidatePath("/admin/notifications");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  return { success: `تم إرسال الإشعار إلى ${recipients.length} عضو.` };
}

export async function saveSuccessStory(_state: ActionState, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  const payload = {
    student_name: String(formData.get("student_name") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    score: formData.get("score") ? Number(formData.get("score")) : null,
    score_currency: String(formData.get("score_currency") ?? "SAR") === "USD" ? "USD" : "SAR",
    image_url: String(formData.get("image_url") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim(),
    is_published: formData.get("is_published") === "on",
  };

  if (!payload.student_name) return { error: "اكتب اسم الطالب" };
  if (!payload.title) return { error: "اكتب عنوان القصة" };
  if (!payload.description) return { error: "اكتب نص القصة" };

  const query = id
    ? supabase.from("success_stories").update(payload).eq("id", id)
    : supabase.from("success_stories").insert(payload);
  const { error } = await query;

  if (error) return { error: error.message };
  revalidatePath("/admin/success-stories");
  revalidatePath("/success-stories");
  revalidatePath("/");
  return { success: id ? "تم تحديث القصة" : "تم حفظ القصة" };
}

export async function deleteSuccessStory(storyId: string) {
  await requireAdmin();
  const supabase = await createClient();
  await supabase.from("success_stories").delete().eq("id", storyId);
  revalidatePath("/admin/success-stories");
  revalidatePath("/success-stories");
  revalidatePath("/");
}

export async function updateProfile(_state: ActionState, formData: FormData): Promise<ActionState> {
  const profile = await getProfile();
  const supabase = await createClient();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const { error } = await supabase.from("profiles").update({ full_name: fullName }).eq("id", profile.id);
  if (error) return { error: error.message };
  revalidatePath("/profile");
  return { success: "تم تحديث الملف الشخصي" };
}

export async function updateProfileForm(formData: FormData) {
  await updateProfile({}, formData);
}
