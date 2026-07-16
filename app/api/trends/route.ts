import { NextResponse } from "next/server";
import { getLiveTrends } from "@/lib/content";
import { defaultLocale, isValidLocale, type Locale } from "@/lib/i18n/config";

export const revalidate = 300;

function parseLocale(value: string | null): Locale {
  if (value && isValidLocale(value)) return value;
  return defaultLocale;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = parseLocale(searchParams.get("locale"));
  const start = Date.now();
  const trends = await getLiveTrends(locale);
  const durationMs = Date.now() - start;

  console.info(
    JSON.stringify({
      route: "/api/trends",
      count: trends.length,
      durationMs,
    })
  );

  return NextResponse.json(trends);
}
