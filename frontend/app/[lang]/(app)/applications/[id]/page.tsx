import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EditApplicationForm } from "@/components/applications/EditApplicationForm";
import { Card } from "@/components/ui/Card";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { apiGet } from "@/lib/api";
import { getServerI18n } from "@/lib/i18n/server";
import type { Application } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.meta.editApplication };
}

export default async function ApplicationPage({ params }: PageProps<"/[lang]/applications/[id]">) {
  const { t } = await getServerI18n();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/applications" className="text-sm font-medium text-primary-700 hover:text-primary-600">
        {t.applications.back}
      </Link>
      {/* The id comes from the URL at request time, so the content streams in behind this boundary. */}
      <Suspense fallback={<Card><p className="py-10 text-center text-sm text-ink-muted">{t.applications.loadingOne}</p></Card>}>
        <ApplicationDetails params={params} />
      </Suspense>
    </div>
  );
}

async function ApplicationDetails({ params }: { params: PageProps<"/[lang]/applications/[id]">["params"] }) {
  const { t, f } = await getServerI18n();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const app = await apiGet<Application>(`/applications/${id}/`);

  return (
    <>
      <header className="flex items-center gap-3">
        <CompanyAvatar name={app.company_name} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight text-ink">{app.company_name}</h1>
          <p className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            {app.job_title}
            <StatusBadge status={app.status} />
            <span className="text-xs">{t.applications.added(f.date(app.created_at))}</span>
          </p>
        </div>
      </header>
      <EditApplicationForm application={app} />
    </>
  );
}
