import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { preferredFormat } from "@/lib/agent/readiness";
import { defaultLocale, isValidLocale } from "@/lib/i18n/config";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const format = preferredFormat(request.headers.get("accept"));
  if (format === "markdown") {
    const url = request.nextUrl.clone();
    url.pathname = "/api/markdown";
    url.search = "";
    url.searchParams.set("path", pathname);
    return NextResponse.rewrite(url, { headers: { Vary: "Accept" } });
  }
  if (format === "none") {
    return new NextResponse("Supported representations: text/html, text/markdown.\n", {
      status: 406, headers: { "Content-Type": "text/plain; charset=utf-8", Vary: "Accept" },
    });
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  if (isValidLocale(first)) {
    return NextResponse.next({ headers: { Vary: "Accept" } });
  }

  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value;
  const locale =
    cookieLocale && isValidLocale(cookieLocale) ? cookieLocale : defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
  return NextResponse.redirect(url, { headers: { Vary: "Accept" } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
