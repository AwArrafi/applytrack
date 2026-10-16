// Run with: npm test  (Node's built-in runner; Node 24 strips the TypeScript types itself)
import assert from "node:assert/strict";
import { test } from "node:test";
import { monthGrid, shiftMonth } from "./calendar.ts";

test("shiftMonth crosses year boundaries", () => {
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  assert.equal(shiftMonth("2026-10", 0), "2026-10");
});

test("October 2026 starts on Thursday: 5 weeks from Sep 27 to Oct 31", () => {
  const weeks = monthGrid("2026-10");
  assert.equal(weeks.length, 5);
  assert.deepEqual(weeks[0][0], { date: "2026-09-27", inMonth: false });
  assert.deepEqual(weeks[0][4], { date: "2026-10-01", inMonth: true });
  assert.deepEqual(weeks[4][6], { date: "2026-10-31", inMonth: true });
  assert.ok(weeks.every((week) => week.length === 7));
});

test("February 2026 starts on Sunday and fits exactly 4 weeks", () => {
  const weeks = monthGrid("2026-02");
  assert.equal(weeks.length, 4);
  assert.equal(weeks[0][0].date, "2026-02-01");
  assert.equal(weeks[3][6].date, "2026-02-28");
});

test("a month that needs 6 rows (August 2026 starts on Saturday)", () => {
  const weeks = monthGrid("2026-08");
  assert.equal(weeks.length, 6);
  assert.equal(weeks[5][1].date, "2026-08-31");
});
