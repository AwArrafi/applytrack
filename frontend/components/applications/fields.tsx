"use client";

// Form pieces shared by the Add Application dialog and the edit page.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useI18n } from "@/components/I18nProvider";
import { APPLICATION_SOURCES, WORK_ARRANGEMENTS } from "@/lib/constants";
import type { ApplicationSource, WorkArrangement } from "@/lib/types";

export const inputClass =
  "h-9 w-full rounded-lg border border-line bg-canvas px-3 text-sm text-ink placeholder:text-ink-subtle focus:border-primary-600 focus:outline-none focus:ring-1 focus:ring-primary-600";

interface FieldProps {
  label: string;
  htmlFor: string;
  /** Shows a red asterisk; the input itself still needs `required`. */
  required?: boolean;
  /** Messages from the API for this field. */
  errors?: string[];
  children: ReactNode;
}

export function Field({ label, htmlFor, required, errors, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-xs font-medium text-ink">
        {label}
        {required && <span className="text-rose-600" aria-hidden="true"> *</span>}
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
      {/* Same height, border and background as the text inputs next to it. */}
      <div className="grid h-9 grid-cols-3 gap-1 rounded-lg border border-line bg-canvas p-0.5 text-center">
        {WORK_ARRANGEMENTS.map((value) => (
          <label
            key={value}
            title={t.applicationForm.workArrangementOptions[value][1]}
            className="group flex cursor-pointer items-center justify-center gap-1.5 rounded-md px-1 text-sm text-ink-muted hover:text-ink has-checked:bg-surface has-checked:font-medium has-checked:text-primary-700 has-checked:shadow-sm has-checked:ring-1 has-checked:ring-line has-focus-visible:outline-2 has-focus-visible:outline-primary-600"
          >
            <input
              type="radio"
              name="work_arrangement"
              value={value}
              defaultChecked={value === defaultValue}
              className="sr-only"
            />
            <span className="hidden size-1.5 rounded-full bg-current group-has-checked:block" aria-hidden="true" />
            {t.applicationForm.workArrangementOptions[value][0]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Expected salary: one currency choice, shown as a prefix on both amounts. Optional, so it can be
 * filled in now or later. The currency select is uncontrolled like the rest of the form; the
 * prefix follows it, including when the form is reset after saving.
 */
export function SalaryFields({
  idPrefix,
  defaults,
  errors,
}: {
  idPrefix: string;
  defaults: { min: number | null; max: number | null; currency: string };
  errors: Record<string, string[] | undefined>;
}) {
  const { t } = useI18n();
  const f = t.applicationForm;
  const [currency, setCurrency] = useState(defaults.currency);
  const selectRef = useRef<HTMLSelectElement>(null);
  // Keep a currency saved earlier that isn't in the list (the API accepts any 3-letter code).
  const codes = Object.keys(f.currencies).includes(defaults.currency)
    ? Object.keys(f.currencies)
    : [defaults.currency, ...Object.keys(f.currencies)];

  useEffect(() => {
    const form = selectRef.current?.form;
    const onReset = () => setCurrency(defaults.currency);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [defaults.currency]);

  const amount = (name: "salary_min" | "salary_max", label: string, placeholder: string, value: number | null) => (
    <div>
      <div className="flex h-9 overflow-hidden rounded-lg border border-line bg-canvas focus-within:border-primary-600 focus-within:ring-1 focus-within:ring-primary-600">
        <span className="flex shrink-0 items-center border-r border-line bg-primary-50 px-2.5 font-mono text-xs font-semibold text-primary-700" aria-hidden="true">
          {currency}
        </span>
        <input
          id={`${idPrefix}-${name}`}
          name={name}
          type="number"
          min={0}
          step={1}
          defaultValue={value ?? ""}
          aria-label={`${label} (${currency})`}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none"
        />
      </div>
      {errors[name]?.map((message) => (
        <p key={message} className="mt-1 text-xs text-rose-700">{message}</p>
      ))}
    </div>
  );

  return (
    <fieldset>
      <legend className="sr-only">{f.salaryExpectation}</legend>
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className="text-xs font-medium text-ink" aria-hidden="true">{f.salaryExpectation}</span>
        <label className="flex items-center gap-1.5 font-mono text-[11px] text-ink-muted max-sm:w-full">
          <span className="shrink-0 whitespace-nowrap">{f.currency}:</span>
          <select
            ref={selectRef}
            id={`${idPrefix}-currency`}
            name="salary_currency"
            defaultValue={defaults.currency}
            onChange={(event) => setCurrency(event.target.value)}
            className="rounded-md border border-primary-200 bg-primary-50 py-0.5 pl-2 pr-1 font-mono text-[11px] font-semibold text-primary-700 focus:outline-none focus:ring-1 focus:ring-primary-600 max-sm:h-9 max-sm:flex-1"
          >
            {codes.map((code) => (
              <option key={code} value={code}>{f.currencies[code] ?? code}</option>
            ))}
          </select>
        </label>
      </div>
      {/* Stacked on phones: side by side the placeholders get cut off. */}
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {amount("salary_min", f.salaryFrom, f.salaryFromPlaceholder, defaults.min)}
        {amount("salary_max", f.salaryTo, f.salaryToPlaceholder, defaults.max)}
      </div>
      {errors.salary_currency?.map((message) => (
        <p key={message} className="mt-1 text-xs text-rose-700">{message}</p>
      ))}
    </fieldset>
  );
}

/** "Applied via" (LinkedIn, JobStreet, ...); Analytics compares reply rates per source. */
export function SourceField({ id, defaultValue, errors }: { id: string; defaultValue: ApplicationSource; errors?: string[] }) {
  const { t } = useI18n();
  return (
    <Field label={t.applicationForm.source} htmlFor={id} errors={errors}>
      <select id={id} name="source" defaultValue={defaultValue} className={inputClass}>
        {APPLICATION_SOURCES.map((source) => (
          <option key={source} value={source}>{t.source[source]}</option>
        ))}
      </select>
    </Field>
  );
}
