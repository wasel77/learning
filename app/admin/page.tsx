import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/data";

const items = [
  ["/admin/users", "إدارة الحسابات"],
  ["/admin/questions", "إدارة الأسئلة"],
  ["/admin/lessons", "الدروس"],
  ["/admin/live-sessions", "الحصص المباشرة"],
  ["/admin/notifications", "الإشعارات"],
  ["/admin/success-stories", "قصص النجاح"],
  ["/admin/private-classes", "Private Classes"],
];

export default async function AdminPage() {
  const profile = await requireAdmin();
  return (
    <AppShell profile={profile}>
      <h1 className="text-3xl font-black">لوحة الإدارة</h1>
      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map(([href, label]) => (
          <Link key={href} href={href}>
            <Card className="p-6 transition hover:-translate-y-1 hover:border-sky-400/40">
              <h2 className="text-xl font-black">{label}</h2>
              <p className="mt-2 text-sm text-slate-400">إدارة هذا القسم من المنصة.</p>
            </Card>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
