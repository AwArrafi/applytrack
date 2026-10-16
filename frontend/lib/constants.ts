import type { ApplicationStatus, InterviewOutcome, InterviewType, WorkArrangement } from "./types";

// Codes only, in display order. The words users see live in lib/i18n (t.status[code] etc).

/** Pipeline stages in the order an application normally moves through them. */
export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "wishlist", "applied", "screening", "interview", "offer", "rejected", "withdrawn",
];

export const WORK_ARRANGEMENTS: WorkArrangement[] = ["onsite", "hybrid", "remote"];

/** Hiring stages, roughly in the order Indonesian companies run them. */
export const INTERVIEW_TYPES: InterviewType[] = [
  "hr_interview", "psychotest", "skills_test", "group_discussion", "user_interview",
  "final_interview", "medical_checkup", "other",
];

export const INTERVIEW_OUTCOMES: InterviewOutcome[] = ["awaiting", "passed", "not_selected", "cancelled"];

/** Applications per week the dashboard goal widget tracks. Becomes a user setting later. */
export const WEEKLY_APPLICATION_GOAL = 5;

// shortcut: fixed name until login exists; then it comes from the signed-in user.
export const USER_NAME = "Awang Setiawan";
