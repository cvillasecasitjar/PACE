const CURRENCY_SYMBOL: Record<string, string> = {
  EUR: "€",
  GBP: "£",
  USD: "$",
};

export function currencySymbol(currency = "EUR"): string {
  return CURRENCY_SYMBOL[currency] ?? currency + " ";
}

/** Format money like "€1,234.50" / "-€12.00". */
export function formatMoney(amount: number, currency = "EUR"): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sign}${currencySymbol(currency)}${formatted}`;
}

/** Compact money for headline cards, e.g. "€1,053". */
export function formatMoneyShort(amount: number, currency = "EUR"): string {
  const formatted = Math.round(amount).toLocaleString();
  return `${currencySymbol(currency)}${formatted}`;
}

export function formatDateShort(iso: string, locale = "es"): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
    day: "2-digit",
    month: "short",
  });
}

export function dayHeading(iso: string, locale = "es"): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) =>
    a.toDateString() === b.toDateString();
  if (same(d, today)) return locale === "es" ? "Hoy" : "Today";
  if (same(d, yesterday)) return locale === "es" ? "Ayer" : "Yesterday";
  return d.toLocaleDateString(locale === "es" ? "es-ES" : "en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });
}
