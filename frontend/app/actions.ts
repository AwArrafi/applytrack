"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_TIMEOUT_MS, apiHeaders, apiUrl } from "@/lib/api";
import { DEFAULT_LOCALE, getI18n, isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import { clearSessionToken, getSessionToken, setSessionToken } from "@/lib/session";
import type { Application } from "@/lib/types";

// Server Actions can't read the [lang] route segment, so they use the same cookie proxy.ts reads.
async function currentI18n() {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  return getI18n(isLocale(saved) ? saved : DEFAULT_LOCALE);
}

async function setLocaleCookie(locale: Locale) {
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
}

export interface SaveState {
  ok: boolean;
  /** Error messages per field, as Django REST Framework returns them; "form" for general errors. */
  errors: Record<string, string[]>;
}

const APPLICATION_FIELDS = [
  "company_name", "job_title", "status", "application_date", "job_url", "work_arrangement", "location",
  "salary_min", "salary_max", "salary_currency", "job_description", "notes", "source",
];
const INTERVIEW_FIELDS = [
  "application", "interview_type", "scheduled_at", "duration_minutes", "interviewer", "meeting_url", "location",
  "preparation_notes", "outcome", "self_score", "debrief_notes",
];
// An empty input means "no value"; the API wants null there, not "".
const NULLABLE = new Set(["application_date", "salary_min", "salary_max", "self_score"]);

/** Only the fields the form actually has, so a form with fewer fields doesn't clear the others. */
function toPayload(formData: FormData, fields: string[]) {
  return Object.fromEntries(
    fields.filter((field) => formData.has(field)).map((field) => {
      const value = String(formData.get(field)).trim();
      return [field, value === "" && NULLABLE.has(field) ? null : value];
    }),
  );
}

const SESSIONLESS_PATHS = [
  "/auth/login/", "/auth/register/", "/auth/logout/", "/auth/password-reset/", "/auth/password-reset/confirm/",
];

/**
 * Every write to Django goes through here: adds the session token and language, and sends an
 * expired session to the sign-in page. Returns null when the backend can't be reached.
 */
async function callApi(method: "POST" | "PATCH" | "DELETE", path: string, payload?: object) {
  const { locale } = await currentI18n();
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}${path}`, {
      method,
      headers: { ...(await apiHeaders(await getSessionToken(), locale)), "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
      signal: AbortSignal.timeout(API_TIMEOUT_MS), // a timeout counts as unreachable
    });
  } catch {
    return null;
  }
  // Elsewhere a 401 means the session is gone; these endpoints don't use a session at all.
  if (response.status === 401 && !SESSIONLESS_PATHS.includes(path)) {
    await clearSessionToken();
    redirect("/login");
  }
  return response;
}

/** Turns an API response into form state: field errors on 400, a general message otherwise. */
async function toSaveState(response: Response | null, failed: (status: number) => string): Promise<SaveState> {
  const { t } = await currentI18n();
  if (response === null) return { ok: false, errors: { form: [t.errors.backendDown] } };
  if (response.status === 429) return { ok: false, errors: { form: [t.errors.tooManyAttempts] } };
  // The API validates everything; a 400 carries the messages to show next to each field.
  if (response.status === 400) return { ok: false, errors: await response.json() };
  if (!response.ok) return { ok: false, errors: { form: [failed(response.status)] } };
  return { ok: true, errors: {} };
}

async function save(method: "POST" | "PATCH", path: string, payload: object): Promise<SaveState> {
  const { t } = await currentI18n();
  const state = await toSaveState(await callApi(method, path, payload), t.errors.saveFailed);
  if (state.ok) refresh(); // re-render the current page so the change shows up
  return state;
}

export async function createApplication(_previous: SaveState, formData: FormData) {
  return save("POST", "/applications/", toPayload(formData, APPLICATION_FIELDS));
}

export async function updateApplication(id: number, _previous: SaveState, formData: FormData) {
  return save("PATCH", `/applications/${id}/`, toPayload(formData, APPLICATION_FIELDS));
}

/** Creates an interview, or updates it when `id` is given. */
export async function saveInterview(id: number | null, _previous: SaveState, formData: FormData) {
  const payload = toPayload(formData, INTERVIEW_FIELDS);
  return id === null ? save("POST", "/interviews/", payload) : save("PATCH", `/interviews/${id}/`, payload);
}

export async function deleteInterview(id: number): Promise<SaveState> {
  const { t } = await currentI18n();
  const response = await callApi("DELETE", `/interviews/${id}/`);
  // 404 means it's already gone, which is what the user wanted.
  if (response?.status === 404) return { ok: true, errors: {} };
  const state = await toSaveState(response, t.errors.deleteFailed);
  if (state.ok) refresh();
  return state;
}

export async function deleteApplication(id: number) {
  const response = await callApi("DELETE", `/applications/${id}/`);
  // 404 means it's already gone, which is what the user wanted.
  if (response === null || (!response.ok && response.status !== 404)) {
    throw new Error(`Deleting failed (status ${response?.status ?? "unreachable"}).`);
  }
  redirect("/applications");
}

/** Sign in or sign up: on success the token goes into the httpOnly cookie and the user lands on the dashboard. */
async function startSession(path: string, payload: object): Promise<SaveState> {
  const { t } = await currentI18n();
  const response = await callApi("POST", path, payload);
  const state = await toSaveState(response, t.errors.saveFailed);
  if (!state.ok || response === null) return state;
  const { token, user } = await response.json();
  await setSessionToken(token);
  await setLocaleCookie(user.language); // the account's language follows the user to any device
  redirect("/");
}

export async function login(_previous: SaveState, formData: FormData) {
  return startSession("/auth/login/", { email: formData.get("email"), password: formData.get("password") });
}

export async function register(_previous: SaveState, formData: FormData) {
  const { locale } = await currentI18n();
  return startSession("/auth/register/", {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    language: locale, // the language the visitor signed up in
  });
}

export async function updateSettings(_previous: SaveState, formData: FormData) {
  const { t } = await currentI18n();
  const language = String(formData.get("language"));
  const response = await callApi("PATCH", "/auth/me/", {
    name: String(formData.get("name") ?? "").trim(),
    weekly_goal: formData.get("weekly_goal"),
    time_zone: formData.get("time_zone"),
    language,
  });
  const state = await toSaveState(response, t.errors.saveFailed);
  if (state.ok) {
    if (isLocale(language)) await setLocaleCookie(language);
    refresh();
  }
  return state;
}

/** The ID / EN switch: saved in the cookie, and on the account when signed in. */
export async function setLanguage(locale: string) {
  if (!isLocale(locale)) return;
  await setLocaleCookie(locale);
  if (await getSessionToken()) await callApi("PATCH", "/auth/me/", { language: locale });
}

export async function logout() {
  if (await getSessionToken()) await callApi("POST", "/auth/logout/");
  await clearSessionToken();
  redirect("/login");
}

export interface ImportState extends SaveState {
  result?: "created" | "updated" | "unchanged";
  application?: Application;
}

/** Records or updates an application from a pasted job portal email (see backend email_import.py). */
export async function importEmail(_previous: ImportState, formData: FormData): Promise<ImportState> {
  const { t } = await currentI18n();
  const response = await callApi("POST", "/applications/import-email/", { text: formData.get("text") });
  const state = await toSaveState(response, t.errors.saveFailed);
  if (!state.ok || !response) return state;
  refresh(); // the list and counts change
  return { ...state, ...(await response.json()) };
}

/** Asks Django to email a reset link. Same answer whether or not the email has an account. */
export async function requestPasswordReset(_previous: SaveState, formData: FormData) {
  const { t } = await currentI18n();
  return toSaveState(await callApi("POST", "/auth/password-reset/", { email: formData.get("email") }), t.errors.saveFailed);
}

/** Sets a new password from the emailed link (uid and token come in hidden fields). */
export async function resetPassword(_previous: SaveState, formData: FormData) {
  const { t } = await currentI18n();
  const payload = { uid: formData.get("uid"), token: formData.get("token"), password: formData.get("password") };
  return toSaveState(await callApi("POST", "/auth/password-reset/confirm/", payload), t.errors.saveFailed);
}

export async function changePassword(_previous: SaveState, formData: FormData) {
  const { t } = await currentI18n();
  const response = await callApi("POST", "/auth/password-change/", {
    current_password: formData.get("current_password"),
    new_password: formData.get("new_password"),
  });
  const state = await toSaveState(response, t.errors.saveFailed);
  // Django signed out every device and issued a new token for this one.
  if (state.ok && response) await setSessionToken((await response.json()).token);
  return state;
}
