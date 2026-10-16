import Link from "next/link";
import { INTERVIEW_TYPE_STYLES } from "@/components/ui/InterviewTypeBadge";
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

/** Month grid; each interview is a chip that opens it for editing. */
export async function MonthCalendar({ weeks, byDate, today, editHref, scheduleHref }: MonthCalendarProps) {
  const { t, f } = await getServerI18n();
  const weekdays = [0, 1, 2, 3, 4, 5, 6].map(f.weekdayShort);
  return (
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
              className={`group min-h-16 border-b border-r border-line-soft p-1 nth-[7n]:border-r-0 sm:min-h-24 sm:p-1.5 ${
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
              <ul className="mt-1 space-y-1">
                {interviews.map((interview) => {
                  const style = INTERVIEW_TYPE_STYLES[interview.interview_type];
                  const time = f.time(interview.scheduled_at);
                  const type = t.interviewType[interview.interview_type];
                  return (
                    <li key={interview.id}>
                      <Link
                        href={editHref(interview.id)}
                        scroll={false}
                        title={`${interview.company_name} · ${time} · ${type}`}
                        className={`block rounded border px-1 py-0.5 text-[10px] leading-tight hover:brightness-95 focus-visible:outline-2 focus-visible:outline-primary-600 sm:px-1.5 ${style.chip}`}
                      >
                        <span className="flex items-center gap-1 font-semibold">
                          <span className={`size-1.5 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                          <span className="truncate">{interview.company_name}</span>
                        </span>
                        <span className="block truncate opacity-80 max-sm:sr-only">
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
  );
}
