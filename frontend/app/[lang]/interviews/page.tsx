import Link from "next/link";
import { Suspense } from "react";
import { UpcomingInterviews } from "@/components/dashboard/UpcomingInterviews";
import { InterviewDialog } from "@/components/interviews/InterviewDialog";
import { MonthCalendar } from "@/components/interviews/MonthCalendar";
import { PastInterviews } from "@/components/interviews/PastInterviews";
import { Card } from "@/components/ui/Card";
import { ChevronRightIcon, PlusIcon } from "@/components/ui/icons";
import { INTERVIEW_TYPE_STYLES } from "@/components/ui/InterviewTypeBadge";
import { apiGet } from "@/lib/api";
import { monthGrid, shiftMonth } from "@/lib/calendar";
import { INTERVIEW_TYPES } from "@/lib/constants";
import { getServerI18n } from "@/lib/i18n/server";
import type { Application, InterviewWithApplication } from "@/lib/types";

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
  const today = new Date().toLocaleDateString("en-CA"); // local date as YYYY-MM-DD
  // The URL is user input: anything that isn't a real month falls back to this month.
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(first(params.month)) ? first(params.month) : today.slice(0, 7);

  // shortcut: loads every interview, fine for one person's job search; add date filters to the API past a few hundred.
  const [interviews, applications] = await Promise.all([
    apiGet<InterviewWithApplication[]>("/interviews/"),
    apiGet<Application[]>("/applications/?sort=company"),
  ]);

  const { upcoming, nextSevenDays, past, byDate } = groupInterviews(interviews, today);

  const href = (extra: Record<string, string> = {}) => `/interviews?${new URLSearchParams({ month, ...extra })}`;
  const editHref = (id: number) => href({ edit: String(id) });
  const scheduleHref = (date: string) => href({ schedule: date });

  const editId = Number(first(params.edit));
  const editing = interviews.find((i) => i.id === editId) ?? null;
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
          <MonthCalendar weeks={monthGrid(month)} byDate={byDate} today={today} editHref={editHref} scheduleHref={scheduleHref} />
          <PastInterviews interviews={past} editHref={editHref} />
        </div>
        <div className="xl:col-span-4">
          <UpcomingInterviews
            interviews={nextSevenDays}
            totalUpcoming={upcoming.length}
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

/** Splits interviews (sorted soonest first by the API) into upcoming and past, and by calendar day. */
function groupInterviews(interviews: InterviewWithApplication[], today: string) {
  const now = Date.now();
  const weekAhead = shiftDate(today, 7);
  const upcoming = interviews.filter((i) => Date.parse(i.scheduled_at) >= now);
  const byDate = new Map<string, InterviewWithApplication[]>();
  for (const interview of interviews) {
    const date = interview.scheduled_at.slice(0, 10); // the backend's local date
    byDate.set(date, [...(byDate.get(date) ?? []), interview]);
  }
  return {
    upcoming,
    nextSevenDays: upcoming.filter((i) => i.scheduled_at.slice(0, 10) < weekAhead),
    past: interviews.filter((i) => Date.parse(i.scheduled_at) < now).reverse(), // newest first
    byDate,
  };
}

/** Adds days to a YYYY-MM-DD string without touching time zones. */
function shiftDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}
