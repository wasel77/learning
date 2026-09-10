"use client";

import { Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import {
  saveLesson,
  saveLiveSession,
  saveNotification,
  saveSuccessStory,
} from "@/lib/actions";
import type {
  ContentPackageScope,
  Lesson,
  LessonSummaryLink,
  LessonVocabularyItem,
  Level,
  Profile,
  SuccessStory,
} from "@/lib/types";

const actions = {
  lesson: saveLesson,
  live: saveLiveSession,
  notification: saveNotification,
  story: saveSuccessStory,
};

type FormState = { error?: string; success?: string };
type AdminAction = (state: FormState, payload: FormData) => Promise<FormState>;
const selectClassName = "h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-sm text-slate-50 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20";

function LevelSelect({
  name = "level",
  required = true,
  defaultValue = "beginner",
}: {
  name?: string;
  required?: boolean;
  defaultValue?: Level;
}) {
  return (
    <select
      name={name}
      required={required}
      className={selectClassName}
      defaultValue={defaultValue}
    >
      <option value="beginner">مبتدئ</option>
      <option value="advanced">متقدم</option>
      <option value="expert">خبير</option>
    </select>
  );
}

function PackageScopeSelect({
  defaultValue = "both",
}: {
  defaultValue?: ContentPackageScope;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-300">الباقة المستهدفة</label>
      <select name="package_access" defaultValue={defaultValue} className={selectClassName} required>
        <option value="bronze">الباقة البرونزية</option>
        <option value="diamond">الباقة الماسية</option>
        <option value="both">كلا الباقتين</option>
      </select>
    </div>
  );
}

function LessonVocabularyFields({
  initialVocabulary = [],
}: {
  initialVocabulary?: LessonVocabularyItem[] | null;
}) {
  const vocabulary = initialVocabulary ?? [];
  const [rows, setRows] = useState(
    vocabulary.length
      ? vocabulary.map((item) => ({ id: crypto.randomUUID(), ...item }))
      : [{ id: crypto.randomUUID(), term: "", definition: "" }],
  );

  return (
    <div className="space-y-3 md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-200">مفردات الدرس</p>
          <p className="mt-1 text-xs text-slate-500">
            أضف الكلمات المهمة وتعريف كل كلمة لتظهر داخل صفحة الدرس.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setRows((current) => [
              ...current,
              { id: crypto.randomUUID(), term: "", definition: "" },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          إضافة كلمة
        </Button>
      </div>

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 md:grid-cols-[1fr_2fr_auto]"
        >
          <Input
            name="vocabulary_term"
            placeholder={`الكلمة ${index + 1}`}
            defaultValue={row.term}
          />
          <Input
            name="vocabulary_definition"
            placeholder="تعريف الكلمة"
            defaultValue={row.definition}
          />
          <Button
            type="button"
            variant="danger"
            size="icon"
            onClick={() =>
              setRows((current) =>
                current.length === 1
                  ? [{ id: crypto.randomUUID(), term: "", definition: "" }]
                  : current.filter((item) => item.id !== row.id),
              )
            }
            aria-label="حذف الكلمة"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

function SummaryLinkFields({
  initialLinks = [],
}: {
  initialLinks?: LessonSummaryLink[] | null;
}) {
  const links = initialLinks ?? [];
  const [rows, setRows] = useState(
    links.length
      ? links.map((item) => ({ id: crypto.randomUUID(), ...item }))
      : [{ id: crypto.randomUUID(), label: "", url: "" }],
  );

  return (
    <div className="space-y-3 md:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-200">روابط الملخص</p>
          <p className="mt-1 text-xs text-slate-500">
            أضف عنوان الرابط والرابط نفسه ليظهروا للطالب داخل تبويب الملخص.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() =>
            setRows((current) => [
              ...current,
              { id: crypto.randomUUID(), label: "", url: "" },
            ])
          }
        >
          <Plus className="h-4 w-4" />
          إضافة رابط
        </Button>
      </div>

      {rows.map((row, index) => (
        <div
          key={row.id}
          className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-950/40 p-3 md:grid-cols-[1fr_2fr_auto]"
        >
          <Input
            name="summary_link_label"
            placeholder={`عنوان الرابط ${index + 1}`}
            defaultValue={row.label}
          />
          <Input
            name="summary_link_url"
            type="text"
            placeholder="https://example.com"
            defaultValue={row.url}
          />
          <Button
            type="button"
            variant="danger"
            size="icon"
            onClick={() =>
              setRows((current) =>
                current.length === 1
                  ? [{ id: crypto.randomUUID(), label: "", url: "" }]
                  : current.filter((item) => item.id !== row.id),
              )
            }
            aria-label="حذف الرابط"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}

export function AdminForm({
  type,
  lesson,
  story,
  notificationRecipients = [],
}: {
  type: keyof typeof actions;
  lesson?: Lesson;
  story?: SuccessStory;
  notificationRecipients?: Pick<Profile, "id" | "full_name" | "email" | "subscription_package">[];
}) {
  const [notificationAudience, setNotificationAudience] = useState<"user" | "package">("user");
  const [state, action, pending] = useActionState<FormState, FormData>(
    actions[type] as AdminAction,
    {},
  );

  return (
    <Card className="p-5">
      <form action={action} className="grid gap-4 md:grid-cols-2">
        {type === "lesson" && lesson ? (
          <input type="hidden" name="id" value={lesson.id} />
        ) : null}
        {type === "story" && story ? (
          <input type="hidden" name="id" value={story.id} />
        ) : null}

        {type === "lesson" ? (
          <>
            <Input
              name="title"
              placeholder="عنوان الدرس"
              defaultValue={lesson?.title}
              required
            />
            <Input
              name="drive_file_id"
              placeholder="Google Drive file ID"
              defaultValue={lesson?.drive_file_id}
              required
            />
            <Input
              name="bunny_video_id"
              placeholder="Bunny Video ID (اختياري)"
              defaultValue={lesson?.bunny_video_id ?? ""}
              inputMode="text"
            />
            <LevelSelect defaultValue={lesson?.level ?? "beginner"} />
            <PackageScopeSelect defaultValue={lesson?.package_access ?? "both"} />
            <Input
              name="lesson_order"
              type="number"
              placeholder="ترتيب الدرس"
              defaultValue={lesson?.lesson_order}
              required
            />
            <Input
              name="duration_minutes"
              type="number"
              placeholder="المدة بالدقائق"
              defaultValue={lesson?.duration_minutes ?? ""}
            />
            <Textarea
              name="description"
              placeholder="وصف قصير يظهر أعلى صفحة الدرس"
              defaultValue={lesson?.description ?? ""}
              className="md:col-span-2"
            />
            <Textarea
              name="summary"
              placeholder="ملخص الدرس"
              defaultValue={lesson?.summary ?? ""}
              className="md:col-span-2"
            />
            <SummaryLinkFields initialLinks={lesson?.summary_links} />
            <LessonVocabularyFields initialVocabulary={lesson?.vocabulary} />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                name="is_active"
                type="checkbox"
                defaultChecked={lesson?.is_active ?? true}
              />{" "}
              نشط
            </label>
          </>
        ) : null}

        {type === "live" ? (
          <>
            <Input name="title" placeholder="عنوان الحصة" required />
            <Input name="instructor_name" placeholder="اسم المدرب" />
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">
                المستوى المستهدف
              </label>
              <LevelSelect />
            </div>
            <PackageScopeSelect />
            <label className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-bold text-slate-300">
              <input name="applies_to_all" type="checkbox" /> متاحة لكل
              المستويات
            </label>
            <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm font-bold text-sky-100 md:col-span-2">
              جميع مواعيد الحصص يتم إدخالها وعرضها بتوقيت السعودية.
            </div>
            <DateTimePicker name="start_time" label="وقت بداية الحصة" required />
            <DateTimePicker name="end_time" label="وقت نهاية الحصة" required />
            <Input name="live_url" placeholder="رابط البث المباشر" />
            <Input name="replay_url" placeholder="رابط الإعادة" />
            <Textarea
              name="description"
              placeholder="وصف الحصة"
              className="md:col-span-2"
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input name="is_active" type="checkbox" defaultChecked /> نشط
            </label>
          </>
        ) : null}

        {type === "notification" ? (
          <>
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-300">نوع الجمهور</label>
              <select
                name="audience_type"
                value={notificationAudience}
                onChange={(event) => setNotificationAudience(event.target.value as "user" | "package")}
                className={selectClassName}
              >
                <option value="user">عضو محدد</option>
                <option value="package">باقة كاملة</option>
              </select>
            </div>
            {notificationAudience === "user" ? (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">العضو المستهدف</label>
                <select name="target_user_id" className={selectClassName} required>
                  <option value="">اختر العضو</option>
                  {notificationRecipients.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email || profile.id}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-300">الباقة المستهدفة</label>
                <select name="target_package" defaultValue="both" className={selectClassName} required>
                  <option value="bronze">الباقة البرونزية</option>
                  <option value="diamond">الباقة الماسية</option>
                  <option value="both">كلا الباقتين</option>
                </select>
              </div>
            )}
            <Input name="title" placeholder="عنوان الإشعار" required />
            <Input name="type" placeholder="النوع" />
            <Input name="link_url" placeholder="رابط اختياري" />
            <Textarea
              name="body"
              placeholder="نص الإشعار"
              className="md:col-span-2"
            />
          </>
        ) : null}

        {type === "story" ? (
          <>
            <Input
              name="student_name"
              placeholder="اسم الطالب"
              defaultValue={story?.student_name ?? ""}
              required
            />
            <Input
              name="title"
              placeholder="عنوان القصة"
              defaultValue={story?.title ?? ""}
              required
            />
            <Input
              name="score"
              type="number"
              placeholder="المبلغ"
              defaultValue={story?.score ?? ""}
            />
            <select
              name="score_currency"
              defaultValue={story?.score_currency ?? "SAR"}
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-sm text-slate-50 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            >
              <option value="SAR">ريال سعودي</option>
              <option value="USD">دولار أمريكي</option>
            </select>
            <Input
              name="image_url"
              placeholder="رابط الصورة"
              defaultValue={story?.image_url ?? ""}
            />
            <Textarea
              name="description"
              placeholder="القصة"
              defaultValue={story?.description ?? ""}
              className="md:col-span-2"
              required
            />
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                name="is_published"
                type="checkbox"
                defaultChecked={story?.is_published ?? false}
              />{" "}
              منشورة
            </label>
          </>
        ) : null}

        {state?.error ? (
          <p className="text-sm text-red-300 md:col-span-2">{state.error}</p>
        ) : null}
        {state?.success ? (
          <p className="text-sm text-emerald-300 md:col-span-2">
            {state.success}
          </p>
        ) : null}
        <div className="md:col-span-2">
          <Button disabled={pending}>
            {pending
              ? "جاري الحفظ..."
              : lesson
                ? "تحديث الدرس"
                : story
                  ? "تحديث القصة"
                  : "حفظ"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
