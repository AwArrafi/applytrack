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

export type InterviewType =
  | "phone_screen"
  | "technical"
  | "behavioral"
  | "onsite"
  | "final"
  | "other";

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
}

/** An interview together with the application it belongs to, for display. */
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
