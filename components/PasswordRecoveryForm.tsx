"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function PasswordRecoveryForm() {
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password/update`,
    });
    setSent(true);
    setPending(false);
  }

  return <Card className="w-full max-w-md p-6">
    <h1 className="text-2xl font-black text-white">استعادة كلمة المرور</h1>
    <p className="mt-2 text-sm leading-7 text-slate-400">أدخل بريد حسابك، وإذا كان مسجلًا سنرسل لك رابطًا آمنًا لتعيين كلمة مرور جديدة.</p>
    {sent ? <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-200">إذا كان البريد مرتبطًا بحساب، ستصلك رسالة الاستعادة خلال وقت قصير. تحقق أيضًا من البريد غير المرغوب.</div> : <form onSubmit={submit} className="mt-6 space-y-4"><Input name="email" type="email" autoComplete="email" placeholder="البريد الإلكتروني" required /><Button className="w-full" disabled={pending}>{pending ? "جاري الإرسال..." : "إرسال رابط الاستعادة"}</Button></form>}
    <Link href="/login" className="mt-5 inline-block text-sm font-bold text-sky-300">العودة إلى تسجيل الدخول</Link>
  </Card>;
}
