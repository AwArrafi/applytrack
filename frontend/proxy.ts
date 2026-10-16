import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALES } from "@/lib/i18n";

// Serves every page from app/[lang]/ in the language saved in the cookie (Indonesian by
// default), so links and URLs don't need a language prefix.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LOCALES.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))) return;

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const url = request.nextUrl.clone();
  url.pathname = `/${isLocale(saved) ? saved : DEFAULT_LOCALE}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next.js internals and files with an extension (favicon.ico, images).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
