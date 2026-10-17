"use client";

import { useState, type ComponentProps } from "react";
import { inputClass } from "@/components/applications/fields";
import { useI18n } from "@/components/I18nProvider";

/** A password input with an eye button that shows or hides what was typed. `className` sizes the wrapper. */
export function PasswordInput({ className = "", ...props }: Omit<ComponentProps<"input">, "type">) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <div className={`relative ${className}`}>
      <input {...props} type={visible ? "text" : "password"} className={`${inputClass} pr-10`} />
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center rounded-r-lg text-ink-subtle hover:text-ink focus-visible:outline-2 focus-visible:outline-primary-600"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
          <path d="M1.5 10S4.5 4 10 4s8.5 6 8.5 6-3 6-8.5 6-8.5-6-8.5-6Z" />
          <circle cx="10" cy="10" r="2.5" />
          {visible && <path d="M3 3l14 14" />}
        </svg>
      </button>
    </div>
  );
}
