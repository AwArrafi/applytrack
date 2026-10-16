// Shapes of the data the frontend works with.
// Field names use snake_case on purpose: they mirror the JSON the Django REST
// API will return, so swapping mock data for real API calls needs no mapping.

export type ApplicationStatus =
  | "wishlist"
  | "applied"
  | "screening"
  | "interview"
  | "offer"
  | "rejected"
  | "withdrawn";

export type WorkArrangement = "onsite" | "hybrid" | "remote";

/** Where the job was found and applied for. */
export type ApplicationSource =
  | "linkedin" | "jobstreet" | "glints" | "kalibrr" | "company_website" | "referral" | "other";

export type InterviewType =
  | "hr_interview"
  | "user_interview"
  | "skills_test"
  | "psychotest"
  | "group_discussion"
  | "final_interview"
  | "medical_checkup"
  | "other";

export type InterviewOutcome = "awaiting" | "passed" | "not_selected" | "cancelled";

export interface Application {
  id: number;
  company_name: string;
  job_title: string;
  job_description: string;
  job_url: string;
  /** ISO date (YYYY-MM-DD). Null while the job is still on the wishlist. */
  application_date: string | null;
  status: ApplicationStatus;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  location: string;
  work_arrangement: WorkArrangement;
  source: ApplicationSource;
  notes: string;
  /** ISO datetime strings. */
  created_at: string;
  updated_at: string;
}

export interface Interview {
  id: number;
  application: number;
  interview_type: InterviewType;
  /** ISO datetime string. */
  scheduled_at: string;
  duration_minutes: number;
  location: string;
  meeting_url: string;
  preparation_notes: string;
  /** e.g. "Alex Chen, Staff Engineer" */
  interviewer: string;
  /** Debrief, filled in after the interview. */
  outcome: InterviewOutcome;
  /** 1–5, how well you think it went. */
  self_score: number | null;
  debrief_notes: string;
}

/** An interview as the API returns it: with its application's company and role. */
export interface InterviewWithApplication extends Interview {
  company_name: string;
  job_title: string;
}

/** Activity for one week, used by the dashboard chart. */
export interface WeeklyActivity {
  /** ISO date (YYYY-MM-DD) of the first day of the week. */
  week_start: string;
  /** Applications submitted that week. */
  submitted: number;
  /** Applications that got a response (screening, interview, offer, rejection) that week. */
  responses: number;
}

export interface DashboardSummary {
  /** The backend's current date (YYYY-MM-DD) in its configured time zone. */
  today: string;
  total_applications: number;
  active_applications: number;
  /** Distinct companies among the active applications. */
  active_company_count: number;
  upcoming_interview_count: number;
  /** Upcoming interviews within the next 7 days. */
  interviews_this_week: number;
  offer_count: number;
  applied_last_7_days: number;
  response_rate: number;
  status_counts: Record<ApplicationStatus, number>;
  upcoming_interviews: InterviewWithApplication[];
  recent_applications: Application[];
  /** Oldest week first; the last entry is the current week. */
  weekly_activity: WeeklyActivity[];
}

export interface User {
  id: number;
  email: string;
  name: string;
  /** Applications per week the dashboard tracks. */
  weekly_goal: number;
  /** IANA name, e.g. "Asia/Jakarta"; the API's dates and times are in this zone. */
  time_zone: string;
  language: "id" | "en";
}

/** One page of a paginated list from the API. */
export interface Paginated<T> {
  count: number;
  page: number;
  pages: number;
  results: T[];
}

/** A compact application for dropdowns (GET /applications/choices/). */
export type ApplicationChoice = Pick<Application, "id" | "company_name" | "job_title">;

/** GET /analytics/?period=… */
export interface AnalyticsKpi {
  value: number;
  /** The same number in the period before; null for "all time". */
  previous: number | null;
  /** Share of submitted applications, in percent. */
  rate: number | null;
}

export type FunnelStage = "submitted" | "screening" | "assessment" | "final" | "offer";
export type ResponseStage = "applied" | "screening" | "interview" | "offer";

export interface Analytics {
  today: string;
  period: { days: 30 | 90 | null; start: string | null };
  kpis: {
    applications: AnalyticsKpi & { per_day: number | null };
    interviews: AnalyticsKpi;
    offers: AnalyticsKpi;
    responses: AnalyticsKpi & { avg_days: number | null };
  };
  funnel: { stage: FunnelStage; count: number }[];
  weekly: WeeklyActivity[];
  channels: {
    source: ApplicationSource;
    applications: number;
    interviews: number;
    offers: number;
    responses: number;
    response_rate: number;
  }[];
  status_counts: Record<ApplicationStatus, number>;
  response_times: { stage: ResponseStage; avg_days: number | null; samples: number }[];
  follow_up: { count: number; after_days: number };
}
