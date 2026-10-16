import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { PencilIcon } from "@/components/ui/icons";
import { getServerI18n } from "@/lib/i18n/server";
import type { InterviewOutcome, InterviewWithApplication } from "@/lib/types";

const OUTCOME_STYLES: Record<InterviewOutcome, string> = {
  awaiting: "bg-amber-50 text-amber-800 ring-amber-200",
  passed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  not_selected: "bg-rose-50 text-rose-700 ring-rose-200",
  cancelled: "bg-slate-100 text-slate-600 ring-slate-200",
};

interface PastInterviewsProps {
  /** Newest first. */
  interviews: InterviewWithApplication[];
  editHref: (id: number) => string;
}

/** Interviews that already happened, with their outcome and debrief. */
export async function PastInterviews({ interviews, editHref }: PastInterviewsProps) {
  const { t, f } = await getServerI18n();
  return (
    <Card title={t.past.title} description={t.past.description}>
      {interviews.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-muted">{t.past.empty}</p>
      ) : (
        <ul className="space-y-3">
          {interviews.map((interview) => {
            const hasDebrief = interview.debrief_notes !== "" || interview.self_score !== null;
            return (
              <li key={interview.id} className="rounded-lg border border-line/70 p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <CompanyAvatar name={interview.company_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-ink">
                        {interview.company_name} — {interview.job_title}
                      </p>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${OUTCOME_STYLES[interview.outcome]}`}>
                        {t.outcome[interview.outcome]}
                      </span>
                    </div>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-ink-muted">
                      <span>
                        {t.interviewType[interview.interview_type]} ({interview.duration_minutes}m)
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>{t.past.completed(f.date(interview.scheduled_at))}</span>
                      {interview.self_score !== null && (
                        <>
                          <span aria-hidden="true">•</span>
                          <span>
                            <span className="text-amber-500" aria-hidden="true">★</span> {t.past.selfScore(interview.self_score)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <Link
                    href={editHref(interview.id)}
                    scroll={false}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-medium text-ink-muted shadow-sm hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-primary-600"
                  >
                    <PencilIcon className="size-3.5" />
                    {hasDebrief ? t.past.editNotes : t.past.logNotes}
                    <span className="sr-only">{t.past.forInterview(interview.company_name)}</span>
                  </Link>
                </div>
                {interview.debrief_notes && (
                  <p className="mt-3 rounded-lg bg-surface-muted p-3 text-xs text-ink-muted">
                    <span className="font-semibold text-ink">{t.past.notesLabel}</span> {interview.debrief_notes}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
