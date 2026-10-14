// Display formatting helpers. Kept in one place so dates and money look the
// same everywhere in the app.

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const weekdayDateFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "long" });

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

/** "2026-10-13" -> "Oct 13, 2026". Date-only strings are treated as local dates. */
export function formatDate(isoDate: string): string {
  return dateFormatter.format(parseDate(isoDate));
}

/** "2026-10-13" -> "Oct 13" */
export function formatShortDate(isoDate: string): string {
  return shortDateFormatter.format(parseDate(isoDate));
}

/** How long ago a date was, e.g. "Today", "2 days ago", "1 week ago", or "Sep 2" when older. */
export function formatDaysAgo(isoDate: string, today: string): string {
  const days = daysBetween(isoDate, today);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 14) return "1 week ago";
  if (days < 28) return `${Math.floor(days / 7)} weeks ago`;
  return formatShortDate(isoDate);
}

/** Label for an upcoming date: "Today", "Tomorrow", a weekday within the week, or "Oct 20". */
export function formatUpcomingDay(isoDateTime: string, today: string): string {
  const days = daysBetween(today, isoDateTime);
  if (days <= 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days < 7) return weekdayFormatter.format(parseDate(isoDateTime));
  return formatShortDate(isoDateTime);
}

/** "2026-10-15T14:00:00" -> "Thu, Oct 15" */
export function formatWeekdayDate(isoDateTime: string): string {
  return weekdayDateFormatter.format(new Date(isoDateTime));
}

/** "2026-10-15T14:00:00" -> "2:00 PM" */
export function formatTime(isoDateTime: string): string {
  return timeFormatter.format(new Date(isoDateTime));
}

/** Formats a salary range compactly, e.g. "$120k – $150k". */
export function formatSalaryRange(
  min: number | null,
  max: number | null,
  currency: string,
): string | null {
  if (min === null && max === null) return null;
  const format = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 0,
    }).format(value);
  if (min !== null && max !== null) return `${format(min)} – ${format(max)}`;
  return min !== null ? `From ${format(min)}` : `Up to ${format(max as number)}`;
}

/** Whole days from `from` to `to` (both ISO dates or datetimes; time of day is ignored). */
function daysBetween(from: string, to: string): number {
  const ms = parseDate(to).getTime() - parseDate(from).getTime();
  return Math.round(ms / 86_400_000);
}

// new Date("2026-10-13") is parsed as UTC midnight, which can show the previous
// day in timezones west of UTC. Building the date from its parts keeps it local.
function parseDate(isoDate: string): Date {
  const [year, month, day] = isoDate.slice(0, 10).split("-").map(Number);
  return new Date(year, month - 1, day);
}
