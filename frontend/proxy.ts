import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, LOCALES } from "@/lib/i18n";
import { PUBLIC_PATHS, SESSION_COOKIE, SIGNED_OUT_ONLY_PATHS } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (LOCALES.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))) return;

  // Signed-out visitors only see the sign-in and sign-up pages. This only checks that a session
  // cookie exists; Django checks the token itself on every request, so a stale cookie gets no data.
  // Django rejected the cookie's token (lib/api.ts sends us here): treat the visitor as signed out
  // and delete it, or /login and the dashboard would keep redirecting to each other.
  const expired = pathname === "/login" && request.nextUrl.searchParams.has("expired");
  const signedIn = request.cookies.has(SESSION_COOKIE) && !expired;
  if (!signedIn && !PUBLIC_PATHS.includes(pathname)) return NextResponse.redirect(new URL("/login", request.url));
  if (signedIn && SIGNED_OUT_ONLY_PATHS.includes(pathname)) return NextResponse.redirect(new URL("/", request.url));

  // Serve the page from app/[lang]/ in the saved language (Indonesian by default), so links and
  // URLs don't need a language prefix.
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const url = request.nextUrl.clone();
  url.pathname = `/${isLocale(saved) ? saved : DEFAULT_LOCALE}${pathname}`;
  const response = NextResponse.rewrite(url);
  if (expired) response.cookies.delete(SESSION_COOKIE);
  return response;
}

export const config = {
  // Skip Next.js internals and files with an extension (favicon.ico, images).
  matcher: ["/((?!_next/|.*\\..*).*)"],
};
