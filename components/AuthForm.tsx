"use client";

import { useActionState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { signIn, signUp } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <Card className="w-full max-w-md p-7 shadow-2xl">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-sky-300">
        العودة إلى الرئيسية
      </Link>
      <Image
        src="/logo.png"
        alt="MISK"
        width={80}
        height={80}
        className="misk-brand-mark mb-5 h-20 w-20 object-contain"
      />
      <h1 className="text-2xl font-black text-white">{mode === "login" ? "تسجيل الدخول" : "إنشاء حساب"}</h1>
      <p className="mt-2 text-sm leading-7 text-slate-400">
        {mode === "login" ? "أدخل بريدك وكلمة المرور للوصول إلى مسارك التعليمي ومتابعة تقدّمك." : "سيتم إرسال رسالة تأكيد عبر Supabase SMTP."}
      </p>
      <form action={formAction} className="mt-6 space-y-4">
        {mode === "signup" ? <Input name="full_name" placeholder="الاسم الكامل" required /> : null}
        <Input name="email" type="email" placeholder="البريد الإلكتروني" required />
        <Input name="password" type="password" placeholder="كلمة المرور" required minLength={6} />
        {mode === "signup" ? (
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">باقة العضو</label>
            <select
              name="subscription_package"
              defaultValue="bronze"
              className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 text-sm text-slate-50 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
            >
              <option value="bronze">باقة ستارت</option>
              <option value="diamond">باقة رويال</option>
            </select>
          </div>
        ) : null}
        {state?.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
        {state?.success ? <p className="text-sm text-emerald-300">{state.success}</p> : null}
        <Button className="w-full" disabled={pending}>
          {pending ? "جاري التنفيذ..." : mode === "login" ? "دخول" : "إنشاء الحساب"}
          <ArrowLeft className="h-4 w-4" />
        </Button>
      </form>
      {mode === "signup" ? (
        <p className="mt-5 text-center text-sm text-slate-400">
          لديك حساب بالفعل؟{" "}
          <Link href="/login" className="font-bold text-sky-300">
            تسجيل الدخول
          </Link>
        </p>
      ) : (
        <p className="mt-6 border-t border-slate-800 pt-5 text-center text-sm leading-7 text-slate-400">
          إذا واجهتك مشكلة في بيانات حسابك بعد الاشتراك، راجع{" "}
          <Link href="/#faq" className="font-bold text-sky-300">الأسئلة الشائعة</Link>{" "}
          أو <a href="https://t.me/MISKSupport" target="_blank" rel="noreferrer" className="font-bold text-sky-300">تواصل معنا</a>.
        </p>
      )}
    </Card>
  );
}
