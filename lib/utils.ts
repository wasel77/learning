import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const SAUDI_TIME_ZONE = "Asia/Riyadh";
export const SAUDI_UTC_OFFSET = "+03:00";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseSaudiDateTimeToUtcIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withSeconds = trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const withSaudiOffset = /(?:z|[+-]\d{2}:?\d{2})$/i.test(withSeconds)
    ? withSeconds
    : `${withSeconds}${SAUDI_UTC_OFFSET}`;
  const date = new Date(withSaudiOffset);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function getSaudiDateParts(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-US-u-nu-latn", {
    timeZone: SAUDI_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

export function getSaudiDateKey(value: string | Date) {
  const parts = getSaudiDateParts(value);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function formatArabicDate(
  value: string | Date,
  options?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("ar-EG", {
    timeZone: SAUDI_TIME_ZONE,
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(new Date(value));
}

export function getLevelLabel(level?: string | null) {
  if (level === "strategies") return "استراتيجيات";
  if (level === "professional") return "محترف";
  if (level === "expert") return "خبير";
  if (level === "advanced") return "متقدم";
  if (!level) return "غير محدد";
  return "مبتدئ";
}

export function getSubscriptionPackageLabel(value?: string | null) {
  return value === "diamond" ? "الماسية" : "البرونزية";
}

export function getContentPackageScopeLabel(value?: string | null) {
  if (value === "diamond") return "الماسية";
  if (value === "bronze") return "البرونزية";
  return "كلا الباقتين";
}

export function calculateLevel(percentage: number) {
  if (percentage >= 80) return "expert";
  if (percentage >= 50) return "advanced";
  return "beginner";
}
