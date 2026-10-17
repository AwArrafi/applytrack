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
        <AccountDeletedNotice searchParams={searchParams} />
      </Suspense>
      <AuthForm mode="login" />
    </>
  );
}

/** After "delete my account" (app/actions.ts deleteAccount) the visitor lands here with ?deleted=1. */
async function AccountDeletedNotice({ searchParams }: { searchParams: PageProps<"/[lang]/login">["searchParams"] }) {
  const { deleted } = await searchParams;
  if (!deleted) return null;
  const { t } = await getServerI18n();
  return <p role="status" className="mb-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{t.deleteAccount.done}</p>;
}
