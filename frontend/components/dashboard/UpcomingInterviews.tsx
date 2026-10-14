import { Card } from "@/components/ui/Card";
import { ClockIcon, LightbulbIcon, MapPinIcon, VideoIcon } from "@/components/ui/icons";
import { INTERVIEW_TYPE_LABELS } from "@/lib/constants";
import { formatTime, formatUpcomingDay } from "@/lib/format";
import type { InterviewType, InterviewWithApplication } from "@/lib/types";

const TYPE_STYLES: Record<InterviewType, string> = {
  phone_screen: "bg-blue-50 text-blue-700 ring-blue-200",
  technical: "bg-purple-50 text-purple-700 ring-purple-200",
  behavioral: "bg-primary-50 text-primary-700 ring-primary-200",
  onsite: "bg-amber-50 text-amber-800 ring-amber-200",
  final: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  other: "bg-slate-50 text-slate-600 ring-slate-200",
};

interface UpcomingInterviewsProps {
  interviews: InterviewWithApplication[];
  totalUpcoming: number;
  /** ISO date used for "Today" / "Tomorrow" labels. */
  today: string;
}

export function UpcomingInterviews({ interviews, totalUpcoming, today }: UpcomingInterviewsProps) {
  const remaining = totalUpcoming - interviews.length;

  return (
    <Card
      title={
        <>
          Upcoming Interviews
          {interviews.length > 0 && <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />}
        </>
      }
    >
      {interviews.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">No interviews scheduled.</p>
      ) : (
        <ul className="space-y-3">
          {interviews.map((interview, index) => {
            const day = formatUpcomingDay(interview.scheduled_at, today);
            const isSoon = day === "Today" || day === "Tomorrow";
            return (
              <li
                key={interview.id}
                className="rounded-lg border border-line/70 bg-surface-muted/40 p-3.5 transition-colors hover:bg-surface-muted"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">{interview.company_name}</p>
                      <span
                        className={`rounded px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-inset ${TYPE_STYLES[interview.interview_type]}`}
                      >
                        {INTERVIEW_TYPE_LABELS[interview.interview_type]}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-muted">{interview.job_title}</p>
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
                      {formatTime(interview.scheduled_at)} ({interview.duration_minutes}m)
                    </span>
                    <span className="flex min-w-0 items-center gap-1">
                      {interview.meeting_url ? (
                        <>
                          <VideoIcon className="size-3.5 shrink-0" />
                          Video call
                        </>
                      ) : (
                        <>
                          <MapPinIcon className="size-3.5 shrink-0" />
                          <span className="truncate">{interview.location || "Location TBD"}</span>
                        </>
                      )}
                    </span>
                  </div>
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
                      Join call
                      <span className="sr-only"> with {interview.company_name} (opens in a new tab)</span>
                    </a>
                  )}
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
      {remaining > 0 && <p className="mt-3 text-xs text-ink-muted">+{remaining} more scheduled</p>}
    </Card>
  );
}
