// Run with: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import { createFormatters } from "./format.ts";

const id = createFormatters("id");
const en = createFormatters("en");

test("dates and times follow the language", () => {
  assert.equal(id.date("2026-10-13"), "13 Okt 2026");
  assert.equal(en.date("2026-10-13"), "Oct 13, 2026");
  assert.equal(id.time("2026-10-15T14:05:00+07:00"), "14.05");
  assert.equal(en.time("2026-10-15T14:05:00+07:00"), "2:05 PM");
  assert.equal(id.month("2026-10"), "Oktober 2026");
  assert.equal(id.weekdayShort(0), "Min");
  assert.equal(en.weekdayShort(6), "Sat");
});

test("relative days use natural words", () => {
  const today = "2026-10-16";
  assert.equal(id.daysAgo("2026-10-16", today), "Hari ini");
  assert.equal(id.daysAgo("2026-10-15", today), "Kemarin");
  assert.equal(en.daysAgo("2026-10-13", today), "3 days ago");
  assert.equal(en.daysAgo("2026-10-01", today), "2 weeks ago");
  assert.equal(en.daysAgo("2026-09-01", today), "Sep 1"); // older than 4 weeks: a date
  assert.equal(id.upcomingDay("2026-10-17T09:00:00+07:00", today), "Besok");
  assert.equal(en.upcomingDay("2026-10-16T18:00:00+07:00", today), "Today");
  assert.equal(id.upcomingDay("2026-10-19T09:00:00+07:00", today), "Senin");
});

test("salary ranges", () => {
  assert.equal(en.salaryRange(null, null, "USD"), null);
  assert.equal(en.salaryRange(120000, null, "USD"), "From $120K");
  assert.match(id.salaryRange(9000000, 12000000, "IDR"), /^Rp\s?9\sjt – Rp\s?12\sjt$/);
});
