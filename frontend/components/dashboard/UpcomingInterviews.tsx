import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { ClockIcon, LightbulbIcon, MapPinIcon, PencilIcon, VideoIcon } from "@/components/ui/icons";
import { InterviewTypeBadge } from "@/components/ui/InterviewTypeBadge";
import { getServerI18n } from "@/lib/i18n/server";
import type { InterviewWithApplication } from "@/lib/types";

interface UpcomingInterviewsProps {
  interviews: InterviewWithApplication[];
  totalUpcoming: number;
  /** ISO date used for "Today" / "Tomorrow" labels. */
  today: string;
  /** Shown on the right of the title, e.g. a "View calendar" link. */
  action?: ReactNode;
  /** When given, each interview gets an Edit link to this URL. */
  editHref?: (id: number) => string;
}

export async function UpcomingInterviews({ interviews, totalUpcoming, today, action, editHref }: UpcomingInterviewsProps) {
  const { t, f } = await getServerI18n();
  const remaining = totalUpcoming - interviews.length;

  return (
    <Card
      title={
        <>
          {t.upcoming.title}
          {interviews.length > 0 && <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />}
        </>
      }
      action={action}
    >
      {interviews.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">{t.upcoming.empty}</p>
      ) : (
        <ul className="space-y-3">
          {interviews.map((interview, index) => {
            const day = f.upcomingDay(interview.scheduled_at, today);
            // Today or tomorrow: both are date-only strings, so this compares whole days.
            const isSoon = Date.parse(interview.scheduled_at.slice(0, 10)) - Date.parse(today) <= 86_400_000;
            return (
              <li
                key={interview.id}
                className="rounded-lg border border-line/70 bg-surface-muted/40 p-3.5 transition-colors hover:bg-surface-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{interview.company_name}</p>
                      <InterviewTypeBadge type={interview.interview_type} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">
                      {interview.job_title}
                      {interview.interviewer && t.upcoming.with(interview.interviewer)}
                    </p>
                  </div>
                  <time
                    dateTime={interview.scheduled_at}
                    className={`shrink-0 text-xs font-medium ${
                      isSoon ? "rounded-full bg-amber-50 px-2 py-0.5 text-amber-700" : "text-ink-muted"
                    }`}
                  >
                    {day}
                  </time>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-2 text-xs text-ink-muted">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="flex items-center gap-1">
                      <ClockIcon className="size-3.5 shrink-0" />
                      {f.time(interview.scheduled_at)} ({interview.duration_minutes}m)
                    </span>
                    <span className="flex min-w-0 items-center gap-1">
                      {interview.meeting_url ? (
                        <>
                          <VideoIcon className="size-3.5 shrink-0" />
                          {t.upcoming.online}
                        </>
                      ) : (
                        <>
                          <MapPinIcon className="size-3.5 shrink-0" />
                          <span className="truncate">{interview.location || t.upcoming.locationTbd}</span>
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                  {editHref && (
                    <Link
                      href={editHref(interview.id)}
                      className="inline-flex items-center gap-1 rounded border border-line bg-surface px-2 py-1 font-medium text-ink-muted hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-primary-600"
                    >
                      <PencilIcon className="size-3" />
                      {t.common.edit}
                      <span className="sr-only">{t.upcoming.editInterviewWith(interview.company_name)}</span>
                    </Link>
                  )}
                  {interview.meeting_url && (
                    <a
                      href={interview.meeting_url}
                      target="_blank"
                      rel="noreferrer"
                      className={`rounded px-2.5 py-1 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary-600 ${
                        index === 0
                          ? "bg-primary-700 text-white hover:bg-primary-600"
                          : "border border-line bg-surface text-ink hover:bg-surface-muted"
                      }`}
                    >
                      {t.upcoming.join}
                      <span className="sr-only">{t.upcoming.joinWith(interview.company_name)}</span>
                    </a>
                  )}
                  </div>
                </div>

                {interview.preparation_notes && (
                  <p className="mt-1.5 flex items-start gap-1 text-[11px] text-ink-muted">
                    <LightbulbIcon className="mt-px size-3.5 shrink-0" />
                    <span className="line-clamp-1">{interview.preparation_notes}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {remaining > 0 && <p className="mt-3 text-xs text-ink-muted">{t.upcoming.more(remaining)}</p>}
    </Card>
  );
}
