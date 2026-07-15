import { NextResponse } from "next/server";
import { getLiveTrends } from "@/lib/content";

export const revalidate = 300;

export async function GET() {
  const start = Date.now();
  const trends = await getLiveTrends();
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
