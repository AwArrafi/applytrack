// Month-view helpers for the Interview Calendar. Dates are "YYYY-MM-DD" strings and
// the math runs in UTC, so the server's time zone can't shift a day.

const DAY_MS = 86_400_000;

/** "2026-12" + 1 -> "2027-01" */
export function shiftMonth(month: string, delta: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** Whole weeks (Sunday to Saturday) covering the month, as rows of 7 days. */
export function monthGrid(month: string): { date: string; inMonth: boolean }[][] {
  const [year, monthNumber] = month.split("-").map(Number);
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const start = first.getTime() - first.getUTCDay() * DAY_MS;
  const weeks = Math.ceil((first.getUTCDay() + daysInMonth) / 7);

  return Array.from({ length: weeks }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = new Date(start + (week * 7 + day) * DAY_MS).toISOString().slice(0, 10);
      return { date, inMonth: date.startsWith(month) };
    }),
  );
}
