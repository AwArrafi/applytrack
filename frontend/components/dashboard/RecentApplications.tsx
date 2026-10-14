import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { WORK_ARRANGEMENT_LABELS } from "@/lib/constants";
import { formatDaysAgo } from "@/lib/format";
import type { Application } from "@/lib/types";

// Company initials get a color picked from the name, so the same company
// always looks the same.
const AVATAR_COLORS = [
  "bg-primary-100 text-primary-700",
  "bg-blue-50 text-blue-700",
  "bg-rose-50 text-rose-600",
  "bg-purple-50 text-purple-700",
  "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700",
];

function avatarColor(name: string): string {
  const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface RecentApplicationsProps {
  applications: Application[];
  /** ISO date used for "2 days ago" labels. */
  today: string;
}

/** The most recently updated applications. Less important columns hide on small screens. */
export function RecentApplications({ applications, today }: RecentApplicationsProps) {
  return (
    <Card title="Recent Applications" description="Latest updates across your pipeline" padded={false}>
      {applications.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-ink-muted">
          No applications yet. Your latest activity will appear here.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Recently updated job applications</caption>
            <thead className="border-b border-line-soft bg-surface-muted text-[11px] uppercase tracking-wider text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-3 font-semibold">Company &amp; Role</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">Applied</th>
                <th scope="col" className="px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Work</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {applications.map((app) => (
                <tr key={app.id} className="transition-colors hover:bg-surface-muted/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${avatarColor(app.company_name)}`}
                        aria-hidden="true"
                      >
                        {app.company_name[0]}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-ink">{app.company_name}</p>
                        <p className="max-w-56 truncate text-ink-muted">{app.job_title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3.5 text-ink-muted sm:table-cell">
                    {app.application_date ? formatDaysAgo(app.application_date, today) : "Not applied"}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={app.status} />
                  </td>
                  <td className="hidden px-4 py-3.5 md:table-cell">
                    <span className="rounded border border-line bg-surface-muted px-2 py-0.5 font-mono text-[11px] text-ink-muted">
                      {WORK_ARRANGEMENT_LABELS[app.work_arrangement]}
                    </span>
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
