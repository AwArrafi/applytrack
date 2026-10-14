import type { ApplicationStatus, InterviewType, WorkArrangement } from "./types";

/** Pipeline stages in the order an application normally moves through them. */
export const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "wishlist", label: "Wishlist" },
  { value: "applied", label: "Applied" },
  { value: "screening", label: "Screening" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
  { value: "rejected", label: "Rejected" },
  { value: "withdrawn", label: "Withdrawn" },
];

export const STATUS_LABELS = Object.fromEntries(
  APPLICATION_STATUSES.map((s) => [s.value, s.label]),
) as Record<ApplicationStatus, string>;

export const WORK_ARRANGEMENT_LABELS: Record<WorkArrangement, string> = {
  onsite: "On-site",
  hybrid: "Hybrid",
  remote: "Remote",
};

export const INTERVIEW_TYPE_LABELS: Record<InterviewType, string> = {
  phone_screen: "Phone screen",
  technical: "Technical",
  behavioral: "Behavioral",
  onsite: "On-site",
  final: "Final round",
  other: "Other",
};

/** Applications per week the dashboard goal widget tracks. Becomes a user setting later. */
export const WEEKLY_APPLICATION_GOAL = 5;

// shortcut: fixed name until login exists; then it comes from the signed-in user.
export const USER_NAME = "Awang Setiawan";
