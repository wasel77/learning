import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return <main className="legal-page min-h-screen" dir="rtl">
    <header className="public-nav"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4"><Link href="/" className="flex items-center gap-3"><Image src="/logo.png" alt="MISK" width={52} height={52} className="h-12 w-12 object-contain" /><span className="font-black text-slate-100">مسك للتطور المالي</span></Link><Link href="/" className="text-sm font-bold text-sky-300">العودة للرئيسية</Link></div></header>
    <article className="legal-content mx-auto max-w-4xl px-5 py-16"><h1>{title}</h1><p className="legal-updated">آخر تحديث: 28 أكتوبر 2026</p>{children}<div className="legal-contact">لأي استفسار بخصوص هذه الصفحة، تواصل معنا عبر <a href="https://t.me/MISKSupport" target="_blank" rel="noreferrer">دعم MISK على تيليجرام</a>.<div className="mt-3 flex flex-wrap gap-4"><Link href="/terms">الشروط والأحكام</Link><Link href="/privacy">سياسة الخصوصية</Link><Link href="/refund">سياسة الاسترجاع</Link><Link href="/disclaimer">إخلاء المسؤولية</Link></div></div></article>
  </main>;
}

export function LegalWarning({ children }: { children: ReactNode }) { return <div className="legal-warning">{children}</div>; }
