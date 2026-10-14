// The Django API. Only called from the Next.js server (Server Components and
// Server Actions), so the browser never talks to Django and CORS isn't needed.
export const API_URL = process.env.API_URL ?? "http://localhost:8001/api";

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) throw new Error(`GET ${path} failed with status ${response.status}`);
  return response.json();
}
