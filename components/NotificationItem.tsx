import Link from "next/link";
import { CheckCheck } from "lucide-react";
import { markNotificationRead } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatArabicDate, replacePackageDisplayNames } from "@/lib/utils";
import type { Notification } from "@/lib/types";

export function NotificationItem({ notification }: { notification: Notification }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-white">{replacePackageDisplayNames(notification.title)}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-400">{replacePackageDisplayNames(notification.body)}</p>
          <p className="mt-3 text-xs text-slate-500">{formatArabicDate(notification.created_at)}</p>
        </div>
        {!notification.is_read ? <span className="mt-1 h-3 w-3 rounded-full bg-sky-300" /> : null}
      </div>
      <div className="mt-5 flex gap-3">
        {notification.link_url ? <Link href={notification.link_url} className="text-sm font-bold text-sky-300">فتح الرابط</Link> : null}
        {!notification.is_read ? (
          <form action={markNotificationRead.bind(null, notification.id)}>
            <Button size="sm" variant="secondary"><CheckCheck className="h-4 w-4" /> قراءة</Button>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
