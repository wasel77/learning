import { AppSidebar } from "@/components/AppSidebar";
import { AccountStatusGuard } from "@/components/AccountStatusGuard";
import { NotificationToast } from "@/components/NotificationToast";
import { TopNavbar } from "@/components/TopNavbar";
import type { Profile } from "@/lib/types";

export function AppShell({ profile, children }: { profile: Profile; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div dir="rtl">
        <AppSidebar profile={profile} />
        <TopNavbar profile={profile} />
        <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-8">{children}</main>
        <NotificationToast userId={profile.id} />
        <AccountStatusGuard userId={profile.id} />
      </div>
    </div>
  );
}
