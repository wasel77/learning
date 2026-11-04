"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import type { Notification } from "@/lib/types";
import { replacePackageDisplayNames } from "@/lib/utils";

export function NotificationToast({ userId }: { userId: string }) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (mounted && data) setNotification(data as Notification);
      });

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotification(payload.new as Notification);
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  function markRead() {
    if (!notification) return;
    const id = notification.id;
    setNotification(null);
    startTransition(async () => {
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", userId);
    });
  }

  return (
    <AnimatePresence>
      {notification ? (
        <motion.div
          initial={{ opacity: 0, y: -24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="fixed left-4 right-4 top-4 z-50 mx-auto max-w-xl rounded-2xl border border-sky-400/30 bg-slate-950/95 p-4 text-slate-50 shadow-2xl shadow-blue-950/50 backdrop-blur md:left-6 md:right-auto md:top-6 md:w-[420px]"
          dir="rtl"
        >
          <div className="flex gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-600/20 text-sky-300">
              <BellRing className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-black text-white">{replacePackageDisplayNames(notification.title)}</h3>
                <button
                  type="button"
                  onClick={() => setNotification(null)}
                  className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {notification.body ? (
                <p className="mt-2 text-sm leading-6 text-slate-300">{replacePackageDisplayNames(notification.body)}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {notification.link_url ? (
                  <Link
                    href={notification.link_url}
                    onClick={markRead}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-500"
                  >
                    عرض التفاصيل
                  </Link>
                ) : null}
                <Button type="button" size="sm" variant="secondary" onClick={markRead} disabled={isPending}>
                  <Check className="h-4 w-4" />
                  تم
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
