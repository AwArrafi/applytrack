"use client";

// Gives Client Components the current language. Server Components use getServerI18n() instead.

import { createContext, useContext, type ReactNode } from "react";
import { setLanguage } from "@/app/actions";
import { DEFAULT_LOCALE, getI18n, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  return getI18n(useContext(LocaleContext));
}

/** Saves the choice (cookie, and the account when signed in), then reloads so every page switches. */
export async function switchLocale(locale: Locale) {
  await setLanguage(locale);
  window.location.reload();
}
