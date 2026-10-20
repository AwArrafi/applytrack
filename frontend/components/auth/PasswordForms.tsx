"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { changePassword, requestPasswordReset, resetPassword, type SaveState } from "@/app/actions";
import { Field, inputClass } from "@/components/applications/fields";
import { useI18n } from "@/components/I18nProvider";
import { Card } from "@/components/ui/Card";
import { PasswordInput } from "./PasswordInput";

const INITIAL_STATE: SaveState = { ok: false, errors: {} };
type Action = (previous: SaveState, formData: FormData) => Promise<SaveState>;

/**
 * Shared wiring: submitted by hand so a failed attempt keeps what was typed (a plain
 * <form action> would clear it), and cleared only after a successful save. With `confirm`,
 * the two named fields must match before anything is sent (a typo guard, not a server rule).
 */
function usePasswordForm(action: Action, confirm?: [password: string, repeat: string]) {
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE);
  const [mismatch, setMismatch] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) formRef.current?.reset(); // every successful save, not just the first
  }, [state]);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    if (confirm && formData.get(confirm[0]) !== formData.get(confirm[1])) {
      setMismatch(true);
      return;
    }
    startTransition(() => formAction(formData));
  };
  const generalErrors = [...(state.errors.form ?? []), ...(state.errors.non_field_errors ?? [])];
  return { state, pending, formRef, onSubmit, generalErrors, mismatch, clearMismatch: () => setMismatch(false) };
}

function Messages({ errors, success }: { errors: string[]; success?: ReactNode }) {
  return (
    <div role="alert" className="text-sm">
      {errors.map((message) => (
        <p key={message} className="text-rose-700">{message}</p>
      ))}
      {success && <p className="text-emerald-700">{success}</p>}
    </div>
  );
}

function SubmitButton({ pending, label, pendingLabel }: { pending: boolean; label: string; pendingLabel: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}

/** "Type it again" field; shows the mismatch message from usePasswordForm. */
export function ConfirmPasswordField({ id, name, mismatch, onChange }: { id: string; name: string; mismatch: boolean; onChange: () => void }) {
  const { t } = useI18n();
  return (
    <Field label={t.auth.confirmPassword} htmlFor={id} errors={mismatch ? [t.auth.passwordMismatch] : undefined}>
      <PasswordInput id={id} name={name} required autoComplete="new-password" aria-invalid={mismatch} onChange={onChange} />
    </Field>
  );
}

function BackToLogin() {
  const { t } = useI18n();
  return (
    <p className="mt-6 text-center text-sm">
      <Link href="/login" className="font-medium text-primary-700 hover:underline">{t.auth.backToLogin}</Link>
    </p>
  );
}

/** "Forgot password": asks for the email; the same message shows whether or not it has an account. */
export function ForgotPasswordForm() {
  const { t } = useI18n();
  const a = t.auth;
  const { state, pending, onSubmit, generalErrors } = usePasswordForm(requestPasswordReset);

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{a.forgotTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{a.forgotDescription}</p>
      {state.ok ? (
        <p role="status" className="mt-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{a.forgotSent}</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <Field label={a.email} htmlFor="forgot-email" errors={state.errors.email}>
            <input id="forgot-email" name="email" type="email" required autoComplete="email" placeholder={a.emailPlaceholder} className={inputClass} />
          </Field>
          <Messages errors={generalErrors} />
          <SubmitButton pending={pending} label={a.sendLink} pendingLabel={a.sending} />
        </form>
      )}
      <BackToLogin />
    </>
  );
}

/** The page the emailed link opens: choose a new password. */
export function ResetPasswordForm({ uid, token }: { uid: string; token: string }) {
  const { t } = useI18n();
  const a = t.auth;
  const { state, pending, onSubmit, generalErrors, mismatch, clearMismatch } = usePasswordForm(resetPassword, [
    "password",
    "password_confirm",
  ]);
  // An invalid or expired link comes back as a "token" error: offer a new link.
  const linkErrors = state.errors.token ?? [];

  if (!uid || !token) {
    return (
      <>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">{a.resetTitle}</h1>
        <p className="mt-4 text-sm text-rose-700">{a.resetMissing}</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-primary-700 hover:underline">{a.requestNewLink}</Link>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{a.resetTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{a.resetDescription}</p>
      {state.ok ? (
        <>
          <p role="status" className="mt-6 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{a.resetDone}</p>
          <Link
            href="/login"
            className="mt-4 block w-full rounded-lg bg-primary-600 px-4 py-2 text-center text-sm font-medium text-white shadow-sm hover:bg-primary-700"
          >
            {a.login}
          </Link>
        </>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <input type="hidden" name="uid" value={uid} />
          <input type="hidden" name="token" value={token} />
          <Field label={a.newPassword} htmlFor="reset-password" errors={state.errors.password}>
            <PasswordInput
              id="reset-password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              aria-describedby="reset-password-hint"
            />
            <p id="reset-password-hint" className="mt-1 text-xs text-ink-subtle">{a.passwordHint}</p>
          </Field>
          <ConfirmPasswordField id="reset-password-confirm" name="password_confirm" mismatch={mismatch} onChange={clearMismatch} />
          <Messages errors={[...linkErrors, ...generalErrors]} />
          {linkErrors.length > 0 && (
            <Link href="/forgot-password" className="block text-sm font-medium text-primary-700 hover:underline">{a.requestNewLink}</Link>
          )}
          <SubmitButton pending={pending} label={a.savePassword} pendingLabel={t.common.saving} />
        </form>
      )}
      <BackToLogin />
    </>
  );
}

/** Settings card: change the password, or create a first one for an account made with Google. */
export function ChangePasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useI18n();
  const a = t.auth;
  const { state, pending, formRef, onSubmit, generalErrors, mismatch, clearMismatch } = usePasswordForm(changePassword, [
    "new_password",
    "new_password_confirm",
  ]);

  return (
    <Card title={hasPassword ? a.changeTitle : a.setTitle} description={hasPassword ? a.changeHint : a.setHint}>
      <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
        {hasPassword && (
          <Field label={a.currentPassword} htmlFor="change-current" errors={state.errors.current_password}>
            <PasswordInput id="change-current" name="current_password" required autoComplete="current-password" className="sm:max-w-[calc(50%-0.5rem)]" />
          </Field>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={a.newPassword} htmlFor="change-new" errors={state.errors.new_password}>
            <PasswordInput id="change-new" name="new_password" required minLength={8} autoComplete="new-password" />
          </Field>
          <ConfirmPasswordField id="change-new-confirm" name="new_password_confirm" mismatch={mismatch} onChange={clearMismatch} />
        </div>
        <div className="flex items-center justify-end gap-3">
          <Messages errors={generalErrors} success={state.ok && !pending ? a.changeDone : undefined} />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? t.common.saving : a.savePassword}
          </button>
        </div>
      </form>
    </Card>
  );
}
