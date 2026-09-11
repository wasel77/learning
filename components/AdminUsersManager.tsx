"use client";

import { useActionState, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { AlertTriangle, LoaderCircle, Lock, Trash2, Unlock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  deleteUserAccount,
  setAccountActive,
  updateUserSubscriptionPackage,
} from "@/lib/actions";
import {
  getLevelLabel,
  getSubscriptionPackageLabel,
} from "@/lib/utils";
import type { Level, Profile, SubscriptionPackage } from "@/lib/types";

type ActionState = { error?: string; success?: string };

const selectClassName = "h-10 rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-50 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20";

function PackageEditor({ user }: { user: Profile }) {
  const action = updateUserSubscriptionPackage.bind(null, user.id);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <select
        name="subscription_package"
        defaultValue={user.subscription_package}
        className={selectClassName}
        aria-label={`باقة ${user.full_name || user.email || "العضو"}`}
      >
        <option value="bronze">البرونزية</option>
        <option value="diamond">الماسية</option>
      </select>
      <Button size="sm" variant="secondary" disabled={pending}>
        {pending ? "جارٍ الحفظ..." : "تحديث الباقة"}
      </Button>
      {state.error ? <span className="text-xs text-red-300">{state.error}</span> : null}
      {state.success ? <span className="text-xs text-emerald-300">{state.success}</span> : null}
    </form>
  );
}

function DeleteUserButton({ user }: { user: Profile }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => cancelRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [open]);

  function closeDialog() {
    if (!pending) setOpen(false);
  }

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteUserAccount(user.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  const label = user.full_name || user.email || "هذا العضو";

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        ref={triggerRef}
        type="button"
        variant="danger"
        size="sm"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Trash2 className="h-4 w-4" />
        حذف نهائي
      </Button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}

      {open ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
        >
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            onKeyDown={(event) => {
              if (event.key === "Escape") closeDialog();
            }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-red-400/20 bg-slate-900 shadow-[0_32px_100px_rgba(0,0,0,0.65)]"
          >
            <div className="absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.18),transparent_70%)]" />

            <button
              type="button"
              onClick={closeDialog}
              disabled={pending}
              aria-label="إغلاق نافذة التأكيد"
              className="absolute left-5 top-5 z-10 grid h-9 w-9 place-items-center rounded-full text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="relative px-6 pb-6 pt-8 sm:px-8 sm:pb-8">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-red-400/25 bg-red-500/15 text-red-300 shadow-lg shadow-red-950/30">
                <AlertTriangle className="h-7 w-7" />
              </div>

              <h2 id={titleId} className="mt-5 text-2xl font-black text-white">
                تأكيد حذف الحساب
              </h2>
              <p id={descriptionId} className="mt-2 text-sm leading-7 text-slate-400">
                أنت على وشك حذف هذا العضو وجميع البيانات المرتبطة بحسابه نهائيًا.
              </p>

              <div className="mt-5 rounded-2xl border border-slate-700/80 bg-slate-950/65 p-4">
                <p className="text-xs font-bold text-slate-500">الحساب المحدد</p>
                <p className="mt-2 break-words font-black text-slate-100">{label}</p>
                {user.full_name && user.email ? (
                  <p className="mt-1 break-all text-sm text-slate-500">{user.email}</p>
                ) : null}
              </div>

              <div className="mt-4 flex gap-3 rounded-2xl border border-red-400/15 bg-red-500/8 p-4 text-sm leading-6 text-red-100">
                <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                <p>
                  سيتم حذف بيانات العضو وتقدمه وإشعاراته. هذا الإجراء نهائي ولا يمكن التراجع عنه.
                </p>
              </div>

              {error ? (
                <p role="alert" className="mt-4 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </p>
              ) : null}

              <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button
                  ref={cancelRef}
                  type="button"
                  variant="secondary"
                  onClick={closeDialog}
                  disabled={pending}
                  className="sm:min-w-28"
                >
                  إلغاء
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={handleDelete}
                  disabled={pending}
                  className="bg-red-600 text-white shadow-lg shadow-red-950/30 hover:bg-red-500 sm:min-w-36"
                >
                  {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  {pending ? "جارٍ الحذف..." : "تأكيد الحذف"}
                </Button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function AccountStatusButton({ user }: { user: Profile }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatusChange() {
    setError(null);
    startTransition(async () => {
      const result = await setAccountActive(user.id, !user.is_active);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        variant={user.is_active ? "danger" : "secondary"}
        size="sm"
        onClick={handleStatusChange}
        disabled={pending}
      >
        {user.is_active ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
        {pending ? "جارٍ التنفيذ..." : user.is_active ? "تعطيل الحساب" : "تفعيل الحساب"}
      </Button>
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </div>
  );
}

export function AdminUsersManager({
  users,
  currentAdminId,
}: {
  users: Profile[];
  currentAdminId: string;
}) {
  const [packageFilter, setPackageFilter] = useState<"all" | SubscriptionPackage>("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "unset" | Level>("all");

  const visibleUsers = useMemo(
    () =>
      users.filter((user) => {
        const packageMatches = packageFilter === "all" || user.subscription_package === packageFilter;
        const levelMatches =
          levelFilter === "all" ||
          (levelFilter === "unset" ? user.level === null : user.level === levelFilter);
        return packageMatches && levelMatches;
      }),
    [levelFilter, packageFilter, users],
  );

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
        <div>
          <label className="mb-2 block text-xs font-bold text-slate-400">فلترة حسب الباقة</label>
          <select
            value={packageFilter}
            onChange={(event) => setPackageFilter(event.target.value as "all" | SubscriptionPackage)}
            className={selectClassName}
          >
            <option value="all">كل الباقات</option>
            <option value="bronze">البرونزية</option>
            <option value="diamond">الماسية</option>
          </select>
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold text-slate-400">فلترة حسب المستوى</label>
          <select
            value={levelFilter}
            onChange={(event) => setLevelFilter(event.target.value as "all" | "unset" | Level)}
            className={selectClassName}
          >
            <option value="all">كل المستويات</option>
            <option value="unset">غير محدد</option>
            <option value="beginner">مبتدئ</option>
            <option value="advanced">متقدم</option>
            <option value="expert">خبير</option>
            <option value="professional">محترف</option>
            <option value="strategies">استراتيجيات</option>
          </select>
        </div>
        <div className="self-end rounded-xl bg-slate-950/70 px-4 py-2.5 text-sm font-bold text-slate-300">
          {visibleUsers.length} حساب
        </div>
      </div>

      <div className="mt-6 grid gap-4">
        {visibleUsers.map((user) => (
          <Card key={user.id} className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-black text-white">{user.full_name || user.email}</h2>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {user.role === "admin" ? "مدير" : "عضو"}
                  </span>
                  <span className={user.is_active ? "rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200" : "rounded-full bg-red-400/10 px-3 py-1 text-xs text-red-200"}>
                    {user.is_active ? "نشط" : "معطل"}
                  </span>
                  <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">
                    {getSubscriptionPackageLabel(user.subscription_package)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{user.email}</p>
                <p className="mt-1 text-xs text-slate-500">المستوى: {getLevelLabel(user.level)}</p>
              </div>

              {user.role === "student" ? (
                <div className="flex max-w-full flex-col items-start gap-3">
                  <PackageEditor user={user} />
                  <div className="flex flex-wrap gap-2">
                    <AccountStatusButton user={user} />
                    <DeleteUserButton user={user} />
                  </div>
                </div>
              ) : user.id === currentAdminId ? (
                <span className="text-xs text-slate-500">حسابك الإداري الحالي</span>
              ) : (
                <span className="text-xs text-slate-500">حساب إداري محمي</span>
              )}
            </div>
          </Card>
        ))}

        {!visibleUsers.length ? (
          <Card className="p-6 text-slate-400">لا توجد حسابات تطابق عوامل الفلترة.</Card>
        ) : null}
      </div>
    </>
  );
}
