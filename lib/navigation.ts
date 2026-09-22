export type NavIconKey =
  | "dashboard"
  | "assistant"
  | "roadmap"
  | "challenge"
  | "lessons"
  | "live"
  | "notifications"
  | "stories"
  | "profile"
  | "admin"
  | "users"
  | "privateClasses";

export type NavLink = {
  href: string;
  label: string;
  icon: NavIconKey;
};

export const appNavLinks: NavLink[] = [
  { href: "/dashboard", label: "الرئيسية", icon: "dashboard" },
  { href: "/roadmap", label: "الخارطة", icon: "roadmap" },
  { href: "/challenge", label: "التحدي", icon: "challenge" },
  { href: "/ai-chat", label: "المعلم الذكي", icon: "assistant" },
  { href: "/live-sessions", label: "الحصص المباشرة", icon: "live" },
  { href: "/private-classes", label: "الكلاسات الخاصة", icon: "privateClasses" },
  { href: "/notifications", label: "الإشعارات", icon: "notifications" },
  { href: "/success-stories", label: "قصص النجاح", icon: "stories" },
  { href: "/profile", label: "الملف الشخصي", icon: "profile" },
];

export const adminNavLinks: NavLink[] = [
  { href: "/admin", label: "الإدارة", icon: "admin" },
  { href: "/admin/users", label: "إدارة الحسابات", icon: "users" },
];

export function getNavLinks(role?: string | null) {
  return role === "admin" ? [...appNavLinks, ...adminNavLinks] : appNavLinks;
}
