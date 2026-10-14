"use server";

import { refresh } from "next/cache";
import { API_URL } from "@/lib/api";

export interface SaveState {
  ok: boolean;
  /** Error messages per field, as Django REST Framework returns them; "form" for general errors. */
  errors: Record<string, string[]>;
}

const FIELDS = ["company_name", "job_title", "status", "job_url", "work_arrangement", "notes"];

export async function createApplication(_previous: SaveState, formData: FormData): Promise<SaveState> {
  const body = Object.fromEntries(FIELDS.map((field) => [field, formData.get(field) ?? ""]));

  let response: Response;
  try {
    response = await fetch(`${API_URL}/applications/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, errors: { form: ["Can't reach the backend. Is Django running?"] } };
  }

  // The API validates everything; a 400 carries the messages to show next to each field.
  if (response.status === 400) return { ok: false, errors: await response.json() };
  if (!response.ok) return { ok: false, errors: { form: [`Saving failed (status ${response.status}).`] } };

  refresh(); // re-render the current page so the new application shows up
  return { ok: true, errors: {} };
}
