import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { LevelBadge } from "@/components/LevelBadge";
import { getProfile } from "@/lib/data";
import { getSubscriptionPackageLabel } from "@/lib/utils";

export default async function ProfilePage() {
  const profile = await getProfile();
  return (
    <AppShell profile={profile}>
      <Card className="max-w-2xl p-6">
        <h1 className="text-3xl font-black">الملف الشخصي</h1>
        <div className="mt-5 flex flex-wrap gap-3">
          <LevelBadge level={profile.level} />
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">{profile.role === "admin" ? "مدير" : "عضو"}</span>
          <span className="rounded-full bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-200">
            باقة {getSubscriptionPackageLabel(profile.subscription_package)}
          </span>
        </div>
        <dl className="mt-8 grid gap-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <dt className="text-xs font-bold text-slate-500">الاسم الكامل</dt>
            <dd className="mt-2 font-bold text-white">{profile.full_name || "غير مسجل"}</dd>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
            <dt className="text-xs font-bold text-slate-500">البريد الإلكتروني</dt>
            <dd className="mt-2 font-bold text-white">{profile.email || "غير مسجل"}</dd>
          </div>
        </dl>
      </Card>
    </AppShell>
  );
}
