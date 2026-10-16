"use client";

// Gives Client Components the current language. Server Components use getServerI18n() instead.

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_LOCALE, getI18n, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  return getI18n(useContext(LocaleContext));
}

/** Saves the choice for a year and reloads, so every page (and the API's messages) switch language. */
export function switchLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}
