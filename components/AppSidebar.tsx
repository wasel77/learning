import Image from "next/image";
import Link from "next/link";
import {
  Bell,
  BookOpen,
  Bot,
  CalendarDays,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Map,
  Medal,
  Settings,
  User,
  Users,
  Gem,
} from "lucide-react";
import { signOut } from "@/lib/actions";
import { getNavLinks, type NavIconKey } from "@/lib/navigation";
import type { Profile } from "@/lib/types";

const iconMap = {
  dashboard: LayoutDashboard,
  assistant: Bot,
  roadmap: Map,
  challenge: Gamepad2,
  lessons: BookOpen,
  live: CalendarDays,
  notifications: Bell,
  stories: Medal,
  profile: User,
  admin: Settings,
  users: Users,
  privateClasses: Gem,
} satisfies Record<NavIconKey, typeof LayoutDashboard>;

export function AppSidebar({ profile }: { profile: Profile }) {
  const links = getNavLinks(profile.role);

  return (
    <header className="sticky top-0 z-40 hidden border-b border-slate-800 bg-slate-950/95 px-5 py-2.5 backdrop-blur lg:block">
      <div className="mx-auto flex max-w-7xl items-center gap-4">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
          <Image
            src="/logo.png"
            alt="وصل للتطور المالي"
            width={38}
            height={38}
            className="h-10 w-10 object-contain"
          />
          <div>
            <p className="text-xs font-black text-white">وصل للتطور المالي</p>
            <p className="text-[10px] text-slate-400">وجهتك الاولى للاستثمار</p>
          </div>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto px-2">
          {links.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                <Icon className="h-4 w-4 text-sky-300" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form action={signOut} className="shrink-0">
          <button
            type="submit"
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-slate-100 transition hover:border-sky-400/50 hover:bg-slate-800"
          >
            <LogOut className="h-3.5 w-3.5 text-sky-300" />
            خروج
          </button>
        </form>
      </div>
    </header>
  );
}
