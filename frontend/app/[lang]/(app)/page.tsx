import Link from "next/link";
import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { RecentApplications } from "@/components/dashboard/RecentApplications";
import { StatusBreakdown } from "@/components/dashboard/StatusBreakdown";
import { UpcomingInterviews } from "@/components/dashboard/UpcomingInterviews";
import { WeeklyGoal } from "@/components/dashboard/WeeklyGoal";
import { BriefcaseIcon, CalendarIcon, ChevronRightIcon, PendingIcon, TrendingUpIcon, TrophyIcon } from "@/components/ui/icons";
import { StatCard } from "@/components/ui/StatCard";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { apiGet, getCurrentUser } from "@/lib/api";
import { hourIn } from "@/lib/format";
import { getServerI18n } from "@/lib/i18n/server";
import type { DashboardSummary } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getServerI18n();
  return { title: t.meta.dashboard };
}

export default async function DashboardPage() {
  const { t } = await getServerI18n();
  return (
    <Suspense fallback={<Card><p className="py-16 text-center text-sm text-ink-muted">{t.dashboard.loading}</p></Card>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const [{ t, f }, summary, user] = await Promise.all([
    getServerI18n(),
    apiGet<DashboardSummary>("/dashboard/"),
    getCurrentUser(),
  ]);
  const d = t.dashboard;
  const submitted = summary.total_applications - summary.status_counts.wishlist;
  const offerRate = submitted ? Math.round((summary.offer_count / submitted) * 100) : 0;

  const next = summary.upcoming_interviews[0];
  let nextHint = d.nothingScheduled;
  if (next) {
    const day = f.upcomingDay(next.scheduled_at, summary.today);
    // "today"/"tomorrow" read naturally in lowercase mid-sentence; weekday names keep their capital.
    const isRelative = Date.parse(next.scheduled_at.slice(0, 10)) - Date.parse(summary.today) <= 86_400_000;
    nextHint = d.nextInterview(next.company_name, isRelative ? day.toLowerCase() : day, f.time(next.scheduled_at));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
          {d.greeting(hourIn(user.time_zone))}, {(user.name || user.email.split("@")[0]).split(" ")[0]}
          <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {d.introLead}{" "}
          <span className="font-semibold text-primary-700">{d.interviewCount(summary.interviews_this_week)}</span>{" "}
          {d.introTail}
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={d.totalApplications}
          value={summary.total_applications}
          icon={BriefcaseIcon}
          tone="primary"
          chip={
            <>
              <TrendingUpIcon className="size-3.5" />{d.thisWeek(summary.applied_last_7_days)}
            </>
          }
          hint={d.savedIncluded(summary.status_counts.wishlist)}
        />
        <StatCard
          label={d.inProgress}
          value={summary.active_applications}
          icon={PendingIcon}
          tone="blue"
          chip={
            <>
              <span className="size-1.5 rounded-full bg-blue-600" aria-hidden="true" />
              {d.active}
            </>
          }
          hint={d.acrossCompanies(summary.active_company_count)}
        />
        <StatCard
          label={d.interviews}
          value={summary.upcoming_interview_count}
          icon={CalendarIcon}
          tone="amber"
          chip={d.interviewsThisWeek(summary.interviews_this_week)}
          hint={nextHint}
        />
        <StatCard
          label={d.offers}
          value={summary.offer_count}
          icon={TrophyIcon}
          tone="emerald"
          chip={d.offerRate(offerRate)}
          hint={d.responseRate(summary.response_rate)}
        />
      </div>

      {/* 7 : 5 split on wide screens, as in the design; stacked below that so the tables keep room. */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-7">
          <ActivityChart weeks={summary.weekly_activity} />
          <RecentApplications applications={summary.recent_applications} today={summary.today} />
        </div>
        <div className="space-y-6 xl:col-span-5">
          <StatusBreakdown counts={summary.status_counts} total={summary.total_applications} />
          <UpcomingInterviews
            interviews={summary.upcoming_interviews.slice(0, 3)}
            totalUpcoming={summary.upcoming_interview_count}
            today={summary.today}
            action={
              <Link
                href="/interviews"
                className="flex shrink-0 items-center gap-0.5 rounded text-xs font-medium text-primary-700 hover:text-primary-600 focus-visible:outline-2 focus-visible:outline-primary-600"
              >
                {d.viewCalendar}
                <ChevronRightIcon className="size-4" />
              </Link>
            }
          />
          <WeeklyGoal submitted={summary.applied_last_7_days} goal={user.weekly_goal} />
        </div>
      </div>
    </div>
  );
}
