import Link from "next/link";
import { Suspense } from "react";
import { UpcomingInterviews } from "@/components/dashboard/UpcomingInterviews";
import { InterviewDialog } from "@/components/interviews/InterviewDialog";
import { MonthCalendar } from "@/components/interviews/MonthCalendar";
import { PastInterviews } from "@/components/interviews/PastInterviews";
import { Card } from "@/components/ui/Card";
import { ChevronRightIcon, PlusIcon } from "@/components/ui/icons";
import { INTERVIEW_TYPE_STYLES } from "@/components/ui/InterviewTypeBadge";
import { apiGet, getCurrentUser } from "@/lib/api";
import { todayIn } from "@/lib/format";
import { monthGrid, shiftMonth } from "@/lib/calendar";
import { INTERVIEW_TYPES } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";
import type { ApplicationChoice, InterviewWithApplication, Paginated } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.meta.interviews };
}

type SearchParams = PageProps<"/[lang]/interviews">["searchParams"];

export default async function InterviewsPage({ searchParams }: PageProps<"/[lang]/interviews">) {
  const { t } = await getServerI18n();
  return (
    // The calendar depends on the URL (?month, ?edit, ?schedule), read at request time.
    <Suspense fallback={<Card><p className="py-16 text-center text-sm text-ink-muted">{t.interviews.loading}</p></Card>}>
      <InterviewCalendar searchParams={searchParams} />
    </Suspense>
  );
}

async function InterviewCalendar({ searchParams }: { searchParams: SearchParams }) {
  const { t, f } = await getServerI18n();
  const params = await searchParams;
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value) ?? "";
  const today = todayIn((await getCurrentUser()).time_zone);
  // The URL is user input: anything that isn't a real month falls back to this month.
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(first(params.month)) ? first(params.month) : today.slice(0, 7);

  const pastPage = Math.max(1, Number.parseInt(first(params.past_page), 10) || 1);
  const editId = first(params.edit);
  const weeks = monthGrid(month);

  // Only what this page shows: the visible weeks, the next 7 days, one page of history.
  const [monthInterviews, nextDays, upcoming, past, applications, editing] = await Promise.all([
    apiGet<InterviewWithApplication[]>(`/interviews/?from=${weeks[0][0].date}&to=${weeks.at(-1)![6].date}`),
    apiGet<InterviewWithApplication[]>(`/interviews/?from=${today}&to=${shiftDate(today, 6)}`),
    apiGet<Paginated<InterviewWithApplication>>("/interviews/?when=upcoming&page_size=1"), // just the count
    apiGet<Paginated<InterviewWithApplication>>(`/interviews/?when=past&page_size=10&page=${pastPage}`),
    apiGet<ApplicationChoice[]>("/applications/choices/"),
    /^\d+$/.test(editId) ? apiGet<InterviewWithApplication>(`/interviews/${editId}/`) : null,
  ]);

  // Links keep the month and the history page, so opening and closing a form doesn't lose your place.
  const base = { month, ...(pastPage > 1 ? { past_page: String(pastPage) } : {}) };
  const href = (extra: Record<string, string> = {}) => `/interviews?${new URLSearchParams({ ...base, ...extra })}`;
  const editHref = (id: number) => href({ edit: String(id) });
  const scheduleHref = (date: string) => href({ schedule: date });
  const pastPageHref = (page: number) => href({ past_page: String(page) });
  const schedule = first(params.schedule);
  const scheduleDate = /^\d{4}-\d{2}-\d{2}$/.test(schedule) ? schedule : today;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{t.interviews.title}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t.interviews.description}</p>
        </div>
        <Link
          href={scheduleHref(today)}
          scroll={false}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          <PlusIcon className="size-4" />
          {t.interviews.schedule}
        </Link>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface p-3 shadow-card sm:p-4">
        <div className="flex items-center gap-2">
          <nav aria-label={t.interviews.month} className="flex items-center rounded-lg border border-line">
            <Link
              href={`/interviews?month=${shiftMonth(month, -1)}`}
              aria-label={t.interviews.previousMonth}
              className="flex size-9 items-center justify-center rounded-l-lg text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
            >
              <ChevronRightIcon className="size-4 rotate-180" />
            </Link>
            <h2 className="min-w-36 px-2 text-center text-sm font-semibold text-ink" aria-live="polite">
              {f.month(month)}
            </h2>
            <Link
              href={`/interviews?month=${shiftMonth(month, 1)}`}
              aria-label={t.interviews.nextMonth}
              className="flex size-9 items-center justify-center rounded-r-lg text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
            >
              <ChevronRightIcon className="size-4" />
            </Link>
          </nav>
          <Link
            href="/interviews"
            className="h-9 rounded-lg border border-line px-3 text-sm font-medium leading-9 text-ink-muted hover:bg-surface-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
          >
            {t.interviews.today}
          </Link>
        </div>
        <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted" aria-label={t.interviews.types}>
          {INTERVIEW_TYPES.map((type) => (
            <li key={type} className="flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${INTERVIEW_TYPE_STYLES[type].dot}`} aria-hidden="true" />
              {t.interviewType[type]}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <MonthCalendar weeks={weeks} byDate={groupByDate(monthInterviews)} today={today} editHref={editHref} scheduleHref={scheduleHref} />
          <PastInterviews interviews={past.results} page={past.page} pages={past.pages} pageHref={pastPageHref} editHref={editHref} />
        </div>
        <div className="xl:col-span-4">
          <UpcomingInterviews
            interviews={notStartedYet(nextDays)}
            totalUpcoming={upcoming.count}
            today={today}
            editHref={editHref}
            action={<span className="font-mono text-[11px] text-ink-muted">{t.upcoming.nextSevenDays}</span>}
          />
        </div>
      </div>

      {(editing || schedule) && (
        <InterviewDialog
          // A new key per target, so switching from one interview to another starts a fresh form.
          key={editing ? `edit-${editing.id}` : `new-${scheduleDate}`}
          interview={editing}
          applications={applications}
          defaultDate={scheduleDate}
          closeHref={href()}
        />
      )}
    </div>
  );
}

/** Interviews per calendar day ("YYYY-MM-DD" in the backend's time zone). */
function groupByDate(interviews: InterviewWithApplication[]) {
  const byDate = new Map<string, InterviewWithApplication[]>();
  for (const interview of interviews) {
    const date = interview.scheduled_at.slice(0, 10);
    byDate.set(date, [...(byDate.get(date) ?? []), interview]);
  }
  return byDate;
}

/** Drops today's interviews that already happened (the 7-day range starts at midnight). */
function notStartedYet(interviews: InterviewWithApplication[]) {
  const now = Date.now();
  return interviews.filter((i) => Date.parse(i.scheduled_at) >= now);
}

/** Adds days to a YYYY-MM-DD string without touching time zones. */
function shiftDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
