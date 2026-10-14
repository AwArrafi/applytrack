import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { RecentApplications } from "@/components/dashboard/RecentApplications";
import { StatusBreakdown } from "@/components/dashboard/StatusBreakdown";
import { UpcomingInterviews } from "@/components/dashboard/UpcomingInterviews";
import { WeeklyGoal } from "@/components/dashboard/WeeklyGoal";
import { BriefcaseIcon, CalendarIcon, PendingIcon, TrendingUpIcon, TrophyIcon } from "@/components/ui/icons";
import { StatCard } from "@/components/ui/StatCard";
import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { apiGet } from "@/lib/api";
import { USER_NAME, WEEKLY_APPLICATION_GOAL } from "@/lib/constants";
import { formatTime, formatUpcomingDay } from "@/lib/format";
import type { DashboardSummary } from "@/lib/types";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<Card><p className="py-16 text-center text-sm text-ink-muted">Loading your dashboard…</p></Card>}>
      <Dashboard />
    </Suspense>
  );
}

async function Dashboard() {
  const summary = await apiGet<DashboardSummary>("/dashboard/");
  const submitted = summary.total_applications - summary.status_counts.wishlist;
  const offerRate = submitted ? Math.round((summary.offer_count / submitted) * 100) : 0;

  const next = summary.upcoming_interviews[0];
  const nextDay = next && formatUpcomingDay(next.scheduled_at, summary.today);
  const nextHint = next
    ? `Next: ${next.company_name} ${nextDay === "Today" || nextDay === "Tomorrow" ? nextDay.toLowerCase() : nextDay} ${formatTime(next.scheduled_at)}`
    : "Nothing scheduled yet";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">
          {greeting()}, {USER_NAME.split(" ")[0]}
          <span aria-hidden="true">👋</span>
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Here&apos;s an overview of your job search pipeline. You have{" "}
          <span className="font-semibold text-primary-700">
            {summary.interviews_this_week} {summary.interviews_this_week === 1 ? "interview" : "interviews"}
          </span>{" "}
          coming up this week.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Applications"
          value={summary.total_applications}
          icon={BriefcaseIcon}
          tone="primary"
          chip={
            <>
              <TrendingUpIcon className="size-3.5" />+{summary.applied_last_7_days} this week
            </>
          }
          hint={`Including ${summary.status_counts.wishlist} on your wishlist`}
        />
        <StatCard
          label="In Progress"
          value={summary.active_applications}
          icon={PendingIcon}
          tone="blue"
          chip={
            <>
              <span className="size-1.5 rounded-full bg-blue-600" aria-hidden="true" />
              Active
            </>
          }
          hint={`Across ${summary.active_company_count} companies`}
        />
        <StatCard
          label="Interviews"
          value={summary.upcoming_interview_count}
          icon={CalendarIcon}
          tone="amber"
          chip={`${summary.interviews_this_week} this week`}
          hint={nextHint}
        />
        <StatCard
          label="Offers Received"
          value={summary.offer_count}
          icon={TrophyIcon}
          tone="emerald"
          chip={`${offerRate}% offer rate`}
          hint={`${summary.response_rate}% response rate`}
        />
      </div>

      {/* 7 : 5 split on large screens, as in the design. */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <ActivityChart weeks={summary.weekly_activity} />
          <RecentApplications applications={summary.recent_applications} today={summary.today} />
        </div>
        <div className="space-y-6 lg:col-span-5">
          <StatusBreakdown counts={summary.status_counts} total={summary.total_applications} />
          <UpcomingInterviews
            interviews={summary.upcoming_interviews.slice(0, 3)}
            totalUpcoming={summary.upcoming_interview_count}
            today={summary.today}
          />
          <WeeklyGoal submitted={summary.applied_last_7_days} goal={WEEKLY_APPLICATION_GOAL} />
        </div>
      </div>
    </div>
  );
}
