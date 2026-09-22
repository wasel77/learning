import { Gem, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DIAMOND_UPGRADE_URL } from "@/lib/subscription-links";

export function PackageLockedState({ title }: { title?: string }) {
  return (
    <Card className="mx-auto max-w-2xl p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-400/10 text-amber-300">
        <Lock className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-2xl font-black">هذه الميزة غير متاحة لباقتك الحالية</h1>
      <p className="mt-3 leading-7 text-slate-300">
        {title ? `${title} حصري للألماسي.` : "هذا المحتوى حصري للألماسي."} رقّي باقتك لفتح المحتوى.
      </p>
      <a
        href={DIAMOND_UPGRADE_URL}
        target="_blank"
        rel="noreferrer"
        className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-300 px-6 text-sm font-black text-amber-950 transition hover:bg-amber-200"
      >
        <Gem className="h-4 w-4" />
        الترقية للألماسية
      </a>
    </Card>
  );
}
