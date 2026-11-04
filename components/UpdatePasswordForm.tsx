"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setAllowed(Boolean(data.user));
      setChecking(false);
    });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password.length < 8) return setError("استخدم كلمة مرور من 8 أحرف على الأقل.");
    if (password !== confirmation) return setError("كلمتا المرور غير متطابقتين.");
    setPending(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError("تعذر تحديث كلمة المرور. اطلب رابط استعادة جديدًا وحاول مرة أخرى."); setPending(false); return; }
    await supabase.auth.signOut();
    router.replace("/login?password=updated");
    router.refresh();
  }

  return <Card className="w-full max-w-md p-6"><h1 className="text-2xl font-black text-white">تعيين كلمة مرور جديدة</h1>{checking ? <p className="mt-4 text-sm text-slate-400">جاري التحقق من رابط الاستعادة...</p> : allowed ? <form onSubmit={submit} className="mt-6 space-y-4"><Input name="password" type="password" autoComplete="new-password" placeholder="كلمة المرور الجديدة" required minLength={8} /><Input name="confirmation" type="password" autoComplete="new-password" placeholder="تأكيد كلمة المرور" required minLength={8} />{error ? <p className="text-sm text-red-300">{error}</p> : null}<Button className="w-full" disabled={pending}>{pending ? "جاري الحفظ..." : "حفظ كلمة المرور"}</Button></form> : <p className="mt-5 rounded-xl border border-red-400/20 bg-red-500/15 p-4 text-sm leading-7 text-red-200">رابط الاستعادة غير صالح أو انتهت صلاحيته. ارجع لصفحة «نسيت كلمة المرور» واطلب رابطًا جديدًا.</p>}</Card>;
}
