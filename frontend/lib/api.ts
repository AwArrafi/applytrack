// The Django API. Only called from the Next.js server (Server Components and
// Server Actions), so the browser never talks to Django and CORS isn't needed.
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { lang } from "next/root-params";
import { cache } from "react";
import { getSessionToken } from "./session";
import type { User } from "./types";

/**
 * The Django API's base URL. Read per call (not at import) so `next build` works without it.
 * Required in production; the local Django server is only a development default.
 */
export function apiUrl(): string {
  const url = process.env.API_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "production") {
    throw new Error("API_URL is not set. Point it at the Django API, e.g. https://api.applytrack.id/api");
  }
  // 127.0.0.1, not localhost: on Windows "localhost" tries IPv6 first and waits ~0.2s per call.
  return "http://127.0.0.1:8001/api";
}

/**
 * A Django that hangs gets an error page or message after this long, not an endless spinner.
 * shortcut: 60s covers Render Free waking from sleep (~50s, the first visit after 15 idle minutes;
 * a shorter limit showed that visitor an error page). Lower it once the backend is on an always-on plan.
 * Vercel's own limit on Hobby is 300s, so a request may wait this long.
 */
export const API_TIMEOUT_MS = 60_000;

/**
 * Headers every API call sends: the session token, the language for Django's messages, and the
 * visitor's IP so Django rate-limits each visitor, not this server (trusted only with the secret).
 */
export async function apiHeaders(token: string | undefined, locale: string): Promise<Record<string, string>> {
  const result: Record<string, string> = { "Accept-Language": locale };
  if (token) result.Authorization = `Token ${token}`;
  const secret = process.env.FRONTEND_PROXY_SECRET;
  const incoming = await headers();
  // Vercel and most hosts set these to the visitor's address.
  const clientIp = incoming.get("x-real-ip") ?? incoming.get("x-forwarded-for")?.split(",")[0].trim();
  if (secret && clientIp) Object.assign(result, { "X-Client-IP": clientIp, "X-Frontend-Secret": secret });
  return result;
}

/** For Server Components, where the [lang] segment is readable. */
export async function apiGet<T>(path: string): Promise<T> {
  // Read the request's cookie first: during prerendering that's where Next.js stops, before any fetch.
  const requestHeaders = await apiHeaders(await getSessionToken(), await lang());
  const response = await fetch(`${apiUrl()}${path}`, { headers: requestHeaders, signal: AbortSignal.timeout(API_TIMEOUT_MS) });
  // Signed out elsewhere or the session expired; proxy.ts drops the stale cookie on this URL.
  if (response.status === 401) redirect("/login?expired=1");
  if (response.status === 403) redirect("/verify-email"); // signed in, but the email isn't verified yet
  if (response.status === 404) notFound(); // e.g. a deleted application: show the 404 page
  if (!response.ok) throw new Error(`GET ${path} failed with status ${response.status}`);
  return response.json();
}

/** The signed-in user; cached so the layout and the page share one request. */
export const getCurrentUser = cache(() => apiGet<User>("/auth/me/"));
