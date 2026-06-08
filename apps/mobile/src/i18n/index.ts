import { useCallback } from "react";
import type { Locale } from "@pace/shared";
import { useSettings } from "../store/settings";
import { TRANSLATIONS } from "./translations";

type Params = Record<string, string | number>;

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}

export function translate(
  locale: Locale,
  key: string,
  params?: Params
): string {
  const dict = TRANSLATIONS[locale] ?? TRANSLATIONS.es;
  const template = dict[key] ?? TRANSLATIONS.en[key] ?? key;
  return interpolate(template, params);
}

/** Hook returning a translator bound to the current locale. */
export function useT() {
  const locale = useSettings((s) => s.locale);
  const t = useCallback(
    (key: string, params?: Params) => translate(locale, key, params),
    [locale]
  );
  return { t, locale };
}
