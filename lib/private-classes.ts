import type { PrivateClassBooking, PrivateClassCoach } from "@/lib/types";

export const PRIVATE_CLASS_HOURS = [18, 19, 20, 21, 22, 23];

export function formatRiyadhDate(value: string) {
  return new Intl.DateTimeFormat("ar-SA", {
    timeZone: "Asia/Riyadh",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export function toDateTimeLocal(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(date)
    .replace(", ", "T");
}

export function buildAvailableSlots(
  coaches: PrivateClassCoach[],
  bookings: Pick<PrivateClassBooking, "coach_id" | "starts_at" | "status">[],
  availability: {
    coach_id: string;
    blocked_date: string;
    start_time: string;
    is_blocked: boolean;
  }[],
  days = 35,
) {
  const currentRiyadh = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const start = new Date(`${currentRiyadh}T00:00:00Z`);
  const occupied = new Set(
    bookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => `${b.coach_id}:${new Date(b.starts_at).toISOString()}`),
  );
  const blocked = new Map(
    availability.map((a) => [
      `${a.coach_id}:${a.blocked_date}:${a.start_time.slice(0, 5)}`,
      a.is_blocked,
    ]),
  );
  const slots: { coachId: string; value: string; label: string }[] = [];
  for (let offset = 0; offset < days; offset += 1) {
    const cursor = new Date(start);
    cursor.setUTCDate(start.getUTCDate() + offset);
    const dow = cursor.getUTCDay();
    if (dow === 5 || dow === 6) continue;
    const date = cursor.toISOString().slice(0, 10);
    for (const coach of coaches.filter((c) => c.is_active && c.is_bookable)) {
      for (const hour of PRIVATE_CLASS_HOURS) {
        const local = `${date}T${String(hour).padStart(2, "0")}:00`;
        const iso = new Date(`${local}:00+03:00`).toISOString();
        if (new Date(iso).getTime() <= Date.now()) continue;
        if (occupied.has(`${coach.id}:${iso}`)) continue;
        if (
          blocked.get(`${coach.id}:${date}:00:00`) ||
          blocked.get(`${coach.id}:${date}:${String(hour).padStart(2, "0")}:00`)
        )
          continue;
        slots.push({
          coachId: coach.id,
          value: local,
          label: formatRiyadhDate(iso),
        });
      }
    }
  }
  return slots;
}

export function googleCalendarUrl(
  booking: PrivateClassBooking,
  coachName: string,
) {
  const format = (value: string) =>
    new Date(value)
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `جلسة خاصة مع ${coachName}`,
    dates: `${format(booking.starts_at)}/${format(booking.ends_at)}`,
    details:
      "جلسة خاصة من أكاديمية وصل. رابط Zoom يظهر في الموقع قبل الموعد بـ15 دقيقة.",
    ctz: "Asia/Riyadh",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}
