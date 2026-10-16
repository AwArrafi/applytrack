import { Suspense } from "react";
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
    </div>
  );
}

async function CurrentSettings() {
  const user = await getCurrentUser();
  return <SettingsForm user={user} timeZones={Intl.supportedValuesOf("timeZone")} />;
}
