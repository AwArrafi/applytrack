// The Django API. Only called from the Next.js server (Server Components and
// Server Actions), so the browser never talks to Django and CORS isn't needed.
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
  return "http://localhost:8001/api";
}

/** A Django that hangs gets an error page or message after this long, not an endless spinner. */
export const API_TIMEOUT_MS = 10_000;

/** Headers every API call sends: the session token, and the language for Django's messages. */
export function apiHeaders(token: string | undefined, locale: string): HeadersInit {
  return { "Accept-Language": locale, ...(token ? { Authorization: `Token ${token}` } : {}) };
}

/** For Server Components, where the [lang] segment is readable. */
export async function apiGet<T>(path: string): Promise<T> {
  // Read the request's cookie first: during prerendering that's where Next.js stops, before any fetch.
  const headers = apiHeaders(await getSessionToken(), await lang());
  const response = await fetch(`${apiUrl()}${path}`, { headers, signal: AbortSignal.timeout(API_TIMEOUT_MS) });
  if (response.status === 401) redirect("/login"); // signed out or the session expired
  if (response.status === 404) notFound(); // e.g. a deleted application: show the 404 page
  if (!response.ok) throw new Error(`GET ${path} failed with status ${response.status}`);
  return response.json();
}

/** The signed-in user; cached so the layout and the page share one request. */
export const getCurrentUser = cache(() => apiGet<User>("/auth/me/"));
