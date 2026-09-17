"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ArrowUpLeft, ArrowUpRight, Bot, Braces, Cpu, Gauge, Layers3, Sparkles } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";

const work = [
  { name: "Lyra", he: "מנוע שמסביר את המשמעות והסיפור מאחורי כל שיר", en: "An engine that explains the meaning and story behind any song", image: "/projects/profolio-reel.png", fallback: "/projects/profolio-reel.png", href: "https://lyra-rho-orpin.vercel.app" },
  { name: "AgentLens", he: "מיפוי מערכות וזיהוי הזדמנויות לסוכני AI", en: "System mapping and AI-agent opportunity discovery", image: "/projects/chefli.png", fallback: "/projects/profolio-reel.png", href: "https://agent-lens-neon.vercel.app" },
  { name: "ORA", he: "חוויית נדל״ן דו־לשונית עם גלילה קולנועית", en: "A bilingual real-estate experience with cinematic scrolling", image: "/projects/ora-website.png", fallback: "/projects/ora-website.png", href: "https://ora-website-eight.vercel.app/en" },
];

const copy = {
  he: {
    eyebrow: "מערכות דיגיטליות שחושבות קדימה",
    titleA: "לא עוד אתר.", titleB: "מנוע צמיחה דיגיטלי.",
    intro: "ORDEL מחברת אסטרטגיה, מוצר, אוטומציה ו-AI כדי להפוך רעיון למערכת אמיתית שעובדת, נראית מצוין ומייצרת ערך.",
    cta: "בואו נבנה משהו", work: "לצפייה בעבודות",
    ticker: ["מוצרי AI", "אוטומציות", "אתרי פרימיום", "אפליקציות", "מערכות SaaS"],
    what: "מה אנחנו בונים", whatText: "מהגדרה חדה של הבעיה ועד מוצר חי בפרודקשן. בלי מצגות ריקות ובלי שכבות מיותרות.",
    services: [
      ["מוצרי AI וסוכנים", "סוכנים חכמים, חיפוש, ניתוח ותהליכים שמבוססים על מידע אמיתי."],
      ["אוטומציות עסקיות", "חיבור מערכות, ביטול עבודה ידנית וזרימות שאפשר למדוד ולשפר."],
      ["Web & Mobile", "אתרים ואפליקציות מהירים, נגישים ודו־לשוניים, עם חוויית שימוש מדויקת."],
      ["ארכיטקטורה וטכנולוגיה", "בחירת stack, בנייה לפרודקשן ותשתית שמוכנה לצמוח."],
    ],
    selected: "עבודות נבחרות", selectedText: "מוצרים אמיתיים. כל פרויקט מתחיל בצורך ברור ונגמר בחוויה שאפשר לפתוח, לבדוק ולהשתמש בה.",
    process: "איך זה מתקדם", steps: [["01", "מחדדים", "מגדירים למי בונים, מה חייב לעבוד ואיך מודדים הצלחה."], ["02", "מתכננים", "ממפים את החוויה, הטכנולוגיה והדאטה לפני שכותבים קוד."], ["03", "בונים", "מפתחים בסבבים קצרים עם מוצר חי שאפשר לראות ולהרגיש."], ["04", "משיקים", "בודקים, מעלים לפרודקשן ומשפרים לפי שימוש אמיתי."]],
    closer: "יש לכם רעיון שצריך להפוך למוצר?", closerText: "בואו נדבר על מה אפשר לבנות, מה באמת נחוץ ואיך מגיעים לגרסה חיה מהר.", contact: "מתחילים בשיחה",
  },
  en: {
    eyebrow: "Digital systems built to move forward",
    titleA: "Not another website.", titleB: "A digital growth engine.",
    intro: "ORDEL brings strategy, product, automation and AI together to turn an idea into a real system that works, looks sharp and creates value.",
    cta: "Let's build something", work: "Explore the work",
    ticker: ["AI products", "Automation", "Premium websites", "Mobile apps", "SaaS systems"],
    what: "What we build", whatText: "From a sharply defined problem to a live product in production. No empty decks and no unnecessary layers.",
    services: [
      ["AI products & agents", "Smart agents, search, analysis and workflows grounded in real information."],
      ["Business automation", "Connected systems, less manual work and flows you can measure and improve."],
      ["Web & mobile", "Fast, accessible, bilingual sites and apps with a precise user experience."],
      ["Architecture & technology", "Stack decisions, production delivery and foundations built to grow."],
    ],
    selected: "Selected work", selectedText: "Real products. Every project starts with a clear need and ends with an experience you can open, test and use.",
    process: "How we work", steps: [["01", "Define", "Set the audience, the job to be done and the measure of success."], ["02", "Design", "Map the experience, technology and data before writing code."], ["03", "Build", "Develop in short loops around a live product you can see and feel."], ["04", "Launch", "Test, ship to production and improve from real usage."]],
    closer: "Have an idea that needs to become a product?", closerText: "Let's talk about what can be built, what is truly needed and the fastest route to a live version.", contact: "Start a conversation",
  },
};

const reveal = { initial: { opacity: 0, y: 42 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-80px" }, transition: { duration: .7, ease: [0.22, 1, 0.36, 1] as const } };

export function AgencyHome({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const rtl = locale === "he";
  const Arrow = rtl ? ArrowUpLeft : ArrowUpRight;
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, .25], [0, reduce ? 0 : 120]);

  return <main className="agency-page" dir={rtl ? "rtl" : "ltr"}>
    <section className="agency-hero">
      <div className="agency-orb agency-orb-a" aria-hidden="true"/><div className="agency-orb agency-orb-b" aria-hidden="true"/>
      <motion.div style={{ y: heroY }} className="agency-hero-inner">
        <motion.p initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{duration:.6}} className="agency-kicker"><Sparkles size={16}/>{t.eyebrow}</motion.p>
        <motion.h1 initial={{opacity:0,y:35}} animate={{opacity:1,y:0}} transition={{duration:.8,delay:.08}}>{t.titleA}<br/><span>{t.titleB}</span></motion.h1>
        <motion.p initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:.7,delay:.18}} className="agency-lead">{t.intro}</motion.p>
        <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.6,delay:.28}} className="agency-actions">
          <Link className="agency-button agency-button-primary" href={`/${locale}/contact`}>{t.cta}<Arrow size={18}/></Link>
          <a className="agency-button agency-button-ghost" href="#work">{t.work}</a>
        </motion.div>
      </motion.div>
      <div className="agency-grid" aria-hidden="true"/>
    </section>

    <div className="agency-ticker" aria-label={t.ticker.join(", ")}><div>{[...t.ticker,...t.ticker].map((x,i)=><span key={i}>{x}<i>✦</i></span>)}</div></div>

    <section className="agency-section agency-services">
      <motion.div {...reveal} className="agency-section-head"><p>01</p><div><h2>{t.what}</h2><p>{t.whatText}</p></div></motion.div>
      <div className="agency-service-grid">
        {t.services.map(([title,text],i)=>{const icons=[Bot,Gauge,Layers3,Cpu]; const Icon=icons[i]; return <motion.article {...reveal} transition={{...reveal.transition,delay:i*.07}} key={title}><div className="agency-icon"><Icon/></div><span>0{i+1}</span><h3>{title}</h3><p>{text}</p></motion.article>})}
      </div>
    </section>

    <section className="agency-section agency-work" id="work">
      <motion.div {...reveal} className="agency-section-head"><p>02</p><div><h2>{t.selected}</h2><p>{t.selectedText}</p></div></motion.div>
      <div className="agency-work-list">
        {work.map((item,i)=><motion.a {...reveal} key={item.name} href={item.href} target="_blank" rel="noreferrer" className="agency-project">
          <div className="agency-project-index">0{i+1}</div><div className="agency-project-copy"><h3>{item.name}</h3><p>{rtl?item.he:item.en}</p></div>
          <div className="agency-project-image"><Image src={item.image} alt="" fill sizes="(max-width: 768px) 100vw, 45vw" onError={(e)=>{(e.currentTarget as HTMLImageElement).src=item.fallback}}/></div><Arrow className="agency-project-arrow"/>
        </motion.a>)}
      </div>
    </section>

    <section className="agency-section agency-process">
      <motion.div {...reveal} className="agency-section-head"><p>03</p><div><h2>{t.process}</h2></div></motion.div>
      <div className="agency-steps">{t.steps.map(([n,title,text],i)=><motion.article {...reveal} transition={{...reveal.transition,delay:i*.08}} key={n}><span>{n}</span><Braces/><h3>{title}</h3><p>{text}</p></motion.article>)}</div>
    </section>

    <section className="agency-close"><motion.div {...reveal}><p>ORDEL / BUILD WHAT MATTERS</p><h2>{t.closer}</h2><span>{t.closerText}</span><Link className="agency-button agency-button-light" href={`/${locale}/contact`}>{t.contact}<Arrow/></Link></motion.div></section>
  </main>;
}
