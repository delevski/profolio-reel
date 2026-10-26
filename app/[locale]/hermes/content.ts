import type { Locale } from "@/lib/i18n/config";

export const hermesContent: Record<
  Locale,
  {
    label: string;
    title: string;
    intro: string;
    body: string[];
    privacyLink: string;
    privacyLabel: string;
    privacyTitle: string;
    privacyBody: string[];
  }
> = {
  en: {
    label: "Hermes",
    title: "Hermes Agent",
    intro: "Hermes is a personal assistant used only by its owner.",
    body: [
      "It accesses Gmail, Calendar, Drive, Sheets, Docs and Contacts according to the owner's requests.",
      "Contact: orworkdelevski@gmail.com",
    ],
    privacyLink: "Privacy policy",
    privacyLabel: "Hermes Agent",
    privacyTitle: "Hermes Agent privacy policy",
    privacyBody: [
      "Hermes is a personal assistant used only by its owner. It accesses Gmail, Calendar, Drive, Sheets, Docs and Contacts according to the owner's requests.",
      "Content may be passed to the AI provider configured in the assistant in order to respond.",
      "Use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.",
      "Access can be revoked in the Google Account settings: https://myaccount.google.com/permissions",
      "Contact: orworkdelevski@gmail.com",
    ],
  },
  he: {
    label: "Hermes",
    title: "Hermes Agent",
    intro: "Hermes הוא עוזר אישי לשימוש בעליו בלבד.",
    body: [
      "הוא ניגש ל־Gmail, יומן, Drive, Sheets, Docs ואנשי קשר לפי בקשות הבעלים.",
      "ליצירת קשר: orworkdelevski@gmail.com",
    ],
    privacyLink: "מדיניות פרטיות",
    privacyLabel: "Hermes Agent",
    privacyTitle: "מדיניות הפרטיות של Hermes Agent",
    privacyBody: [
      "Hermes הוא עוזר אישי לשימוש בעליו בלבד. הוא ניגש ל־Gmail, יומן, Drive, Sheets, Docs ואנשי קשר לפי בקשות הבעלים.",
      "תוכן עשוי לעבור לספק ה־AI שהוגדר בעוזר לצורך מענה.",
      "השימוש והעברת המידע שמתקבל מ־Google APIs יהיו בהתאם ל־Google API Services User Data Policy, כולל דרישות Limited Use.",
      "ניתן לבטל גישה בהגדרות חשבון Google: https://myaccount.google.com/permissions",
      "ליצירת קשר: orworkdelevski@gmail.com",
    ],
  },
};
