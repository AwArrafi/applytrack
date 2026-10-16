import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { getI18n, isLocale } from ".";

/** For Server Components: the current request's language, from the [lang] route segment. */
export async function getServerI18n() {
  const locale = await lang();
  if (!isLocale(locale)) notFound();
  return getI18n(locale);
}
