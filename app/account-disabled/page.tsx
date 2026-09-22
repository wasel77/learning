import Link from "next/link";
import { Mail, ShieldX } from "lucide-react";
import { AccountDisabledActions } from "@/components/AccountDisabledActions";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  BRONZE_RENEWAL_URL,
  DIAMOND_RENEWAL_URL,
  DIAMOND_UPGRADE_URL,
} from "@/lib/subscription-links";
import type { SubscriptionPackage } from "@/lib/types";

export default async function AccountDisabledPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("subscription_package")
        .eq("id", user.id)
        .maybeSingle<{ subscription_package: SubscriptionPackage | null }>()
    : { data: null };
  const subscriptionPackage = profile?.subscription_package;

  return (
    <main
      className="min-h-screen bg-[#020617] px-4 py-10 text-slate-50"
      dir="rtl"
    >
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl place-items-center">
        <Card className="relative w-full max-w-xl overflow-hidden p-8 text-center">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-l from-red-400 via-blue-600 to-cyan-300" />
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-red-500/15 text-red-300 shadow-lg shadow-red-950/30">
            <ShieldX className="h-8 w-8" />
          </div>
          <p className="mt-5 text-sm font-bold text-red-200">
            لا يمكن الوصول إلى المنصة
          </p>
          <h1 className="mt-3 text-3xl font-black text-white">
            تم تعطيل حسابك
          </h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-400">
            حسابك غير نشط حاليا، لذلك لا يمكنك فتح الدروس أو لوحة التحكم. إذا
            كنت تعتقد أن هذا حدث بالخطأ، تواصل مع الإدارة لإعادة التفعيل.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <AccountDisabledActions />
            <Link
              href="mailto:mohamedhoarra1@gmail.com"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 text-sm font-semibold text-slate-100 transition hover:border-sky-400/60 hover:bg-slate-800"
            >
              <Mail className="h-4 w-4" />
              تواصل مع الإدارة
            </Link>
          </div>
          {subscriptionPackage === "diamond" ? (
            <a
              href={DIAMOND_RENEWAL_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-500"
            >
              تجديد الاشتراك
            </a>
          ) : subscriptionPackage === "bronze" ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <a
                href={BRONZE_RENEWAL_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-5 text-sm font-black text-white transition hover:bg-blue-500"
              >
                تجديد البرونزية
              </a>
              <a
                href={DIAMOND_UPGRADE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-amber-400/40 bg-amber-400/10 px-5 text-sm font-black text-amber-200 transition hover:bg-amber-400/20"
              >
                الترقية للألماسية
              </a>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-slate-700 bg-slate-900/70 p-3 text-sm leading-6 text-slate-300">
              تواصلي مع الإدارة لمعرفة خيار إعادة التفعيل المناسب لحسابك.
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}
