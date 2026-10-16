// Languages the app supports. The locale lives in a cookie; proxy.ts rewrites each
// request to app/[lang]/..., so URLs stay the same in every language.

import { createFormatters } from "../format";
import { en } from "./en";
import { id, type Dictionary } from "./id";

export const LOCALES = ["id", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "id";
export const LOCALE_COOKIE = "locale";

export const isLocale = (value: string | undefined): value is Locale => LOCALES.includes(value as Locale);

const dictionaries: Record<Locale, Dictionary> = { id, en };

/** Everything a component needs to show text: the locale, its words, and its date/number formats. */
export function getI18n(locale: Locale) {
  return { locale, t: dictionaries[locale], f: createFormatters(locale) };
}

export type I18n = ReturnType<typeof getI18n>;
export type { Dictionary };
