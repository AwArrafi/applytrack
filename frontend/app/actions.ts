"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { API_URL } from "@/lib/api";
import { DEFAULT_LOCALE, getI18n, isLocale, LOCALE_COOKIE } from "@/lib/i18n";

// Server Actions can't read the [lang] route segment, so they use the same cookie proxy.ts reads.
async function currentI18n() {
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  return getI18n(isLocale(saved) ? saved : DEFAULT_LOCALE);
}

export interface SaveState {
  ok: boolean;
  /** Error messages per field, as Django REST Framework returns them; "form" for general errors. */
  errors: Record<string, string[]>;
}

const APPLICATION_FIELDS = [
  "company_name", "job_title", "status", "application_date", "job_url", "work_arrangement", "location",
  "salary_min", "salary_max", "salary_currency", "job_description", "notes",
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

async function send(method: "POST" | "PATCH", path: string, payload: object): Promise<SaveState> {
  const { locale, t } = await currentI18n();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      // Accept-Language makes Django answer validation errors in the user's language.
      headers: { "Content-Type": "application/json", "Accept-Language": locale },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, errors: { form: [t.errors.backendDown] } };
  }

  // The API validates everything; a 400 carries the messages to show next to each field.
  if (response.status === 400) return { ok: false, errors: await response.json() };
  if (!response.ok) return { ok: false, errors: { form: [t.errors.saveFailed(response.status)] } };

  refresh(); // re-render the current page so the change shows up
  return { ok: true, errors: {} };
}

export async function createApplication(_previous: SaveState, formData: FormData) {
  return send("POST", "/applications/", toPayload(formData, APPLICATION_FIELDS));
}

export async function updateApplication(id: number, _previous: SaveState, formData: FormData) {
  return send("PATCH", `/applications/${id}/`, toPayload(formData, APPLICATION_FIELDS));
}

/** Creates an interview, or updates it when `id` is given. */
export async function saveInterview(id: number | null, _previous: SaveState, formData: FormData) {
  const payload = toPayload(formData, INTERVIEW_FIELDS);
  return id === null ? send("POST", "/interviews/", payload) : send("PATCH", `/interviews/${id}/`, payload);
}

export async function deleteInterview(id: number): Promise<SaveState> {
  const response = await fetch(`${API_URL}/interviews/${id}/`, { method: "DELETE" });
  // 404 means it's already gone, which is what the user wanted.
  if (!response.ok && response.status !== 404) {
    const { t } = await currentI18n();
    return { ok: false, errors: { form: [t.errors.deleteFailed(response.status)] } };
  }
  refresh();
  return { ok: true, errors: {} };
}

export async function deleteApplication(id: number) {
  const response = await fetch(`${API_URL}/applications/${id}/`, { method: "DELETE" });
  // 404 means it's already gone, which is what the user wanted.
  if (!response.ok && response.status !== 404) throw new Error(`Deleting failed (status ${response.status}).`);
  redirect("/applications");
}
