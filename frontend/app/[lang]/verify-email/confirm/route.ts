// The link in the verification email (backend accounts/verification.py) opens here. Works signed
// out too: people often open it on their phone.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { API_TIMEOUT_MS, apiHeaders, apiUrl } from "@/lib/api";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { SESSION_COOKIE } from "@/lib/session";

export async function GET(request: NextRequest) {
  const jar = await cookies();
  const saved = jar.get(LOCALE_COOKIE)?.value;
  let verified = false;
  try {
    const response = await fetch(`${apiUrl()}/auth/verify-email/`, {
      method: "POST",
      headers: { ...(await apiHeaders(undefined, isLocale(saved) ? saved : DEFAULT_LOCALE)), "Content-Type": "application/json" },
      body: JSON.stringify({ token: request.nextUrl.searchParams.get("token") ?? "" }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    verified = response.ok;
  } catch {
    // Django unreachable: shown like a bad link, and the page offers a new one.
  }
  if (jar.has(SESSION_COOKIE)) redirect(verified ? "/" : "/verify-email?invalid=1");
  redirect(verified ? "/login?verified=1" : "/login?verify=invalid");
}
