import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { logout } from "@/app/actions";
import { ResendVerificationForm } from "@/components/auth/ResendVerificationForm";
import { getCurrentUser } from "@/lib/api";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.verifyEmail.title };
}

/** Where a new account waits until the emailed link is opened; (app)/layout.tsx sends it here. */
export default function Page({ searchParams }: PageProps<"/[lang]/verify-email">) {
  return (
    <Suspense>
      <CheckYourEmail searchParams={searchParams} />
    </Suspense>
  );
}

async function CheckYourEmail({ searchParams }: { searchParams: PageProps<"/[lang]/verify-email">["searchParams"] }) {
  const user = await getCurrentUser();
  if (user.email_verified) redirect("/");
  const { invalid } = await searchParams; // a bad or expired link (verify-email/confirm/route.ts)
  const { t } = await getServerI18n();
  const v = t.verifyEmail;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{v.title}</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {v.sentBefore}
        <strong className="font-medium text-ink">{user.email}</strong>
        {v.sentAfter}
      </p>
      {invalid && <p role="alert" className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800">{v.invalid}</p>}
      <p className="mt-4 text-sm text-ink-muted">{v.spam}</p>
      <ResendVerificationForm />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4 text-sm">
        <Link href="/" className="font-medium text-primary-700 hover:underline">
          {v.done}
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="text-ink-muted hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            {v.otherEmail}
          </button>
        </form>
      </div>
    </>
  );
}
