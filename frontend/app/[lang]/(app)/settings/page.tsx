import Link from "next/link";
import { Suspense } from "react";
import { ChangePasswordForm, SetPasswordByEmailCard } from "@/components/auth/PasswordForms";
import { EmailForwardingCard } from "@/components/settings/EmailForwardingCard";
import { DeleteAccountForm } from "@/components/settings/DeleteAccountForm";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/api";
import { getServerI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.meta.settings };
}

export default async function SettingsPage() {
  const { t } = await getServerI18n();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{t.settings.title}</h1>
        <p className="mt-1 text-sm text-ink-muted">{t.settings.description}</p>
      </header>
      <Suspense fallback={<Card><p className="py-10 text-center text-sm text-ink-muted">…</p></Card>}>
        <CurrentSettings />
      </Suspense>
      <Suspense fallback={<Card><p className="py-10 text-center text-sm text-ink-muted">…</p></Card>}>
        <EmailForwardingCard />
      </Suspense>
      <Suspense fallback={<Card><p className="py-10 text-center text-sm text-ink-muted">…</p></Card>}>
        <AccountForms />
      </Suspense>
      <Link href="/privacy" className="block text-center text-xs text-ink-subtle hover:text-ink hover:underline">
        {t.privacy.link}
      </Link>
    </div>
  );
}

/** Accounts made with Google have no password yet; these two forms ask differently then. */
async function AccountForms() {
  const { has_password, email } = await getCurrentUser();
  return (
    <>
      {has_password ? <ChangePasswordForm /> : <SetPasswordByEmailCard email={email} />}
      <DeleteAccountForm hasPassword={has_password} />
    </>
  );
}

async function CurrentSettings() {
  const user = await getCurrentUser();
  return <SettingsForm user={user} timeZones={Intl.supportedValuesOf("timeZone")} />;
}
