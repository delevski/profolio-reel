import type { Locale } from "./config";
import en from "@/messages/en.json";
import he from "@/messages/he.json";

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, he };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries.en;
}
