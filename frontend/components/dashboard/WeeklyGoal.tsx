import { LightbulbIcon } from "@/components/ui/icons";
import { getServerI18n } from "@/lib/i18n/server";

interface WeeklyGoalProps {
  submitted: number;
  goal: number;
}

/** Progress toward the weekly application target, plus a follow-up tip. */
export async function WeeklyGoal({ submitted, goal }: WeeklyGoalProps) {
  const { t } = await getServerI18n();
  const percent = Math.min(Math.round((submitted / goal) * 100), 100);
  const remaining = Math.max(goal - submitted, 0);

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex items-center justify-between text-xs font-medium">
        <h2 className="text-ink-muted">{t.weeklyGoal.title}</h2>
        <span className="font-bold text-primary-700">{percent}%</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <p className="font-semibold text-ink">
          {t.weeklyGoal.progress(submitted, goal)}
        </p>
        <p className="font-mono text-[11px] text-ink-muted">
          {remaining > 0 ? t.weeklyGoal.remaining(remaining) : t.weeklyGoal.reached}
        </p>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-primary-50"
        role="progressbar"
        aria-label={t.weeklyGoal.title}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-valuenow={Math.min(submitted, goal)}
      >
        <div className="h-full rounded-full bg-primary-600" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-4 flex items-start gap-2.5 rounded-lg bg-surface-muted p-3 text-xs text-ink-muted">
        <LightbulbIcon className="mt-px size-4 shrink-0 text-primary-700" />
        <span>
          <span className="font-semibold text-ink">{t.weeklyGoal.tipLabel}</span> {t.weeklyGoal.tip}
        </span>
      </p>
    </section>
  );
}
