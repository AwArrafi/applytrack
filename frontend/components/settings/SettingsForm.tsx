"use client";

import { startTransition, useActionState, useEffect, useRef } from "react";
import { updateSettings, type SaveState } from "@/app/actions";
import { Field, inputClass } from "@/components/applications/fields";
import { useI18n } from "@/components/I18nProvider";
import { Card } from "@/components/ui/Card";
import { LOCALES } from "@/lib/i18n";
import type { User } from "@/lib/types";

const INITIAL_STATE: SaveState = { ok: false, errors: {} };
const INDONESIAN_ZONES = ["Asia/Jakarta", "Asia/Makassar", "Asia/Jayapura"] as const;
const LANGUAGE_NAMES = { id: "Bahasa Indonesia", en: "English" } as const; // each in its own language

interface SettingsFormProps {
  user: User;
  /** Every IANA time zone the server knows, for users outside Indonesia. */
  timeZones: string[];
}

export function SettingsForm({ user, timeZones }: SettingsFormProps) {
  const { t } = useI18n();
  const s = t.settings;
  const [state, formAction, saving] = useActionState(updateSettings, INITIAL_STATE);
  const submittedLanguage = useRef<string>(user.language);
  const errors = state.errors;
  const generalErrors = [...(errors.form ?? []), ...(errors.non_field_errors ?? [])];
  const zoneLabels = { "Asia/Jakarta": s.wib, "Asia/Makassar": s.wita, "Asia/Jayapura": s.wit };
  const otherZones = timeZones.filter((zone) => !(INDONESIAN_ZONES as readonly string[]).includes(zone));

  // A new language changes every page, so reload once it's saved.
  useEffect(() => {
    if (state.ok && document.documentElement.lang !== submittedLanguage.current) window.location.reload();
  }, [state]);

  return (
    // Submitted by hand: <form action> would reset the fields to their old values after saving.
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        submittedLanguage.current = String(formData.get("language"));
        startTransition(() => formAction(formData));
      }}
      className="space-y-6"
    >
      <Card title={s.profile}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={s.name} htmlFor="settings-name" errors={errors.name}>
            <input id="settings-name" name="name" defaultValue={user.name} maxLength={150} autoComplete="name" className={inputClass} />
          </Field>
          <div>
            <label htmlFor="settings-email" className="mb-1 block text-xs font-medium text-ink">{s.email}</label>
            <input id="settings-email" value={user.email} readOnly aria-describedby="settings-email-hint" className={`${inputClass} text-ink-muted`} />
            <p id="settings-email-hint" className="mt-1 text-xs text-ink-subtle">{s.emailHint}</p>
          </div>
        </div>
      </Card>

      <Card title={s.preferences}>
        <div className="space-y-4">
          <Field label={s.weeklyGoal} htmlFor="settings-goal" errors={errors.weekly_goal}>
            <input
              id="settings-goal"
              name="weekly_goal"
              type="number"
              min={1}
              max={50}
              required
              defaultValue={user.weekly_goal}
              aria-describedby="settings-goal-hint"
              className={`${inputClass} max-w-32`}
            />
            <p id="settings-goal-hint" className="mt-1 text-xs text-ink-subtle">{s.weeklyGoalHint}</p>
          </Field>

          <Field label={s.timeZone} htmlFor="settings-zone" errors={errors.time_zone}>
            <select id="settings-zone" name="time_zone" defaultValue={user.time_zone} aria-describedby="settings-zone-hint" className={inputClass}>
              <optgroup label={s.indonesia}>
                {INDONESIAN_ZONES.map((zone) => (
                  <option key={zone} value={zone}>{zoneLabels[zone]}</option>
                ))}
              </optgroup>
              <optgroup label={s.otherZones}>
                {otherZones.map((zone) => (
                  <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>
                ))}
              </optgroup>
            </select>
            <p id="settings-zone-hint" className="mt-1 text-xs text-ink-subtle">{s.timeZoneHint}</p>
          </Field>

          <fieldset>
            <legend className="mb-1 text-xs font-medium text-ink">{s.language}</legend>
            <div className="flex flex-wrap gap-2">
              {LOCALES.map((locale) => (
                <label
                  key={locale}
                  className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-sm text-ink-muted has-checked:border-primary-600 has-checked:bg-primary-50 has-checked:text-primary-700 has-focus-visible:outline-2 has-focus-visible:outline-primary-600"
                >
                  <input type="radio" name="language" value={locale} defaultChecked={locale === user.language} className="sr-only" />
                  {LANGUAGE_NAMES[locale]}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <div role="status" className="text-xs">
          {generalErrors.map((message) => (
            <p key={message} className="text-rose-700">{message}</p>
          ))}
          {state.ok && !saving && <p className="text-emerald-700">{t.common.saved}</p>}
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
        >
          {saving ? t.common.saving : s.save}
        </button>
      </div>
    </form>
  );
}
