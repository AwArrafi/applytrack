import { LightbulbIcon } from "@/components/ui/icons";

interface WeeklyGoalProps {
  submitted: number;
  goal: number;
}

/** Progress toward the weekly application target, plus a follow-up tip. */
export function WeeklyGoal({ submitted, goal }: WeeklyGoalProps) {
  const percent = Math.min(Math.round((submitted / goal) * 100), 100);
  const remaining = Math.max(goal - submitted, 0);

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between text-xs font-medium">
        <h2 className="text-ink-muted">Weekly Application Goal</h2>
        <span className="font-bold text-primary-700">{percent}%</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="font-semibold text-ink">
          {submitted} of {goal} submitted
        </p>
        <p className="font-mono text-[11px] text-ink-muted">
          {remaining > 0 ? `${remaining} remaining` : "Goal reached"}
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-primary-50"
        role="progressbar"
        aria-label="Weekly application goal"
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(submitted, goal)}
      >
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-4 flex items-start gap-2.5 rounded-lg bg-surface-muted p-3 text-xs text-ink-muted">
        <LightbulbIcon className="mt-px size-4 shrink-0 text-primary-700" />
        <span>
          <span className="font-semibold text-ink">Tip:</span> Send a short follow-up about five days after
          an interview if you haven&apos;t heard back.
        </span>
      </p>
    </section>
  );
}
