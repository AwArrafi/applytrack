import Link from "next/link";
import { InterviewTypeBadge, INTERVIEW_TYPE_STYLES } from "@/components/ui/InterviewTypeBadge";
import { getServerI18n } from "@/lib/i18n/server";
import type { InterviewWithApplication } from "@/lib/types";

interface MonthCalendarProps {
  weeks: { date: string; inMonth: boolean }[][];
  /** Interviews grouped by "YYYY-MM-DD". */
  byDate: Map<string, InterviewWithApplication[]>;
  today: string;
  editHref: (id: number) => string;
  scheduleHref: (date: string) => string;
}

/**
 * Month grid; each interview is a chip that opens it for editing. Phones are too narrow for names
 * in a 7-column grid: there the grid shows coloured dots and the month's interviews follow as a list.
 */
export async function MonthCalendar({ weeks, byDate, today, editHref, scheduleHref }: MonthCalendarProps) {
  const { t, f } = await getServerI18n();
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map(f.weekdayShort);
  const monthDays = weeks.flat().filter((day) => day.inMonth && byDate.has(day.date));
  return (
    <>
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
      <div className="grid grid-cols-7 border-b border-line-soft bg-surface-muted text-center text-[11px] font-medium text-ink-muted">
        {weekdays.map((day) => (
          <div key={day} className="py-2">
            <span className="sm:hidden" aria-hidden="true">{day[0]}</span>
            <span className="max-sm:sr-only">{day}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {weeks.flat().map(({ date, inMonth }) => {
          const interviews = byDate.get(date) ?? [];
          const isToday = date === today;
          return (
            <div
              key={date}
              className={`group min-h-12 border-b border-r border-line-soft p-1 nth-[7n]:border-r-0 sm:min-h-24 sm:p-1.5 ${
                isToday ? "bg-primary-50/60" : inMonth ? "" : "bg-surface-muted/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`flex size-6 items-center justify-center rounded-full font-mono text-[11px] ${
                    isToday ? "bg-primary-600 font-semibold text-white" : inMonth ? "text-ink" : "text-ink-subtle"
                  }`}
                >
                  {Number(date.slice(8))}
                </span>
                {/* Quick add: visible on hover, and when focused with the keyboard. */}
                <Link
                  href={scheduleHref(date)}
                  scroll={false}
                  aria-label={t.interviews.scheduleOn(f.date(date))}
                  className="hidden size-5 items-center justify-center rounded text-sm leading-none text-ink-subtle opacity-0 hover:bg-primary-100 hover:text-primary-700 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary-600 group-hover:opacity-100 sm:flex"
                >
                  +
                </Link>
              </div>
              <ul className="mt-1 space-y-1 max-sm:flex max-sm:flex-wrap max-sm:justify-center max-sm:gap-1 max-sm:space-y-0">
                {interviews.map((interview) => {
                  const style = INTERVIEW_TYPE_STYLES[interview.interview_type];
                  const time = f.time(interview.scheduled_at);
                  const type = t.interviewType[interview.interview_type];
                  return (
                    <li key={interview.id}>
                      {/* Phones: a dot only; the list below the grid has the details and the link. */}
                      <span className={`block size-1.5 rounded-full sm:hidden ${style.dot}`} aria-hidden="true" />
                      <Link
                        href={editHref(interview.id)}
                        scroll={false}
                        title={`${interview.company_name} · ${time} · ${type}`}
                        className={`hidden rounded border px-1.5 py-0.5 text-[10px] leading-tight hover:brightness-95 focus-visible:outline-2 focus-visible:outline-primary-600 sm:block ${style.chip}`}
                      >
                        <span className="flex items-center gap-1 font-semibold">
                          <span className={`size-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                          <span className="truncate">{interview.company_name}</span>
                        </span>
                        <span className="block truncate opacity-80">
                          {time} · {type}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>

    {/* Phones: this month's interviews in full, day by day. */}
    <section aria-label={t.interviews.thisMonth} className="rounded-xl border border-line bg-surface shadow-card sm:hidden">
      <h2 className="border-b border-line-soft px-4 py-3 text-sm font-semibold text-ink">{t.interviews.thisMonth}</h2>
      {monthDays.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-ink-muted">{t.interviews.noneThisMonth}</p>
      ) : (
        <ol className="divide-y divide-line-soft">
          {monthDays.map(({ date }) => (
            <li key={date} className="px-4 py-3">
              <p className={`text-xs font-semibold ${date === today ? "text-primary-700" : "text-ink-muted"}`}>
                {f.weekdayShort(new Date(`${date}T00:00:00Z`).getUTCDay())}, {f.date(date)}
                {date === today && ` · ${t.interviews.today}`}
              </p>
              <ul className="mt-2 space-y-2">
                {byDate.get(date)!.map((interview) => (
                  <li key={interview.id}>
                    <Link
                      href={editHref(interview.id)}
                      scroll={false}
                      className="flex items-start gap-3 rounded-lg border border-line-soft p-2.5 active:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary-600"
                    >
                      <span className="w-11 shrink-0 pt-0.5 font-mono text-xs font-semibold text-ink tabular-nums">{f.time(interview.scheduled_at)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{interview.company_name}</span>
                        <span className="block truncate text-xs text-ink-muted">{interview.job_title}</span>
                        <span className="mt-1.5 block">
                          <InterviewTypeBadge type={interview.interview_type} />
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
    </>
  );
}
