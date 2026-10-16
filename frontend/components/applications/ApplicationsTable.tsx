import Link from "next/link";
import { EditApplicationLink } from "@/components/applications/EditApplicationLink";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getServerI18n } from "@/lib/i18n/server";
import type { Application } from "@/lib/types";

interface ApplicationsTableProps {
  applications: Application[];
  /** ISO date used for "2 days ago" labels. */
  today: string;
}

/** Every application with its details. Less important columns hide on small screens. */
export async function ApplicationsTable({ applications, today }: ApplicationsTableProps) {
  const { t, f } = await getServerI18n();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">{t.applications.caption}</caption>
        <thead className="border-b border-line-soft bg-surface-muted text-[11px] uppercase tracking-wider text-ink-muted">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold sm:px-5">{t.common.companyAndRole}</th>
            <th scope="col" className="px-2 py-3 font-semibold sm:px-4">{t.common.status}</th>
            <th scope="col" className="hidden px-4 py-3 font-semibold xl:table-cell">{t.common.location}</th>
            <th scope="col" className="hidden px-4 py-3 font-semibold xl:table-cell">{t.common.salary}</th>
            <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">{t.common.applied}</th>
            <th scope="col" className="hidden px-5 py-3 text-right font-semibold 2xl:table-cell">{t.common.updated}</th>
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
                  <div className="min-w-0 max-w-32 sm:max-w-56">
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
              <td className="px-2 py-3.5 sm:px-4">
                <StatusBadge status={app.status} />
              </td>
              <td className="hidden px-4 py-3.5 xl:table-cell">
                <p className="text-ink">{app.location}</p>
                <p className="text-ink-muted">{t.workArrangement[app.work_arrangement]}</p>
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3.5 text-ink-muted tabular-nums xl:table-cell">
                {f.salaryRange(app.salary_min, app.salary_max, app.salary_currency) ?? "—"}
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3.5 text-ink-muted sm:table-cell">
                {app.application_date ? f.date(app.application_date) : t.common.notApplied}
              </td>
              <td className="hidden whitespace-nowrap px-5 py-3.5 text-right text-ink-muted 2xl:table-cell">
                {f.daysAgo(app.updated_at, today)}
              </td>
              <td className="py-3.5 pl-2 pr-4 text-right sm:px-4">
                  <EditApplicationLink application={app} />
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
