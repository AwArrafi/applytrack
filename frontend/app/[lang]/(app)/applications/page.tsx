import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { ImportEmailDialog } from "@/components/applications/ImportEmailDialog";
import { Card } from "@/components/ui/Card";
import { SearchIcon } from "@/components/ui/icons";
import { Pager } from "@/components/ui/Pager";
import { apiGet, getCurrentUser } from "@/lib/api";
import { todayIn } from "@/lib/format";
import { APPLICATION_STATUSES } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";
import type { Application, ApplicationStatus, Paginated } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.meta.applications };
}

type SortKey = "updated" | "applied" | "company";

interface ApplicationFilters {
  q: string;
  status: ApplicationStatus | "all";
  sort: SortKey;
  page: number;
}

// Same sort keys as the Django API.
const SORT_KEYS: SortKey[] = ["updated", "applied", "company"];

const controlClass =
  "h-9 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600";

type SearchParams = Awaited<PageProps<"/[lang]/applications">["searchParams"]>;

// The URL is user input: anything unknown falls back to the default (the API checks again).
function parseFilters(params: SearchParams): ApplicationFilters {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const status = first(params.status);
  const sort = first(params.sort);
  return {
    q: first(params.q),
    status: APPLICATION_STATUSES.includes(status as ApplicationStatus) ? (status as ApplicationStatus) : "all",
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : "updated",
    page: Math.max(1, Number.parseInt(first(params.page), 10) || 1),
  };
}

export default async function ApplicationsPage({ searchParams }: PageProps<"/[lang]/applications">) {
  const { t } = await getServerI18n();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{t.applications.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t.applications.description}</p>
        </div>
        <ImportEmailDialog />
      </header>

      {/* Reading the URL happens at request time, so it streams in behind this boundary. */}
      <Suspense fallback={<Card><p className="py-10 text-center text-sm text-ink-muted">{t.applications.loading}</p></Card>}>
        <FilteredApplications searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FilteredApplications({ searchParams }: { searchParams: PageProps<"/[lang]/applications">["searchParams"] }) {
  const { t } = await getServerI18n();
  const filters = parseFilters(await searchParams);
  const query = new URLSearchParams({ q: filters.q, sort: filters.sort });
  if (filters.status !== "all") query.set("status", filters.status);
  const pageHref = (page: number) => `/applications?${query}&page=${page}`;
  const { count, page, pages, results } = await apiGet<Paginated<Application>>(
    `/applications/?${query}&page=${filters.page}`,
  );
  const today = todayIn((await getCurrentUser()).time_zone);
  const isFiltered = filters.q !== "" || filters.status !== "all";

  return (
    <Card padded={false}>
      {/* A plain GET form: the filters live in the URL, so results can be bookmarked and shared. */}
      <Form action="/applications" role="search" className="flex flex-wrap items-end gap-3 border-b border-line-soft p-4 sm:p-5">
        <div className="relative min-w-48 flex-1">
          <label htmlFor="applications-search" className="sr-only">{t.common.searchLabel}</label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="applications-search"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder={t.applications.searchPlaceholder}
            className={`${controlClass} w-full pl-9 placeholder:text-ink-subtle`}
          />
        </div>
        <div>
          <label htmlFor="applications-status" className="mb-1 block text-xs font-medium text-ink-muted">{t.common.status}</label>
          <select id="applications-status" name="status" defaultValue={filters.status} className={controlClass}>
            <option value="all">{t.applications.allStatuses}</option>
            {APPLICATION_STATUSES.map((value) => (
              <option key={value} value={value}>{t.status[value]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="applications-sort" className="mb-1 block text-xs font-medium text-ink-muted">{t.applications.sortBy}</label>
          <select id="applications-sort" name="sort" defaultValue={filters.sort} className={controlClass}>
            {SORT_KEYS.map((value) => (
              <option key={value} value={value}>{t.applications.sort[value]}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-9 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          {t.applications.apply}
        </button>
        {isFiltered && (
          <Link
            href="/applications"
            className="flex h-9 items-center rounded-lg px-2 text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            {t.applications.clear}
          </Link>
        )}
      </Form>

      <p className="px-5 py-3 text-xs text-ink-muted" aria-live="polite">
        {isFiltered ? t.applications.found(count) : t.applications.tracking(count)}
      </p>

      {results.length === 0 ? (
        <p className="border-t border-line-soft px-5 py-12 text-center text-sm text-ink-muted">
          {t.applications.noMatch}
        </p>
      ) : (
        <>
          <ApplicationsTable applications={results} today={today} />
          <div className="border-t border-line-soft px-4 py-3 sm:px-5 empty:hidden">
            <Pager page={page} pages={pages} href={pageHref} />
          </div>
        </>
      )}
    </Card>
  );
}
