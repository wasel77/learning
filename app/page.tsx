import Image from "next/image";
import Link from "next/link";
import { BookOpenCheck, CalendarDays, Gem, LineChart, Medal, ShieldCheck } from "lucide-react";
import { MarketChart } from "@/components/MarketChart";
import { SuccessStoriesSection } from "@/components/SuccessStoriesSection";
import { buttonClassName } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import type { SuccessStory } from "@/lib/types";

const learningFeatures = [
  { title: "مسار منظم من الصفر", description: "الانتقال من المفاهيم الأساسية إلى قراءة السوق وفهم أدوات التداول وإدارة المخاطر.", icon: BookOpenCheck },
  { title: "تطبيق عملي على السوق", description: "دروس وتطبيقات تساعد على قراءة الرسوم البيانية وفهم حركة السوق.", icon: LineChart },
  { title: "حصص تعليمية مباشرة", description: "مواعيد تعليمية وروابط حضور واضحة وفق الخدمات الحالية.", icon: CalendarDays },
];

const subscriptionPackages = [
  { title: "باقة الألماسية", description: "تجربة تعليمية موسعة لمن يريد متابعة أعمق ومسارا أكثر كثافة.", href: "https://miskpay.site/الباقه-الالماسيه/p925399206", icon: Gem, variant: "diamond", badge: "الأكثر تميزا" },
  { title: "باقة البرونزية", description: "اختيار مناسب للبدء في رحلة منظمة داخل المنصة.", href: "https://miskpay.site/الباقه-البرونزيه/p1016013833", icon: Medal, variant: "bronze", badge: "ابدأ الآن" },
];

const faqs = [
  { question: "هل المحتوى توصيات تداول؟", answer: <>لا. ما تقدّمه المنصة محتوى تعليمي يشرح كيف تعمل الأسواق وكيف تقرأ الرسم البياني وتدير مخاطرك. لا نرسل توصيات بالشراء أو البيع، ولا نضمن أي أرباح، ولا ندير أموال أحد. تفاصيل ذلك في صفحة <Link href="/disclaimer">إخلاء المسؤولية</Link>.</> },
  { question: "كيف أدخل المنصة بعد الاشتراك؟", answer: <>بعد إتمام الدفع في متجر مسك على سلة، ننشئ لك الحساب ونرسل لك بياناته على بريدك. لا حاجة لتسجيل نفسك: ادخل من صفحة <Link href="/login">تسجيل الدخول</Link> بالبريد وكلمة المرور التي وصلتك. إذا لم تصلك خلال وقت قصير، <a href="https://t.me/MISKSupport" target="_blank" rel="noreferrer">تواصل معنا عبر دعم مسك على تيليجرام</a> وأرسل رقم الطلب.</> },
  { question: "أحتاج خبرة سابقة؟", answer: <>لا. المسار الأول يبدأ من المصطلحات الأساسية ولا يفترض أي خلفية. وإذا كانت لديك خبرة، يحدد اختبار التحديد النقطة المناسبة لتبدأ منها بدل إعادة ما تعرفه.</> },
  { question: "إذا فاتتني الحصة المباشرة؟", answer: <>يصلك تسجيل الحصة متى نصّت باقتك على ذلك، فتراجعه في وقتك. ومواعيد الحصص تُعلن مسبقاً حتى ترتب وقتك عليها. تغيّبك عن حصة لا يستحق استرداداً، وتفاصيل ذلك في <Link href="/refund">سياسة الاسترجاع</Link>.</> },
  { question: "أقدر أرقّي باقتي لاحقًا؟", answer: <>نعم. يمكنك الانتقال إلى باقة أعلى في أي وقت من متجر مسك على سلة، ويُحتسب لك ما تبقّى من اشتراكك الحالي. <a href="https://t.me/MISKSupport" target="_blank" rel="noreferrer">تواصل معنا عبر دعم مسك على تيليجرام</a> قبل الترقية لنضبط لك الحساب دون أن تفقد تقدّمك.</> },
];

export default async function Home() {
  const supabase = await createClient();
  const { data: stories } = await supabase.from("success_stories").select("*").eq("is_published", true).order("created_at", { ascending: false });
  const publishedStories = (stories ?? []) as SuccessStory[];

  return <main className="public-home min-h-screen overflow-hidden bg-[#020617] text-slate-50" dir="rtl">
    <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6">
      <Link href="/" className="flex items-center gap-3"><Image src="/logo.png" alt="تعلم التداول" width={56} height={56} className="misk-brand-mark h-14 w-14 object-contain" priority /><span className="text-lg font-black"> مسك للتطور المالي </span></Link>
      <Link href="/login" className={buttonClassName("default")}>دخول</Link>
    </nav>

    <section className="mx-auto max-w-7xl px-5 pb-14 pt-10 lg:pt-16"><div className="max-w-3xl">
      <p className="mb-5 inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-2 text-sm font-bold text-sky-200">وجهتك الاولى للاستثمار والتعليم المالي</p>
      <h1 className="max-w-3xl text-4xl font-black leading-tight text-white md:text-6xl">تعلم التداول بثقة من الأساسيات إلى قراءة السوق وإدارة المخاطر</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-400">اول منصه تعليميه سعوديه تساعدك على بناء فهم واضح للتداول خطوة بخطوة، مع دروس مرتبة حسب المستوى، اختبارات قصيرة، حصص مباشرة، ومساعد ذكي يجيب عن أسئلتك أثناء التعلم.</p>
      <div className="mt-8 flex flex-wrap gap-3"><a href="#learning" className={buttonClassName("default")}>تعرّف على طريقة التعلّم</a><a href="#plans" className={buttonClassName("secondary")}>ابدأ رحلتك</a></div>
    </div></section>

    <section className="mx-auto max-w-7xl px-5 pb-8"><MarketChart /></section>
    <section className="mx-auto max-w-7xl px-5 pb-10"><div className="warning-card"><ShieldCheck className="h-6 w-6 shrink-0" /><div><h2 className="text-lg font-black">تنبيه مهم</h2><p className="mt-2 text-sm leading-7">المحتوى تعليمي فقط وليس توصية مالية، الهدف هو بناء المعرفة والانضباط قبل اتخاذ أي قرار.</p></div></div></section>
    <section className="mx-auto grid max-w-7xl gap-4 px-5 py-10 md:grid-cols-3">{[["4", "مستويات تعليمية"], ["35+", "اختبارات وتطبيقات"], ["24/7", "وصول للمنصة"]].map(([value,label]) => <div key={label} className="stat-card"><strong>{value}</strong><span>{label}</span></div>)}</section>

    <section id="learning" className="section-band scroll-mt-24"><div className="mx-auto max-w-7xl px-5 py-16"><p className="section-kicker">نظرة تعليمية على السوق</p><h2 className="section-title">تعلّم قبل أن تخاطر</h2><p className="section-copy">المحتوى تعليمي فقط وليس توصية مالية. الهدف هو بناء المعرفة والانضباط قبل اتخاذ أي قرار.</p><div className="mt-8 grid gap-4 md:grid-cols-3">{learningFeatures.map(({title,description,icon:Icon}) => <article className="feature-card" key={title}><Icon className="h-7 w-7 text-sky-300" /><h3>{title}</h3><p>{description}</p></article>)}</div></div></section>
    <section className="mx-auto max-w-7xl px-5 py-16"><h2 className="section-title text-center">كيف تبدأ رحلتك التعليمية؟</h2><div className="steps-grid mt-10">{["أنشئ حسابك", "اختر مسارك", "شاهد الدروس", "حل الاختبار", "تابع تقدمك"].map((step,i)=><div key={step} className="step-item"><span>{i+1}</span><strong>{step}</strong></div>)}</div></section>

    <section id="plans" className="section-band scroll-mt-24"><div className="mx-auto max-w-7xl px-5 py-16"><div className="mb-6"><p className="text-sm font-bold text-sky-300">باقات الاشتراك</p><h2 className="mt-2 text-3xl font-black text-white">اختر الباقة المناسبة لك</h2></div><div className="grid gap-5 md:grid-cols-2">{subscriptionPackages.map((item)=><div key={item.title} className={`plan-card plan-card-${item.variant}`}><div className="flex items-start justify-between gap-4"><span className="plan-card-icon grid h-12 w-12 place-items-center rounded-2xl"><item.icon className="h-6 w-6" /></span><span className="plan-card-badge rounded-full px-3 py-1 text-xs font-bold">{item.badge}</span></div><h3 className="mt-6 text-2xl font-black">{item.title}</h3><p className="mt-3 max-w-xl text-sm leading-7">{item.description}</p><a href={item.href} target="_blank" rel="noreferrer" className={`${buttonClassName("default")} mt-6`}>اشترك الآن</a></div>)}</div><p className="store-note">الاشتراك والدفع يتمان عبر متجر مسك على سلة.</p></div></section>

    <section id="stories" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-16"><div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-sky-300">قصص حقيقية من طلابنا</p><h2 className="mt-2 text-3xl font-black text-white">قصص النجاح</h2></div><a href="#plans" className="text-sm font-bold text-sky-300 transition hover:text-sky-200">ابدأ رحلتك الآن</a></div><SuccessStoriesSection initialStories={publishedStories} /></section>
    <section className="mx-auto max-w-7xl px-5 pb-16"><div className="disclaimer-card"><p>نتائج فردية تخص أصحابها، وتختلف من شخص لآخر حسب ظروفه ورأس ماله ووقته. لا تمثل نتائج متوقعة ولا تضمن المنصة تحقيق أي أرباح.</p><Link href="/disclaimer">اقرأ إخلاء المسؤولية</Link></div></section>
    <section id="faq" className="section-band scroll-mt-24"><div className="mx-auto max-w-4xl px-5 py-16"><h2 className="section-title">أسئلة شائعة</h2><div className="mt-8 space-y-3">{faqs.map(({question,answer})=><details key={question} className="faq-item"><summary>{question}<span aria-hidden="true">＋</span></summary><p>{answer}</p></details>)}</div></div></section>
    <section className="mx-auto max-w-5xl px-5 py-16"><div className="final-cta"><h2>ابدأ من حيث يجب أن تبدأ: الفهم</h2><p>اختبر فهمك قبل أن تخاطر بريال واحد.</p><div className="mt-6 flex flex-col gap-3 sm:flex-row"><a href="#plans" className="final-cta-primary">ابدأ رحلتك</a><a href="#learning" className="final-cta-secondary">تعرّف على طريقة التعلّم</a></div></div></section>

    <footer className="public-footer"><div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-2 lg:grid-cols-4"><div><Image src="/logo.png" alt="MISK" width={74} height={74} className="h-16 w-16 object-contain" /><h3 className="mt-4 font-black">مسك للتطور المالي</h3><p className="mt-3 leading-7 text-slate-400">منصة تعليمية لبناء فهم منظم لأساسيات الأسواق المالية وقراءة السوق وإدارة المخاطر.</p></div><FooterColumn title="المنصة" links={[["الرئيسية","/"],["الباقات","/#plans"],["قصص النجاح","/#stories"],["الأسئلة الشائعة","/#faq"],["تسجيل الدخول","/login"]]} /><FooterColumn title="السياسات" links={[["الشروط والأحكام","/terms"],["سياسة الخصوصية","/privacy"],["سياسة الاسترجاع","/refund"],["إخلاء المسؤولية","/disclaimer"]]} /><div><h3 className="footer-title">تواصل معنا</h3><a href="https://t.me/MISKSupport" target="_blank" rel="noreferrer" className="mt-5 inline-block text-sky-300">دعم مسك على تيليجرام</a></div></div><div className="border-t border-slate-800 px-5 py-6 text-center text-sm text-slate-400">© 2026 مسك للتطور المالي. جميع الحقوق محفوظة.</div></footer>
  </main>;
}

function FooterColumn({title,links}:{title:string;links:string[][]}){return <div><h3 className="footer-title">{title}</h3><ul className="mt-5 space-y-3 text-slate-400">{links.map(([label,href])=><li key={href}><Link href={href} className="transition hover:text-sky-300">{label}</Link></li>)}</ul></div>}
