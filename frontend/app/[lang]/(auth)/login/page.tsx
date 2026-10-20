import { Suspense } from "react";
import { AuthForm } from "@/components/auth/AuthForm";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.auth.loginTitle };
}

export default function Page({ searchParams }: PageProps<"/[lang]/login">) {
  return (
    <>
      <Suspense>
        <LoginNotice searchParams={searchParams} />
      </Suspense>
      <AuthForm mode="login" google={Boolean(process.env.GOOGLE_CLIENT_ID)} />
    </>
  );
}

/**
 * ?deleted=1: after "delete my account" (app/actions.ts deleteAccount).
 * ?google=failed: Google sign-in didn't work (app/[lang]/auth/google/callback/route.ts).
 * ?verified=1, ?verify=invalid: the verification link opened signed out (app/[lang]/verify-email/confirm/route.ts).
 */
async function LoginNotice({ searchParams }: { searchParams: PageProps<"/[lang]/login">["searchParams"] }) {
  const { deleted, google, verified, verify } = await searchParams;
  const { t } = await getServerI18n();
  const problem = google ? t.auth.googleFailed : verify ? t.verifyEmail.invalidSignedOut : null;
  if (problem) return <p role="alert" className="mb-6 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{problem}</p>;
  const done = deleted ? t.deleteAccount.done : verified ? t.verifyEmail.verified : null;
  if (!done) return null;
  return <p role="status" className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{done}</p>;
}
