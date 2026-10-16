// Display formatting, per language, built on the browser's/Node's Intl APIs:
// id -> "16 Okt 2026", "14.00", "kemarin"; en -> "Oct 16, 2026", "2:00 PM", "yesterday".
// Kept in one place so dates and money look the same everywhere in the app.

const INTL_LOCALE = { id: "id-ID", en: "en-US" } as const;
const SALARY_WORDS = {
  id: { from: "Mulai", upTo: "Hingga" },
  en: { from: "From", upTo: "Up to" },
} as const;

type FormatLocale = keyof typeof INTL_LOCALE;
type Formatters = ReturnType<typeof buildFormatters>;
const cache = new Map<FormatLocale, Formatters>();

/** Formatters for one language; built once per language and reused. */
export function createFormatters(locale: FormatLocale): Formatters {
  let formatters = cache.get(locale);
  if (!formatters) {
    formatters = buildFormatters(locale);
    cache.set(locale, formatters);
  }
  return formatters;
}

function buildFormatters(locale: FormatLocale) {
  const tag = INTL_LOCALE[locale];
  const dateFormatter = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short", year: "numeric" });
  const shortDateFormatter = new Intl.DateTimeFormat(tag, { day: "numeric", month: "short" });
  const weekdayFormatter = new Intl.DateTimeFormat(tag, { weekday: "long" });
  const weekdayShortFormatter = new Intl.DateTimeFormat(tag, { weekday: "short", timeZone: "UTC" });
  const monthFormatter = new Intl.DateTimeFormat(tag, { month: "long", year: "numeric", timeZone: "UTC" });
  const timeFormatter = new Intl.DateTimeFormat(tag, { hour: "numeric", minute: "2-digit" });
  // numeric: "auto" gives words where a language has them: "kemarin", "besok", "yesterday".
  const relative = new Intl.RelativeTimeFormat(tag, { numeric: "auto" });

  const shortDate = (isoDate: string) => shortDateFormatter.format(parseDate(isoDate));

  return {
    /** "2026-10-13" -> "13 Okt 2026" / "Oct 13, 2026". Date-only strings are treated as local dates. */
    date: (isoDate: string) => dateFormatter.format(parseDate(isoDate)),
    /** "2026-10-13" -> "13 Okt" / "Oct 13" */
    shortDate,
    /** "2026-10" -> "Oktober 2026" / "October 2026" */
    month: (month: string) => {
      const [year, monthNumber] = month.split("-").map(Number);
      return monthFormatter.format(Date.UTC(year, monthNumber - 1, 1));
    },
    /** 0 = Sunday -> "Min" / "Sun" (2026-10-04 is a Sunday). */
    weekdayShort: (day: number) => weekdayShortFormatter.format(Date.UTC(2026, 9, 4 + day)),
    /** How long ago a date was: "Hari ini", "Kemarin", "2 hari yang lalu", or "2 Sep" when older. */
    daysAgo: (isoDate: string, today: string) => {
      const days = daysBetween(isoDate, today);
      if (days >= 28) return shortDate(isoDate);
      return capitalize(days < 7 ? relative.format(-Math.max(days, 0), "day") : relative.format(-Math.floor(days / 7), "week"));
    },
    /** An upcoming day: "Hari ini", "Besok", a weekday within the week, or "20 Okt". */
    upcomingDay: (isoDateTime: string, today: string) => {
      const days = daysBetween(today, isoDateTime);
      if (days <= 1) return capitalize(relative.format(Math.max(days, 0), "day"));
      if (days < 7) return weekdayFormatter.format(parseDate(isoDateTime));
      return shortDate(isoDateTime);
    },
    /**
     * "2026-10-15T14:00:00+07:00" -> "14.00" / "2:00 PM". Reads the clock time from the string, so it
     * shows the time in the API's (backend's) time zone, matching the date in the same string.
     */
    time: (isoDateTime: string) => {
      const [hour, minute] = isoDateTime.slice(11, 16).split(":").map(Number);
      return timeFormatter.format(new Date(2000, 0, 1, hour, minute));
    },
    /** A salary range, compact: "Rp 9 jt – Rp 12 jt" / "$120K – $150K". */
    salaryRange: (min: number | null, max: number | null, currency: string): string | null => {
      if (min === null && max === null) return null;
      const money = new Intl.NumberFormat(tag, { style: "currency", currency, notation: "compact", maximumFractionDigits: 0 });
      if (min !== null && max !== null) return `${money.format(min)} – ${money.format(max)}`;
      const words = SALARY_WORDS[locale];
      return min !== null ? `${words.from} ${money.format(min)}` : `${words.upTo} ${money.format(max as number)}`;
    },
  };
}

/** Today's date ("YYYY-MM-DD") in a time zone, e.g. the user's. */
export function todayIn(timeZone: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone });
}

/** The current hour (0–23) in a time zone, for greetings. */
export function hourIn(timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date()));
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

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
