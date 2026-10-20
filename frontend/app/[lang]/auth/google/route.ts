// "Sign in with Google", step 1: send the visitor to Google's account picker. Google sends them
// back to ./callback with a one-time code (OAuth 2.0 authorization code flow).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { GOOGLE_STATE_COOKIE } from "@/lib/session";

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) redirect("/login");
  // A random value only this browser knows, checked on the way back, so nobody can slip
  // their own Google code into someone else's browser (login CSRF).
  const state = crypto.randomUUID();
  (await cookies()).set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax", // sent when Google redirects back: a top-level GET
    path: "/",
    maxAge: 10 * 60,
  });
  const params = new URLSearchParams({
    client_id: clientId,
    // Must be listed under "Authorized redirect URIs" in Google Cloud Console.
    redirect_uri: new URL("/auth/google/callback", request.nextUrl.origin).href,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account", // let people with several Google accounts pick one
  });
  redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
