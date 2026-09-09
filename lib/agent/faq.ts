import type { Locale } from "@/lib/i18n/config";

/**
 * Deterministic answers for the questions recruiters ask most.
 * Keeps the widget instant and fully useful with zero LLM calls -
 * important because the free OpenRouter tier is rate-limited.
 * The LLM handles everything that does not match here.
 */

export type AgentLink = { href: string; label: string };

type FaqEntry = {
  keywords: string[];
  answer: Record<Locale, string>;
  links?: Record<Locale, AgentLink[]>;
};

const FAQ: FaqEntry[] = [
  {
    keywords: ["who is", "מי הוא", "מי אתה", "who are you", "about or", "על אור", "tell me about", "ספר לי"],
    answer: {
      en: "Or Delevski is a CTO / VP R&D and technology leader with 15+ years in R&D, product innovation and scaling engineering teams. He currently serves as CTO / VP R&D at Constrol, where he built the tech organization from scratch and doubled revenue in a year. I'm his site's assistant - ask me anything about his experience, projects or skills.",
      he: "אור דליבסקי הוא CTO / סמנכ\"ל מו\"פ ומנהיג טכנולוגי עם 15+ שנות ניסיון במו\"פ, חדשנות מוצרית ובניית צוותי הנדסה. כיום הוא CTO / VP R&D ב-Constrol, שם בנה את ארגון הטכנולוגיה מאפס והכפיל את ההכנסות תוך שנה. אני העוזר של האתר שלו - שאלו אותי על הניסיון, הפרויקטים או הכישורים שלו.",
    },
    links: {
      en: [{ href: "/about", label: "Full bio" }],
      he: [{ href: "/about", label: "הביו המלא" }],
    },
  },
  {
    keywords: ["experience", "ניסיון", "work history", "career", "קריירה", "resume", "קורות חיים", "cv", "background", "רקע"],
    answer: {
      en: "Or has 15+ years of R&D leadership: CTO / VP R&D at Constrol (2023-present), Head of R&D at PayBox / Bank Discount (2019-2023, 20+ engineers across 3 teams, $3M+ saved annually), and Head of Mobile at SpotOption / Dx.Exchange (2014-2019, 10M+ downloads, 300+ white-label apps). His full CV is one click away.",
      he: "לאור 15+ שנות הובלת מו\"פ: CTO / VP R&D ב-Constrol (2023-היום), Head of R&D ב-PayBox / דיסקונט (2019-2023, 20+ מהנדסים ב-3 צוותים, חיסכון של $3M+ בשנה), ו-Head of Mobile ב-SpotOption / Dx.Exchange (2014-2019, 10M+ הורדות, 300+ אפליקציות white-label). קורות החיים המלאים במרחק קליק.",
    },
    links: {
      en: [
        { href: "/about", label: "Experience timeline" },
        { href: "/Or-Delevski-CV.pdf", label: "Download CV" },
      ],
      he: [
        { href: "/about", label: "ציר הניסיון" },
        { href: "/Or-Delevski-CV.pdf", label: "הורדת קורות חיים" },
      ],
    },
  },
  {
    keywords: ["current", "נוכחי", "constrol", "קונטרול", "now", "היום", "כיום", "עכשיו", "currently", "role", "תפקיד"],
    answer: {
      en: "Or is currently CTO / VP R&D at Constrol (2023-present). He built the company's technology organization from scratch - doubling revenue in one year - and leads 18+ professionals across BI, CRM and SaaS platforms with real-time tracking and AI-driven automation.",
      he: "אור הוא כיום CTO / VP R&D ב-Constrol (2023-היום). הוא בנה את ארגון הטכנולוגיה של החברה מאפס - והכפיל את ההכנסות תוך שנה - ומנהל 18+ אנשי מקצוע סביב פלטפורמות BI, CRM ו-SaaS עם מעקב בזמן אמת ואוטומציה מבוססת AI.",
    },
    links: {
      en: [{ href: "/about", label: "More about his role" }],
      he: [{ href: "/about", label: "עוד על התפקיד" }],
    },
  },
  {
    keywords: ["paybox", "פייבוקס", "פייבוק", "discount", "דיסקונט", "fintech", "פינטק", "payment", "תשלומ"],
    answer: {
      en: "At PayBox (Bank Discount, 2019-2023) Or led 20+ engineers across 3 teams building fintech solutions: he migrated a monolith to event-driven microservices, saved $3M+ annually through payment optimization, and shipped Tap-to-Pay, cashback and loyalty integrations on Node.js, C#, Kotlin and Swift over GCP/GKE.",
      he: "ב-PayBox (בנק דיסקונט, 2019-2023) אור הוביל 20+ מהנדסים ב-3 צוותים שבנו פתרונות פינטק: היגר מונולית למיקרו-שירותים אירוע-מונעים, חסך $3M+ בשנה באופטימיזציית תשלומים, והשיק Tap-to-Pay, קאשבק ואינטגרציות נאמנות על Node.js, C#, Kotlin ו-Swift מעל GCP/GKE.",
    },
    links: {
      en: [{ href: "/about", label: "Full experience" }],
      he: [{ href: "/about", label: "הניסיון המלא" }],
    },
  },
  {
    keywords: ["spotoption", "ספוט", "mobile", "מובייל", "ios", "android", "אנדרואיד", "apps store", "אפליקציות"],
    answer: {
      en: "As Head of Mobile at SpotOption / Dx.Exchange (2014-2019), Or led Android, iOS and QA teams scaling B2B fintech mobile platforms to 10M+ downloads and 300+ white-label apps, introducing CI/CD automation and mobile product strategy. He also ships his own apps - see the apps page.",
      he: "כ-Head of Mobile ב-SpotOption / Dx.Exchange (2014-2019), אור הוביל צוותי Android, iOS ו-QA שהרחיבו פלטפורמות מובייל פינטק B2B ל-10M+ הורדות ו-300+ אפליקציות white-label, עם אוטומציית CI/CD ואסטרטגיית מוצר מובייל. הוא גם משחרר אפליקציות משלו - ראו בעמוד האפליקציות.",
    },
    links: {
      en: [{ href: "/apps", label: "Or's apps" }],
      he: [{ href: "/apps", label: "האפליקציות של אור" }],
    },
  },
  {
    keywords: ["ai", "בינה", "מלאכותית", "agents", "סוכנ", "llm", "machine learning", "automation", "אוטומצ", "mcp", "rag"],
    answer: {
      en: "AI is Or's daily work: he builds AI agents, RAG systems and automation with n8n, Zapier and MCP, ships AI products (a recipe agent, an OCR extractor, image generation), and writes and teaches about agentic development. This chat you're using is one of his AI builds, by the way.",
      he: "AI זו העבודה היומיומית של אור: הוא בונה סוכני AI, מערכות RAG ואוטומציה עם n8n, Zapier ו-MCP, משיק מוצרי AI (סוכן מתכונים, מחלץ OCR, יצירת תמונות), וכותב ומלמד על פיתוח אג'נטי. דרך אגב, גם הצ'אט הזה הוא אחד מבנייני ה-AI שלו.",
    },
    links: {
      en: [
        { href: "/projects", label: "AI projects" },
        { href: "/blog", label: "His writing on agents" },
      ],
      he: [
        { href: "/projects", label: "פרויקטי AI" },
        { href: "/blog", label: "הכתיבה שלו על סוכנים" },
      ],
    },
  },
  {
    keywords: ["stack", "טכנולוג", "technologies", "skills", "כישור", "tech", "languages", "שפות תכנות", "frameworks"],
    answer: {
      en: "Or's stack spans Next.js, React, TypeScript, Node.js, C#, NestJS, Python, Kotlin and Swift, on GCP/GKE with microservices, event-driven systems and CI/CD - plus PostgreSQL, MongoDB, Redis and vector DBs for AI features. Fifteen years of picking the right tool per problem.",
      he: "הסטאק של אור כולל Next.js, React, TypeScript, Node.js, C#, NestJS, Python, Kotlin ו-Swift, על GCP/GKE עם מיקרו-שירותים, מערכות אירוע-מונעות ו-CI/CD - ובנוסף PostgreSQL, MongoDB, Redis ומסדי וקטורים לפיצ'רי AI. חמש עשרה שנה של בחירת הכלי הנכון לכל בעיה.",
    },
    links: {
      en: [{ href: "/about", label: "Skills & highlights" }],
      he: [{ href: "/about", label: "כישורים והישגים" }],
    },
  },
  {
    keywords: ["lead", "הובל", "manage", "ניהול", "team", "צוות", "manager", "מנהל", "leadership", "people"],
    answer: {
      en: "Or has led engineering organizations for over a decade: 18+ professionals at Constrol today, 20+ engineers in 3 teams at PayBox, and Android/iOS/QA teams at SpotOption. His style: align technology strategy with business goals and grow high-performance teams that ship.",
      he: "אור מוביל ארגוני הנדסה יותר מעשור: 18+ אנשי מקצוע ב-Constrol כיום, 20+ מהנדסים ב-3 צוותים ב-PayBox, וצוותי Android/iOS/QA ב-SpotOption. הסגנון שלו: יישור אסטרטגיית טכנולוגיה עם מטרות עסקיות וגידול צוותים בעלי ביצועים גבוהים שמספקים.",
    },
    links: {
      en: [{ href: "/about", label: "Leadership record" }],
      he: [{ href: "/about", label: "רזומת ההובלה" }],
    },
  },
  {
    keywords: ["project", "פרויקט", "portfolio", "פורטפוליו", "built", "בנה", "github", "גיטהאב", "code", "קוד"],
    answer: {
      en: "Or's GitHub holds 40+ repositories - from this bilingual portfolio and its cinematic reel, to an AI recipe agent, a short-drama streaming app, a provident-fund dashboard, OCR and image-generation tools, and RAG experiments. The projects page has the curated gallery with stack and live links.",
      he: "ה-GitHub של אור מחזיק 40+ רפוזיטורים - מהפורטפוליו הדו-לשוני הזה והריל הקולנועי שלו, דרך סוכן מתכוני AI, אפליקציית סטרימינג לדרמות קצרות, דשבורד גמל, כלי OCR ויצירת תמונות, ועד ניסויי RAG. בעמוד הפרויקטים מחכה הגלריה המאורגנת עם טכנולוגיות וקישורים חיים.",
    },
    links: {
      en: [{ href: "/projects", label: "Project gallery" }],
      he: [{ href: "/projects", label: "גלריית הפרויקטים" }],
    },
  },
  {
    keywords: ["contact", "קשר", "צור קשר", "email", "מייל", "אימייל", "phone", "טלפון", "hire", "גיוס", "interview", "ראיון", "reach", "דבר איתו", "לדבר"],
    answer: {
      en: "The fastest way to reach Or is the contact page - or directly at ordi1985@gmail.com and +972-54-7917154. He's based in Ramat-Gan, Israel, and always happy to talk about technology leadership roles.",
      he: "הדרך המהירה לתפוס את אור היא עמוד יצירת הקשר - או ישירות ב-ordi1985@gmail.com וב-+972-54-7917154. הוא מבוסס ברמת-גן ותמיד שמח לשוחח על תפקידי הובלה טכנולוגית.",
    },
    links: {
      en: [{ href: "/contact", label: "Contact Or" }],
      he: [{ href: "/contact", label: "יצירת קשר עם אור" }],
    },
  },
  {
    keywords: ["where", "איפה", "location", "מיקום", "live", "גר", "based", "מתגורר", "israel", "ישראל"],
    answer: {
      en: "Or is based in Ramat-Gan, Israel. Full details and ways to reach him are on the contact page.",
      he: "אור מתגורר ברמת-גן, ישראל. כל הפרטים ודרכי ההתקשרות נמצאים בעמוד יצירת הקשר.",
    },
    links: {
      en: [{ href: "/contact", label: "Contact details" }],
      he: [{ href: "/contact", label: "פרטי קשר" }],
    },
  },
  {
    keywords: ["course", "קורס", "teach", "מלמד", "academy", "אקדמי", "learn", "ללמוד", "lecture", "הרצא"],
    answer: {
      en: "Or teaches at his own Academy - courses like 'Vibe Coding with AI Agents', 'Intro to IDEs' and 'Intro to Web Development' - and publishes hands-on AI guides on the Learn page.",
      he: "אור מלמד באקדמיה שלו - קורסים כמו 'Vibe Coding עם סוכני AI', 'מבוא לסביבות פיתוח' ו'מבוא לפיתוח ווב' - ומפרסם מדריכי AI מעשיים בעמוד Learn.",
    },
    links: {
      en: [
        { href: "/academy", label: "Academy" },
        { href: "/learn", label: "Guides" },
      ],
      he: [
        { href: "/academy", label: "האקדמיה" },
        { href: "/learn", label: "מדריכים" },
      ],
    },
  },
  {
    keywords: ["blog", "בלוג", "write", "כותב", "writing", "כתיבה", "article", "מאמר"],
    answer: {
      en: "Or writes about autonomous agents in IDEs, self-correcting models and SWE agents - practical takes from someone who builds with these tools daily. The blog has the latest.",
      he: "אור כותב על סוכנים אוטונומיים ב-IDE, מודלים מתקנים עצמית ו-SWE agents - זוויות פרקטיות ממי שבונה עם הכלים האלה יום-יום. הבלוג מחזיק את העדכניים.",
    },
    links: {
      en: [{ href: "/blog", label: "Read the blog" }],
      he: [{ href: "/blog", label: "לקרוא את הבלוג" }],
    },
  },
  {
    keywords: ["reel", "ריל", "video", "סרטון", "showreel", "cinematic", "קולנוע"],
    answer: {
      en: "The reel is a cinematic, scroll-driven tour of Or's work - music, captions and sequenced frames. Worth the ride. He also has video sessions on building with Copilot agents and AWS.",
      he: "הריל הוא סיור קולנועי מונע-גלילה בעבודות של אור - מוזיקה, כתוביות ופריימים מתוזמנים. שווה את הנסיעה. יש גם סשנים מצולמים על בנייה עם Copilot agents ו-AWS.",
    },
    links: {
      en: [{ href: "/reel", label: "Watch the reel" }],
      he: [{ href: "/reel", label: "לצפות בריל" }],
    },
  },
  {
    keywords: ["why hire", "למה להעסיק", "למה אור", "fit", "התאמה", "why him", "strengths", "חוזק", "יתרונות", "value", "ערך"],
    answer: {
      en: "Three things make Or stand out: he's scaled real organizations (20+ engineers, $3M+ annual savings, 10M+ downloads), he ships modern AI products hands-on - not slideware - and he connects technology strategy directly to revenue. A builder who leads, and a leader who still builds.",
      he: "שלושה דברים מבדלים את אור: הוא הרחיב ארגונים אמיתיים (20+ מהנדסים, חיסכון של $3M+ בשנה, 10M+ הורדות), הוא בונה מוצרי AI מודרניים בידיים - לא במצגות - והוא מחבר אסטרטגיית טכנולוגיה ישירות להכנסות. בונה שמוביל, ומוביל שעדיין בונה.",
    },
    links: {
      en: [
        { href: "/about", label: "The full picture" },
        { href: "/contact", label: "Talk to him" },
      ],
      he: [
        { href: "/about", label: "התמונה המלאה" },
        { href: "/contact", label: "לדבר איתו" },
      ],
    },
  },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[?!.,;:()"'\u201C\u201D\u2018\u2019]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchFaq(
  question: string,
  locale: Locale
): { answer: string; links: AgentLink[] } | null {
  const q = ` ${normalize(question)} `;
  let best: { entry: FaqEntry; score: number } | null = null;

  for (const entry of FAQ) {
    let score = 0;
    for (const kw of entry.keywords) {
      if (q.includes(` ${normalize(kw)} `) || q.includes(normalize(kw))) {
        score += kw.length;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { entry, score };
    }
  }

  if (!best) return null;
  return {
    answer: best.entry.answer[locale],
    links: best.entry.links?.[locale] ?? [],
  };
}
