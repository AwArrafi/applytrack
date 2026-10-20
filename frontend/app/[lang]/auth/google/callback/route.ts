// "Sign in with Google", step 2: Google sends the visitor back here with a one-time code. Django
// trades it for their verified email (backend accounts/google.py) and answers like a sign-in.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { API_TIMEOUT_MS, apiHeaders, apiUrl } from "@/lib/api";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { GOOGLE_STATE_COOKIE, setLocaleCookie, setSessionToken } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const jar = await cookies();
  const expectedState = jar.get(GOOGLE_STATE_COOKIE)?.value;
  jar.delete(GOOGLE_STATE_COOKIE); // one use
  const code = searchParams.get("code");
  if (!code) redirect("/login"); // the visitor pressed Cancel at Google
  if (!expectedState || searchParams.get("state") !== expectedState) redirect("/login?google=failed");

  const saved = jar.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : DEFAULT_LOCALE;
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}/auth/google/`, {
      method: "POST",
      headers: { ...(await apiHeaders(undefined, locale)), "Content-Type": "application/json" },
      // The same redirect_uri as step 1: Google checks they match.
      body: JSON.stringify({ code, redirect_uri: new URL("/auth/google/callback", origin).href, language: locale }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
  } catch {
    redirect("/login?google=failed"); // Django unreachable
  }
  if (!response.ok) redirect("/login?google=failed");
  const { token, user } = await response.json();
  await setSessionToken(token);
  await setLocaleCookie(user.language); // the account's language, as after a normal sign-in
  redirect("/");
}
