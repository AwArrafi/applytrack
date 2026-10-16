import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EditApplicationLink } from "@/components/applications/EditApplicationLink";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { ChevronRightIcon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getServerI18n } from "@/lib/i18n/server";
import type { Application } from "@/lib/types";

interface RecentApplicationsProps {
  applications: Application[];
  /** ISO date used for "2 days ago" labels. */
  today: string;
}

/** The most recently updated applications. Less important columns hide on small screens. */
export async function RecentApplications({ applications, today }: RecentApplicationsProps) {
  const { t, f } = await getServerI18n();
  return (
    <Card
      title={t.recent.title}
      description={t.recent.description}
      padded={false}
      action={
        <Link
          href="/applications"
          className="flex shrink-0 items-center gap-0.5 rounded text-xs font-medium text-primary-700 hover:text-primary-600 focus-visible:outline-2 focus-visible:outline-primary-600"
        >
          {t.common.viewAll}
          <ChevronRightIcon className="size-4" />
        </Link>
      }
    >
      {applications.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-muted">
          {t.recent.empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">{t.recent.caption}</caption>
            <thead className="border-b border-line-soft bg-surface-muted text-[11px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold sm:px-5">{t.common.companyAndRole}</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">{t.common.applied}</th>
                <th scope="col" className="px-2 py-3 font-semibold sm:px-4">{t.common.status}</th>
                <th scope="col" className="py-3 pl-2 pr-4 text-right font-semibold sm:px-4">
                  <span className="sr-only">{t.common.actions}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {applications.map((app) => (
                <tr key={app.id} className="transition-colors hover:bg-surface-muted/60">
                  <td className="px-4 py-3.5 sm:px-5">
                    <div className="flex items-center gap-3">
                      <CompanyAvatar name={app.company_name} className="max-sm:hidden" />
                      <div className="min-w-0 max-w-32 sm:max-w-36">
                        <Link
                      href={`/applications/${app.id}`}
                      className="block truncate rounded text-sm font-semibold text-ink hover:text-primary-700 hover:underline focus-visible:outline-2 focus-visible:outline-primary-600"
                    >
                      {app.company_name}
                    </Link>
                        <p className="truncate text-ink-muted">{app.job_title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3.5 text-ink-muted sm:table-cell">
                    {app.application_date ? f.daysAgo(app.application_date, today) : t.common.notApplied}
                  </td>
                  <td className="px-2 py-3.5 sm:px-4">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="py-3.5 pl-2 pr-4 text-right sm:px-4">
                  <EditApplicationLink application={app} />
                </td>
              </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
