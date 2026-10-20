"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { login, register, type SaveState } from "@/app/actions";
import { Field, inputClass } from "@/components/applications/fields";
import { useI18n } from "@/components/I18nProvider";
import { GoogleButton } from "./GoogleButton";
import { ConfirmPasswordField } from "./PasswordForms";
import { PasswordInput } from "./PasswordInput";

const INITIAL_STATE: SaveState = { ok: false, errors: {} };

/**
 * Sign-in or sign-up form; on success the action sets the session cookie and opens the dashboard.
 * `google` shows "Sign in with Google" above it (off until GOOGLE_CLIENT_ID is set).
 */
export function AuthForm({ mode, google }: { mode: "login" | "register"; google: boolean }) {
  const { t } = useI18n();
  const a = t.auth;
  const isRegister = mode === "register";
  const [state, formAction, pending] = useActionState(isRegister ? register : login, INITIAL_STATE);
  // Checked here, before sending: it only guards against typos, the server never needs it.
  const [mismatch, setMismatch] = useState(false);
  const errors = state.errors;
  const generalErrors = [...(errors.form ?? []), ...(errors.non_field_errors ?? [])];

  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{isRegister ? a.registerTitle : a.loginTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{isRegister ? a.registerDescription : a.loginDescription}</p>

      {google && (
        <div className="mt-6">
          <GoogleButton label={isRegister ? a.googleRegister : a.googleLogin} />
          <div className="mt-6 flex items-center gap-3 text-xs text-ink-subtle">
            <span className="h-px flex-1 bg-line-soft" />
            {a.or}
            <span className="h-px flex-1 bg-line-soft" />
          </div>
        </div>
      )}

      {/* Submitted by hand: <form action> would also clear the typed email when sign-in fails. */}
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          if (isRegister && formData.get("password") !== formData.get("password_confirm")) {
            setMismatch(true);
            return;
          }
          startTransition(() => formAction(formData));
        }}
      >
        {isRegister && (
          <Field label={a.name} htmlFor="auth-name" errors={errors.name}>
            <input id="auth-name" name="name" autoComplete="name" placeholder={a.namePlaceholder} className={inputClass} />
          </Field>
        )}
        <Field label={a.email} htmlFor="auth-email" errors={errors.email}>
          <input
            id="auth-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder={a.emailPlaceholder}
            className={inputClass}
          />
        </Field>
        <div className="relative">
          <Field label={a.password} htmlFor="auth-password" errors={errors.password}>
            <PasswordInput
              id="auth-password"
              name="password"
              required
              minLength={isRegister ? 8 : undefined}
              autoComplete={isRegister ? "new-password" : "current-password"}
              aria-describedby={isRegister ? "auth-password-hint" : undefined}
            />
            {isRegister && (
              <p id="auth-password-hint" className="mt-1 text-xs text-ink-subtle">
                {a.passwordHint}
              </p>
            )}
          </Field>
          {/* After the input in tab order, but shown on the label's row. */}
          {!isRegister && (
            <Link href="/forgot-password" className="absolute right-0 top-0 text-xs font-medium text-primary-700 hover:underline">
              {a.forgotLink}
            </Link>
          )}
        </div>
        {isRegister && (
          <ConfirmPasswordField id="auth-password-confirm" name="password_confirm" mismatch={mismatch} onChange={() => setMismatch(false)} />
        )}

        <div role="alert" className="text-sm text-rose-700">
          {generalErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? (isRegister ? a.registering : a.loggingIn) : isRegister ? a.register : a.login}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        {isRegister ? a.haveAccount : a.noAccount}{" "}
        <Link href={isRegister ? "/login" : "/register"} className="font-medium text-primary-700 hover:underline">
          {isRegister ? a.toLogin : a.toRegister}
        </Link>
      </p>
    </>
  );
}
