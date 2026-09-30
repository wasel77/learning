import { Lock } from "lucide-react";
import { Card } from "@/components/ui/card";

export function ProgressionLockedState({ title }: { title?: string }) {
  return (
    <Card className="mx-auto max-w-2xl p-8 text-center">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-800 text-slate-300">
        <Lock className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-2xl font-black">هذا الدرس مقفول حاليًا</h1>
      <p className="mt-3 leading-7 text-slate-300">
        {title ? `${title} يفتح بعد إكمال التقدم المطلوب.` : "أكمل الدروس والاختبارات السابقة لفتح هذا المحتوى."}
      </p>
    </Card>
  );
}
