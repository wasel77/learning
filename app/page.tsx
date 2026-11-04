import Image from "next/image";
import Link from "next/link";
import { BookOpen, CalendarDays, Check, ChevronDown, LineChart, ShieldCheck } from "lucide-react";
import { MarketChart } from "@/components/MarketChart";
import { SuccessStoryCard } from "@/components/SuccessStoryCard";
import { createClient } from "@/lib/supabase/server";
import type { SuccessStory } from "@/lib/types";

const features = [
  { title: "مسار منظم من الصفر", description: "الانتقال من المفاهيم الأساسية إلى قراءة السوق وفهم أدوات التداول وإدارة المخاطر.", icon: BookOpen },
  { title: "تطبيق عملي على السوق", description: "دروس وتطبيقات تساعد على قراءة الرسوم البيانية وفهم حركة السوق.", icon: LineChart },
  { title: "حصص تعليمية مباشرة", description: "مواعيد تعليمية وروابط حضور واضحة وفق الخدمات الحالية.", icon: CalendarDays },
];

const packages = [
  { name: "رويال", tag: "الأكثر تميزاً", description: "تجربة تعليمية موسعة لمن يريد متابعة أعمق ومساراً أكثر كثافة.", href: "https://miskpay.site/الباقة-الالماسية/p925399206", features: ["المسار التعليمي المتقدم", "اختبارات وتطبيقات", "الحصص التعليمية المتاحة"] },
  { name: "ستارت", tag: "ابدأ الآن", description: "اختيار مناسب للبدء في رحلة منظمة داخل المنصة.", href: "https://miskpay.site/الباقة-البرونزيه/p1016013833", features: ["بداية منظمة من الأساسيات", "متابعة التقدم", "اختبارات قصيرة"] },
];

const faqs = [
  ["هل المحتوى توصيات تداول؟", "لا. ما تقدّمه المنصة محتوى تعليمي يشرح كيف تعمل الأسواق وكيف تقرأ الرسم البياني وتدير مخاطرك. لا نرسل توصيات بالشراء أو البيع، ولا نضمن أي أرباح، ولا ندير أموال أحد."],
  ["كيف أدخل المنصة بعد الاشتراك؟", "هذه الإجابة قيد المراجعة للتأكد من مطابقتها لطريقة إنشاء حسابات MISK الحالية. للدعم بخصوص حسابك، تواصل معنا عبر تيليجرام."],
  ["أحتاج خبرة سابقة؟", "لا. المسار الأول يبدأ من المصطلحات الأساسية ولا يفترض أي خلفية."],
  ["إذا فاتتني الحصة المباشرة؟", "يصلك تسجيل الحصة متى نصّت باقتك على ذلك، ومواعيد الحصص تُعلن مسبقاً حتى ترتب وقتك عليها. تغيّبك عن حصة لا يستحق استرداداً."],
  ["أقدر أرقّي باقتي لاحقًا؟", "هذه الإجابة قيد المراجعة للتأكد من آلية احتساب المدة المتبقية في اشتراك MISK. تواصل مع الدعم قبل الترقية حتى لا يتأثر تقدمك."],
];

export default async function Home() {
  const supabase = await createClient();
  const { data: stories } = await supabase.from("success_stories").select("*").eq("is_published", true).order("created_at", { ascending: false });
  const publishedStories = (stories ?? []) as SuccessStory[];

  return (
    <main className="public-home min-h-screen overflow-hidden" dir="rtl">
      <header className="public-nav"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
        <Link href="/" className="flex items-center gap-3" aria-label="مسك للتطور المالي - الرئيسية"><Image src="/logo.png" alt="MISK" width={58} height={58} className="h-14 w-14 object-contain" priority /><span className="hidden font-black text-slate-100 sm:block">مسك للتطور المالي</span></Link>
        <nav className="hidden items-center gap-6 text-sm font-bold lg:flex" aria-label="التنقل الرئيسي"><a href="#learning">طريقة التعلّم</a><a href="#plans">الباقات</a><a href="#stories">قصص النجاح</a><a href="#faq">الأسئلة الشائعة</a></nav>
        <Link href="/login" className="misk-button-primary rounded-xl px-5 py-3 font-bold">تسجيل الدخول</Link>
      </div></header>

      <section className="hero-glow mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1fr_.95fr] lg:py-24"><div>
        <p className="eyebrow">منصة تعليمية سعودية</p><h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.25] text-slate-100 md:text-6xl">افهم التداول <span className="text-sky-300">خطوة بخطوة</span> قبل أن تخاطر</h1>
        <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-400">تعلّم المفاهيم الأساسية، وانتقل تدريجياً إلى قراءة السوق وإدارة المخاطر من خلال دروس مرتبة حسب المستوى، واختبارات قصيرة، وحصص تعليمية مباشرة.</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row"><a href="#learning" className="misk-button-primary rounded-xl px-7 py-4 text-center font-bold">تعرّف على طريقة التعلّم</a><Link href="/signup" className="misk-button-secondary rounded-xl px-7 py-4 text-center font-bold">ابدأ رحلتك</Link></div>
      </div><MarketChart /></section>

      <section className="mx-auto max-w-7xl px-5 pb-10"><div className="warning-card"><ShieldCheck className="h-7 w-7 shrink-0" /><div><h2 className="text-xl font-black">تنبيه مهم</h2><p className="mt-2 leading-7">المحتوى تعليمي فقط وليس توصية مالية، الهدف هو بناء المعرفة والانضباط قبل اتخاذ أي قرار.</p></div></div></section>
      <section className="mx-auto grid max-w-7xl gap-4 px-5 py-12 md:grid-cols-3">{[["4", "مستويات تعليمية"], ["35+", "اختبارات وتطبيقات"], ["24/7", "وصول للمنصة"]].map(([value, label]) => <div key={label} className="stat-card"><strong>{value}</strong><span>{label}</span></div>)}</section>

      <section id="learning" className="section-band scroll-mt-24"><div className="mx-auto max-w-7xl px-5 py-20"><p className="eyebrow">نظرة تعليمية على السوق</p><h2 className="section-title">تعلّم قبل أن تخاطر</h2><p className="section-copy">المحتوى تعليمي فقط وليس توصية مالية. الهدف هو بناء المعرفة والانضباط قبل اتخاذ أي قرار.</p><div className="mt-10 grid gap-5 md:grid-cols-3">{features.map(({ title, description, icon: Icon }) => <article className="feature-card" key={title}><Icon className="h-7 w-7 text-sky-300" /><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-20"><h2 className="section-title text-center">كيف تبدأ رحلتك التعليمية؟</h2><div className="steps-grid mt-12">{["أنشئ حسابك", "اختر مسارك", "شاهد الدروس", "حل الاختبار", "تابع تقدمك"].map((step, i) => <div key={step} className="step-item"><span>{i + 1}</span><strong>{step}</strong></div>)}</div></section>

      <section id="plans" className="section-band scroll-mt-24"><div className="mx-auto max-w-7xl px-5 py-20"><p className="eyebrow">باقات الاشتراك</p><h2 className="section-title">اختر الباقة المناسبة لك</h2><div className="mt-10 grid gap-6 md:grid-cols-2">{packages.map((plan) => <article key={plan.name} className="plan-card"><div className="flex items-start justify-between"><div><p className="text-sm text-sky-300">باقة</p><h3>{plan.name}</h3></div><span className="plan-tag">{plan.tag}</span></div><p className="mt-4 leading-7 text-slate-400">{plan.description}</p><ul className="mt-6 space-y-3">{plan.features.map((item) => <li key={item} className="flex items-center gap-2"><Check className="h-5 w-5 text-sky-300" />{item}</li>)}</ul><a href={plan.href} target="_blank" rel="noreferrer" className="misk-button-primary mt-8 block rounded-xl px-6 py-4 text-center font-bold">اشترك الآن</a></article>)}</div><p className="store-note">الاشتراك والدفع يتمان عبر متجر مسك على سلة.</p></div></section>

      {publishedStories.length ? <section id="stories" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-20"><p className="eyebrow">تجارب طلابنا</p><h2 className="section-title">قصص النجاح</h2><div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{publishedStories.map((story) => <SuccessStoryCard key={story.id} story={story} />)}</div></section> : null}
      <section className="mx-auto max-w-7xl px-5 pb-20"><div className="disclaimer-card"><p>نتائج فردية تخص أصحابها، وتختلف من شخص لآخر حسب ظروفه ورأس ماله ووقته. لا تمثل نتائج متوقعة ولا تضمن المنصة تحقيق أي أرباح.</p><Link href="/disclaimer">اقرأ إخلاء المسؤولية</Link></div></section>

      <section id="faq" className="section-band scroll-mt-24"><div className="mx-auto max-w-4xl px-5 py-20"><h2 className="section-title">أسئلة شائعة</h2><div className="mt-9 space-y-3">{faqs.map(([q, a]) => <details key={q} className="faq-item"><summary><span>{q}</span><ChevronDown className="h-5 w-5" /></summary><p>{a}</p></details>)}</div></div></section>
      <section className="mx-auto max-w-5xl px-5 py-20"><div className="final-cta"><h2>ابدأ من حيث يجب أن تبدأ: الفهم</h2><p>اختبر فهمك قبل أن تخاطر بريال واحد.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/signup" className="rounded-xl bg-[#f5f4ef] px-7 py-4 text-center font-bold text-[#123d33]">ابدأ رحلتك</Link><a href="#learning" className="rounded-xl border border-white/30 px-7 py-4 text-center font-bold text-white">تعرّف على طريقة التعلّم</a></div></div></section>

      <footer className="public-footer"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-2 lg:grid-cols-4"><div><Image src="/logo.png" alt="MISK" width={74} height={74} className="h-16 w-16 object-contain" /><h3 className="mt-4 font-black">مسك للتطور المالي</h3><p className="mt-3 leading-7 text-slate-400">منصة تعليمية لبناء فهم منظم لأساسيات الأسواق المالية وقراءة السوق وإدارة المخاطر.</p></div><FooterColumn title="المنصة" links={[["الرئيسية", "/"], ["الباقات", "/#plans"], ["قصص النجاح", "/#stories"], ["الأسئلة الشائعة", "/#faq"], ["تسجيل الدخول", "/login"]]} /><FooterColumn title="السياسات" links={[["الشروط والأحكام", "/terms"], ["سياسة الخصوصية", "/privacy"], ["سياسة الاسترجاع", "/refund"], ["إخلاء المسؤولية", "/disclaimer"]]} /><div><h3 className="footer-title">تواصل معنا</h3><a href="https://t.me/MISKSupport" target="_blank" rel="noreferrer" className="mt-5 inline-block text-sky-300">دعم MISK على تيليجرام</a></div></div><div className="border-t border-slate-800 px-5 py-6 text-center text-sm text-slate-400">© 2026 مسك للتطور المالي. جميع الحقوق محفوظة.</div></footer>
    </main>
  );
}

function FooterColumn({ title, links }: { title: string; links: string[][] }) { return <div><h3 className="footer-title">{title}</h3><ul className="mt-5 space-y-3 text-slate-400">{links.map(([label, href]) => <li key={href}><Link href={href} className="transition hover:text-sky-300">{label}</Link></li>)}</ul></div>; }
