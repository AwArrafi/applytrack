import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { ApplicationsTable } from "@/components/applications/ApplicationsTable";
import { Card } from "@/components/ui/Card";
import { SearchIcon } from "@/components/ui/icons";
import { apiGet } from "@/lib/api";
import { APPLICATION_STATUSES } from "@/lib/constants";
import type { Application, ApplicationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Applications" };

type SortKey = "updated" | "applied" | "company";

interface ApplicationFilters {
  q: string;
  status: ApplicationStatus | "all";
  sort: SortKey;
}

// Same sort keys as the Django API.
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "updated", label: "Recently updated" },
  { value: "applied", label: "Date applied" },
  { value: "company", label: "Company A–Z" },
];

const controlClass =
  "h-9 rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600";

type SearchParams = Awaited<PageProps<"/applications">["searchParams"]>;

// The URL is user input: anything unknown falls back to the default (the API checks again).
function parseFilters(params: SearchParams): ApplicationFilters {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const status = first(params.status);
  const sort = first(params.sort);
  return {
    q: first(params.q),
    status: APPLICATION_STATUSES.some((s) => s.value === status) ? (status as ApplicationFilters["status"]) : "all",
    sort: SORT_OPTIONS.some((s) => s.value === sort) ? (sort as SortKey) : "updated",
  };
}

export default function ApplicationsPage({ searchParams }: PageProps<"/applications">) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">Applications</h1>
        <p className="mt-1 text-sm text-ink-muted">Every role you&apos;re tracking, from wishlist to offer.</p>
      </header>

      {/* Reading the URL happens at request time, so it streams in behind this boundary. */}
      <Suspense fallback={<Card><p className="py-10 text-center text-sm text-ink-muted">Loading applications…</p></Card>}>
        <FilteredApplications searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FilteredApplications({ searchParams }: { searchParams: PageProps<"/applications">["searchParams"] }) {
  const filters = parseFilters(await searchParams);
  const query = new URLSearchParams({ q: filters.q, sort: filters.sort });
  if (filters.status !== "all") query.set("status", filters.status);
  const results = await apiGet<Application[]>(`/applications/?${query}`);
  const today = new Date().toLocaleDateString("en-CA"); // local date as YYYY-MM-DD
  const isFiltered = filters.q !== "" || filters.status !== "all";

  return (
    <Card padded={false}>
      {/* A plain GET form: the filters live in the URL, so results can be bookmarked and shared. */}
      <Form action="/applications" role="search" className="flex flex-wrap items-end gap-3 border-b border-line-soft p-4 sm:p-5">
        <div className="relative min-w-48 flex-1">
          <label htmlFor="applications-search" className="sr-only">Search applications</label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
          <input
            id="applications-search"
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder="Search company, role, location, notes..."
            className={`${controlClass} w-full pl-9 placeholder:text-ink-subtle`}
          />
        </div>
        <div>
          <label htmlFor="applications-status" className="mb-1 block text-xs font-medium text-ink-muted">Status</label>
          <select id="applications-status" name="status" defaultValue={filters.status} className={controlClass}>
            <option value="all">All statuses</option>
            {APPLICATION_STATUSES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="applications-sort" className="mb-1 block text-xs font-medium text-ink-muted">Sort by</label>
          <select id="applications-sort" name="sort" defaultValue={filters.sort} className={controlClass}>
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="h-9 rounded-lg bg-primary-600 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          Apply
        </button>
        {isFiltered && (
          <Link
            href="/applications"
            className="flex h-9 items-center rounded-lg px-2 text-sm font-medium text-ink-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            Clear
          </Link>
        )}
      </Form>

      <p className="px-5 py-3 text-xs text-ink-muted" aria-live="polite">
        {isFiltered ? "Found" : "Tracking"} {results.length} {results.length === 1 ? "application" : "applications"}
      </p>

      {results.length === 0 ? (
        <p className="border-t border-line-soft px-5 py-12 text-center text-sm text-ink-muted">
          No applications match these filters.
        </p>
      ) : (
        <ApplicationsTable applications={results} today={today} />
      )}
    </Card>
  );
}
