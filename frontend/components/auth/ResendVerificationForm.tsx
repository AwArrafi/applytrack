"use client";

import { useActionState } from "react";
import { resendVerification, type SaveState } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";

const INITIAL_STATE: SaveState = { ok: false, errors: {} };

/** "Send it again" on the check-your-email page; Django allows a few per hour. */
export function ResendVerificationForm() {
  const { t } = useI18n();
  const [state, formAction, pending] = useActionState(resendVerification, INITIAL_STATE);
  return (
    <form action={formAction} className="mt-4 space-y-2">
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? t.verifyEmail.sending : t.verifyEmail.resend}
      </button>
      <div role="status" className="text-sm">
        {!pending && state.ok && <p className="text-emerald-700">{t.verifyEmail.resent}</p>}
        {(state.errors.form ?? []).map((message) => (
          <p key={message} className="text-rose-700">
            {message}
          </p>
        ))}
      </div>
    </form>
  );
}
