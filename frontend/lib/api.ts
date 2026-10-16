// The Django API. Only called from the Next.js server (Server Components and
// Server Actions), so the browser never talks to Django and CORS isn't needed.
import { notFound } from "next/navigation";
import { lang } from "next/root-params";

export const API_URL = process.env.API_URL ?? "http://localhost:8001/api";

export async function apiGet<T>(path: string): Promise<T> {
  // Only called from Server Components, where the [lang] segment is readable.
  const response = await fetch(`${API_URL}${path}`, { headers: { "Accept-Language": await lang() } });
  if (response.status === 404) notFound(); // e.g. a deleted application: show the 404 page
  if (!response.ok) throw new Error(`GET ${path} failed with status ${response.status}`);
  return response.json();
}
