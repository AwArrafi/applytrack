"use client";

// Form pieces shared by the Add Application dialog and the edit page.

import type { ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import { WORK_ARRANGEMENTS } from "@/lib/constants";
import type { WorkArrangement } from "@/lib/types";

export const inputClass =
  "h-9 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink placeholder:text-ink-subtle focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600";

interface FieldProps {
  label: string;
  htmlFor: string;
  /** Messages from the API for this field. */
  errors?: string[];
  children: ReactNode;
}

export function Field({ label, htmlFor, errors, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-ink">
        {label}
      </label>
      {children}
      {errors?.map((message) => (
        <p key={message} className="mt-1 text-xs text-rose-700">
          {message}
        </p>
      ))}
    </div>
  );
}

/** Segmented WFO / Hybrid / WFH picker. Uncontrolled, so form resets restore the default. */
export function WorkArrangementField({ defaultValue }: { defaultValue: WorkArrangement }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="mb-1 text-xs font-medium text-ink">{t.applicationForm.workArrangement}</legend>
      <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-line/60 bg-surface-muted p-1 text-center">
        {WORK_ARRANGEMENTS.map((value) => (
          <label
            key={value}
            className="cursor-pointer rounded-md py-1 text-xs font-medium text-ink-muted hover:text-ink has-checked:bg-surface has-checked:text-primary-700 has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-primary-600"
          >
            <input
              type="radio"
              name="work_arrangement"
              value={value}
              defaultChecked={value === defaultValue}
              className="sr-only"
            />
            {t.workArrangement[value]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
