// Temporary sample data so the UI can be built before the backend exists.
// Remove this file once the Django API serves the same data (Phase 4).
//
// All dates are relative to a fixed "today" instead of the real clock: with
// cacheComponents enabled, reading the current time during prerendering fails
// the build, and fixed dates also make the sample data predictable.

import { APPLICATION_STATUSES } from "./constants";
import type {
  Application,
  ApplicationStatus,
  DashboardSummary,
  Interview,
  InterviewWithApplication,
  WeeklyActivity,
} from "./types";

export const MOCK_TODAY = "2026-10-13";
export const MOCK_NOW = `${MOCK_TODAY}T09:00:00`;

/** Stand-in for the signed-in user until authentication exists. */
export const MOCK_USER = { name: "Awang Setiawan", first_name: "Awang" };

type ApplicationInput = Omit<
  Application,
  "job_description" | "job_url" | "notes" | "salary_currency" | "created_at"
> &
  Partial<Pick<Application, "notes" | "salary_currency">>;

function application(input: ApplicationInput): Application {
  return {
    job_description: "",
    job_url: `https://careers.example.com/jobs/${input.id}`,
    notes: "",
    salary_currency: "USD",
    created_at: `${input.application_date ?? input.updated_at.slice(0, 10)}T08:00:00`,
    ...input,
  };
}

export const mockApplications: Application[] = [
  application({
    id: 1,
    company_name: "Linear",
    job_title: "Senior Frontend Engineer",
    application_date: "2026-09-28",
    status: "interview",
    salary_min: 160000,
    salary_max: 190000,
    location: "Remote (US)",
    work_arrangement: "remote",
    notes: "Referred by a former teammate. Strong focus on performance.",
    updated_at: "2026-10-12T16:20:00",
  }),
  application({
    id: 2,
    company_name: "Stripe",
    job_title: "Software Engineer, Payments",
    application_date: "2026-10-06",
    status: "screening",
    salary_min: 170000,
    salary_max: 210000,
    location: "Seattle, WA",
    work_arrangement: "hybrid",
    updated_at: "2026-10-11T10:05:00",
  }),
  application({
    id: 3,
    company_name: "Vercel",
    job_title: "Full-Stack Engineer",
    application_date: "2026-09-08",
    status: "offer",
    salary_min: 150000,
    salary_max: 175000,
    location: "Remote (Americas)",
    work_arrangement: "remote",
    notes: "Offer deadline Oct 20. Ask about equity refresh schedule.",
    updated_at: "2026-10-10T13:45:00",
  }),
  application({
    id: 4,
    company_name: "Figma",
    job_title: "Product Engineer",
    application_date: "2026-10-09",
    status: "applied",
    salary_min: null,
    salary_max: null,
    location: "San Francisco, CA",
    work_arrangement: "hybrid",
    updated_at: "2026-10-09T18:30:00",
  }),
  application({
    id: 5,
    company_name: "Datadog",
    job_title: "Software Engineer II",
    application_date: "2026-09-20",
    status: "interview",
    salary_min: 140000,
    salary_max: 165000,
    location: "New York, NY",
    work_arrangement: "hybrid",
    updated_at: "2026-10-08T11:15:00",
  }),
  application({
    id: 6,
    company_name: "Shopify",
    job_title: "Senior Developer",
    application_date: "2026-10-11",
    status: "applied",
    salary_min: 155000,
    salary_max: 185000,
    salary_currency: "CAD",
    location: "Remote (Canada)",
    work_arrangement: "remote",
    updated_at: "2026-10-11T09:10:00",
  }),
  application({
    id: 7,
    company_name: "Airtable",
    job_title: "Software Engineer, Platform",
    application_date: null,
    status: "wishlist",
    salary_min: null,
    salary_max: null,
    location: "San Francisco, CA",
    work_arrangement: "hybrid",
    notes: "Wait for the new-grad-to-mid team posting.",
    updated_at: "2026-10-12T20:00:00",
  }),
  application({
    id: 8,
    company_name: "Atlassian",
    job_title: "Software Engineer",
    application_date: "2026-09-30",
    status: "screening",
    salary_min: 135000,
    salary_max: 160000,
    location: "Remote (US)",
    work_arrangement: "remote",
    updated_at: "2026-10-07T15:40:00",
  }),
  application({
    id: 9,
    company_name: "Plaid",
    job_title: "Full-Stack Engineer",
    application_date: "2026-10-07",
    status: "applied",
    salary_min: 150000,
    salary_max: 180000,
    location: "New York, NY",
    work_arrangement: "hybrid",
    updated_at: "2026-10-07T12:00:00",
  }),
  application({
    id: 10,
    company_name: "Canva",
    job_title: "Frontend Engineer",
    application_date: "2026-10-02",
    status: "applied",
    salary_min: 140000,
    salary_max: 165000,
    salary_currency: "AUD",
    location: "Sydney, Australia",
    work_arrangement: "hybrid",
    updated_at: "2026-10-02T07:30:00",
  }),
  application({
    id: 11,
    company_name: "Supabase",
    job_title: "Developer Experience Engineer",
    application_date: null,
    status: "wishlist",
    salary_min: null,
    salary_max: null,
    location: "Remote",
    work_arrangement: "remote",
    updated_at: "2026-10-05T17:25:00",
  }),
  application({
    id: 12,
    company_name: "Asana",
    job_title: "Software Engineer",
    application_date: "2026-09-12",
    status: "rejected",
    salary_min: 145000,
    salary_max: 170000,
    location: "San Francisco, CA",
    work_arrangement: "onsite",
    notes: "Rejected after the technical round. Practice system design.",
    updated_at: "2026-10-01T10:00:00",
  }),
  application({
    id: 13,
    company_name: "Notion",
    job_title: "Frontend Engineer",
    application_date: "2026-09-02",
    status: "rejected",
    salary_min: null,
    salary_max: null,
    location: "New York, NY",
    work_arrangement: "onsite",
    updated_at: "2026-09-24T14:10:00",
  }),
  application({
    id: 14,
    company_name: "GitLab",
    job_title: "Backend Engineer",
    application_date: "2026-09-05",
    status: "withdrawn",
    salary_min: 130000,
    salary_max: 150000,
    location: "Remote",
    work_arrangement: "remote",
    notes: "Withdrew to focus on frontend-leaning roles.",
    updated_at: "2026-09-19T09:00:00",
  }),
];

export const mockInterviews: Interview[] = [
  {
    id: 1,
    application: 1,
    interview_type: "phone_screen",
    scheduled_at: "2026-10-02T13:00:00",
    duration_minutes: 30,
    location: "",
    meeting_url: "https://meet.example.com/linear-screen",
    preparation_notes: "Walk through recent projects.",
  },
  {
    id: 2,
    application: 3,
    interview_type: "final",
    scheduled_at: "2026-10-01T15:00:00",
    duration_minutes: 60,
    location: "",
    meeting_url: "https://meet.example.com/vercel-final",
    preparation_notes: "",
  },
  {
    id: 3,
    application: 2,
    interview_type: "phone_screen",
    scheduled_at: "2026-10-14T11:30:00",
    duration_minutes: 30,
    location: "",
    meeting_url: "https://meet.example.com/stripe-screen",
    preparation_notes: "Review the payments API docs and why Stripe.",
  },
  {
    id: 4,
    application: 1,
    interview_type: "technical",
    scheduled_at: "2026-10-15T14:00:00",
    duration_minutes: 90,
    location: "",
    meeting_url: "https://meet.example.com/linear-tech",
    preparation_notes: "Pair-programming in React. Brush up on rendering performance.",
  },
  {
    id: 5,
    application: 5,
    interview_type: "onsite",
    scheduled_at: "2026-10-17T10:00:00",
    duration_minutes: 240,
    location: "620 8th Ave, New York, NY",
    meeting_url: "",
    preparation_notes: "Four rounds: coding, system design, behavioral, team match.",
  },
  {
    id: 6,
    application: 8,
    interview_type: "phone_screen",
    scheduled_at: "2026-10-20T16:00:00",
    duration_minutes: 30,
    location: "",
    meeting_url: "https://meet.example.com/atlassian-screen",
    preparation_notes: "",
  },
  {
    id: 7,
    application: 1,
    interview_type: "behavioral",
    scheduled_at: "2026-10-22T09:30:00",
    duration_minutes: 45,
    location: "",
    meeting_url: "https://meet.example.com/linear-behavioral",
    preparation_notes: "Prepare STAR stories about cross-team projects.",
  },
];

/** Statuses that count as "in progress" (submitted and still open). */
const ACTIVE_STATUSES: ApplicationStatus[] = ["applied", "screening", "interview"];

/** Statuses that mean the company has responded to a submitted application. */
const RESPONDED_STATUSES: ApplicationStatus[] = ["screening", "interview", "offer", "rejected"];

// Builds the dashboard numbers from the sample data. In Phase 3 this
// calculation moves to a Django endpoint, keeping business logic in the backend.
export function getMockDashboardSummary(): DashboardSummary {
  const applications = mockApplications;

  const status_counts = Object.fromEntries(
    APPLICATION_STATUSES.map(({ value }) => [
      value,
      applications.filter((a) => a.status === value).length,
    ]),
  ) as Record<ApplicationStatus, number>;

  const submitted = applications.filter((a) => a.status !== "wishlist");
  const responded = submitted.filter((a) => RESPONDED_STATUSES.includes(a.status));

  const weekAgo = shiftDate(MOCK_TODAY, -7);
  const applied_last_7_days = applications.filter(
    (a) => a.application_date !== null && a.application_date > weekAgo,
  ).length;

  const upcoming = mockInterviews
    .filter((i) => i.scheduled_at >= MOCK_NOW)
    .sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const weekAhead = shiftDate(MOCK_TODAY, 7);

  const active = applications.filter((a) => ACTIVE_STATUSES.includes(a.status));

  return {
    total_applications: applications.length,
    active_applications: active.length,
    active_company_count: new Set(active.map((a) => a.company_name)).size,
    upcoming_interview_count: upcoming.length,
    interviews_this_week: upcoming.filter((i) => i.scheduled_at < weekAhead).length,
    offer_count: status_counts.offer,
    applied_last_7_days,
    response_rate: submitted.length ? Math.round((responded.length / submitted.length) * 100) : 0,
    status_counts,
    upcoming_interviews: upcoming.slice(0, 4).map(withApplication),
    recent_applications: [...applications]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 6),
    weekly_activity: getWeeklyActivity(applications, 5),
  };
}

// Counts submissions and responses per week for the last `weeks` weeks.
// The updated_at of a responded application stands in for its response date;
// the real API can track status changes precisely.
function getWeeklyActivity(applications: Application[], weeks: number): WeeklyActivity[] {
  return Array.from({ length: weeks }, (_, index) => {
    const weeksBack = weeks - 1 - index;
    const week_start = shiftDate(MOCK_TODAY, -7 * weeksBack - 6);
    const week_end = shiftDate(week_start, 6);
    const inWeek = (date: string | null) =>
      date !== null && date.slice(0, 10) >= week_start && date.slice(0, 10) <= week_end;

    return {
      week_start,
      submitted: applications.filter((a) => inWeek(a.application_date)).length,
      responses: applications.filter(
        (a) => RESPONDED_STATUSES.includes(a.status) && inWeek(a.updated_at),
      ).length,
    };
  });
}

function withApplication(interview: Interview): InterviewWithApplication {
  const app = mockApplications.find((a) => a.id === interview.application);
  return {
    ...interview,
    company_name: app?.company_name ?? "Unknown company",
    job_title: app?.job_title ?? "",
  };
}

/** Adds days to a YYYY-MM-DD string without touching timezones. */
function shiftDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}
