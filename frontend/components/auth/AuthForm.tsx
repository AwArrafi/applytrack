"use client";

import Link from "next/link";
import { startTransition, useActionState } from "react";
import { login, register, type SaveState } from "@/app/actions";
import { Field, inputClass } from "@/components/applications/fields";
import { useI18n } from "@/components/I18nProvider";

const INITIAL_STATE: SaveState = { ok: false, errors: {} };

/** Sign-in or sign-up form; on success the action sets the session cookie and opens the dashboard. */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const { t } = useI18n();
  const a = t.auth;
  const isRegister = mode === "register";
  const [state, formAction, pending] = useActionState(isRegister ? register : login, INITIAL_STATE);
  const errors = state.errors;
  const generalErrors = [...(errors.form ?? []), ...(errors.non_field_errors ?? [])];

  return (
    <>
      <h1 className="text-lg font-semibold tracking-tight text-ink">{isRegister ? a.registerTitle : a.loginTitle}</h1>
      <p className="mt-1 text-sm text-ink-muted">{isRegister ? a.registerDescription : a.loginDescription}</p>

      {/* Submitted by hand: <form action> would also clear the typed email when sign-in fails. */}
      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
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
        <Field label={a.password} htmlFor="auth-password" errors={errors.password}>
          <input
            id="auth-password"
            name="password"
            type="password"
            required
            minLength={isRegister ? 8 : undefined}
            autoComplete={isRegister ? "new-password" : "current-password"}
            aria-describedby={isRegister ? "auth-password-hint" : undefined}
            className={inputClass}
          />
          {isRegister && (
            <p id="auth-password-hint" className="mt-1 text-xs text-ink-subtle">
              {a.passwordHint}
            </p>
          )}
        </Field>

        <div role="alert" className="text-sm text-rose-700">
          {generalErrors.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:cursor-wait disabled:opacity-60"
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
