// The signed-in user's API token, kept in an httpOnly cookie: page scripts can't read it,
// only the Next.js server, which forwards it to Django.

import { cookies } from "next/headers";
import { LOCALE_COOKIE, type Locale } from "./i18n";

export const SESSION_COOKIE = "session";
/** Pages anyone can open; everything else needs a session (checked in proxy.ts). */
export const PUBLIC_PATHS = [
  "/login", "/register", "/forgot-password", "/reset-password", "/privacy", "/auth/google", "/auth/google/callback",
];
/** Ties Google's answer to the sign-in this browser started (app/[lang]/auth/google/). */
export const GOOGLE_STATE_COOKIE = "google_state";
/** Public pages a signed-in user has no use for; they go to the dashboard instead. */
export const SIGNED_OUT_ONLY_PATHS = ["/login", "/register"];

// Matches the backend's AUTH_TOKEN_TTL_DAYS; the backend is what actually enforces expiry.
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export async function getSessionToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Only callable from Server Actions (cookies can't be changed while rendering a page). */
export async function setSessionToken(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionToken() {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function setLocaleCookie(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}
