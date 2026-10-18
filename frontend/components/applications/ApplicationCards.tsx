import Link from "next/link";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { ChevronRightIcon } from "@/components/ui/icons";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getServerI18n } from "@/lib/i18n/server";
import type { Application } from "@/lib/types";

/** Phones: one tappable card per application (the card opens its edit page). Tables take over from sm up. */
export async function ApplicationCards({ applications, today }: { applications: Application[]; today: string }) {
  const { f } = await getServerI18n();
  return (
    <ul className="divide-y divide-line-soft sm:hidden">
      {applications.map((app) => {
        const salary = f.salaryRange(app.salary_min, app.salary_max, app.salary_currency);
        return (
          <li key={app.id}>
            <Link
              href={`/applications/${app.id}`}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600"
            >
              <CompanyAvatar name={app.company_name} />
              <div className="min-w-0 flex-1">
                <p className="flex items-baseline gap-1.5">
                  <span className="truncate text-sm font-semibold text-ink">{app.company_name}</span>
                  <span className="shrink-0 text-xs text-ink-subtle">· {f.daysAgo(app.updated_at, today)}</span>
                </p>
                <p className="truncate text-xs text-ink-muted">{app.job_title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <StatusBadge status={app.status} />
                  {salary && <span className="text-xs text-ink-muted tabular-nums">{salary}</span>}
                </div>
              </div>
              <ChevronRightIcon className="size-5 shrink-0 text-ink-subtle" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
