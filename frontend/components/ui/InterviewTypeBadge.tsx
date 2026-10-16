import { getServerI18n } from "@/lib/i18n/server";
import type { InterviewType } from "@/lib/types";

// One color per hiring stage, used for badges, calendar chips and the legend.
export const INTERVIEW_TYPE_STYLES: Record<InterviewType, { badge: string; dot: string; chip: string }> = {
  hr_interview: { badge: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500", chip: "border-blue-200 bg-blue-50 text-blue-800" },
  psychotest: { badge: "bg-teal-50 text-teal-700 ring-teal-200", dot: "bg-teal-500", chip: "border-teal-200 bg-teal-50 text-teal-800" },
  skills_test: { badge: "bg-purple-50 text-purple-700 ring-purple-200", dot: "bg-purple-500", chip: "border-purple-200 bg-purple-50 text-purple-800" },
  group_discussion: { badge: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500", chip: "border-amber-200 bg-amber-50 text-amber-800" },
  user_interview: { badge: "bg-primary-50 text-primary-700 ring-primary-200", dot: "bg-primary-600", chip: "border-primary-200 bg-primary-50 text-primary-700" },
  final_interview: { badge: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-500", chip: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  medical_checkup: { badge: "bg-rose-50 text-rose-700 ring-rose-200", dot: "bg-rose-500", chip: "border-rose-200 bg-rose-50 text-rose-800" },
  other: { badge: "bg-slate-50 text-slate-600 ring-slate-200", dot: "bg-slate-400", chip: "border-slate-200 bg-slate-50 text-slate-700" },
};

export async function InterviewTypeBadge({ type }: { type: InterviewType }) {
  const { t } = await getServerI18n();
  return (
    <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] ring-1 ring-inset ${INTERVIEW_TYPE_STYLES[type].badge}`}>
      {t.interviewType[type]}
    </span>
  );
}
