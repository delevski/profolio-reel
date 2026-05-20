import { NextResponse } from "next/server";
import { getMockTrends } from "@/lib/content";

export async function GET() {
  const start = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 800));
  const trends = getMockTrends();
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
