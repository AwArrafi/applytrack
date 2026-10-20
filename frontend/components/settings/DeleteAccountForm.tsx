"use client";

import { startTransition, useActionState, useState } from "react";
import { deleteAccount, type SaveState } from "@/app/actions";
import { Field, inputClass } from "@/components/applications/fields";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { useI18n } from "@/components/I18nProvider";
import { Card } from "@/components/ui/Card";

const INITIAL_STATE: SaveState = { ok: false, errors: {} };

/**
 * Settings: delete the account for good. Needs the password (or, for an account made with Google,
 * its email) and an explicit "I understand".
 */
export function DeleteAccountForm({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useI18n();
  const d = t.deleteAccount;
  const [state, formAction, pending] = useActionState(deleteAccount, INITIAL_STATE);
  const [understood, setUnderstood] = useState(false);
  const generalErrors = [...(state.errors.form ?? []), ...(state.errors.non_field_errors ?? [])];

  return (
    <Card title={d.title} description={d.description} className="border-rose-200">
      {/* Submitted by hand so a wrong password doesn't also clear the checkbox. */}
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          startTransition(() => formAction(formData));
        }}
      >
        <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">{d.whatIsDeleted}</p>
        {hasPassword ? (
          <Field label={d.password} htmlFor="delete-password" errors={state.errors.password}>
            <PasswordInput id="delete-password" name="password" required autoComplete="current-password" className="sm:max-w-[calc(50%-0.5rem)]" />
          </Field>
        ) : (
          <Field label={d.email} htmlFor="delete-email" errors={state.errors.email}>
            <input id="delete-email" name="email" type="email" required autoComplete="off" className={`${inputClass} sm:max-w-[calc(50%-0.5rem)]`} />
          </Field>
        )}
        <label className="flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={understood}
            onChange={(event) => setUnderstood(event.target.checked)}
            className="mt-0.5 size-4 rounded border-line text-rose-600 focus-visible:outline-2 focus-visible:outline-rose-600"
          />
          {d.confirm}
        </label>
        <div role="alert" className="text-sm text-rose-700">
          {generalErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
        <button
          type="submit"
          disabled={!understood || pending}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? d.deleting : d.submit}
        </button>
      </form>
    </Card>
  );
}
