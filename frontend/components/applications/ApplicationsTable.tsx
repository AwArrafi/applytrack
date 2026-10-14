import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { WORK_ARRANGEMENT_LABELS } from "@/lib/constants";
import { formatDate, formatDaysAgo, formatSalaryRange } from "@/lib/format";
import type { Application } from "@/lib/types";

interface ApplicationsTableProps {
  applications: Application[];
  /** ISO date used for "2 days ago" labels. */
  today: string;
}

/** Every application with its details. Less important columns hide on small screens. */
export function ApplicationsTable({ applications, today }: ApplicationsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Job applications</caption>
        <thead className="border-b border-line-soft bg-surface-muted text-[11px] uppercase tracking-wider text-ink-muted">
          <tr>
            <th scope="col" className="px-5 py-3 font-semibold">Company &amp; Role</th>
            <th scope="col" className="px-4 py-3 font-semibold">Status</th>
            <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Location</th>
            <th scope="col" className="hidden px-4 py-3 font-semibold lg:table-cell">Salary</th>
            <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">Applied</th>
            <th scope="col" className="hidden px-5 py-3 text-right font-semibold xl:table-cell">Updated</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line-soft">
          {applications.map((app) => (
            <tr key={app.id} className="transition-colors hover:bg-surface-muted/60">
              <td className="px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <CompanyAvatar name={app.company_name} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">{app.company_name}</p>
                    <p className="max-w-64 truncate text-ink-muted">{app.job_title}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={app.status} />
              </td>
              <td className="hidden px-4 py-3.5 md:table-cell">
                <p className="text-ink">{app.location}</p>
                <p className="text-ink-muted">{WORK_ARRANGEMENT_LABELS[app.work_arrangement]}</p>
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3.5 text-ink-muted tabular-nums lg:table-cell">
                {formatSalaryRange(app.salary_min, app.salary_max, app.salary_currency) ?? "—"}
              </td>
              <td className="hidden whitespace-nowrap px-4 py-3.5 text-ink-muted sm:table-cell">
                {app.application_date ? formatDate(app.application_date) : "Not applied"}
              </td>
              <td className="hidden whitespace-nowrap px-5 py-3.5 text-right text-ink-muted xl:table-cell">
                {formatDaysAgo(app.updated_at, today)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
