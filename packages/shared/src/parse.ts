/**
 * Lightweight natural-language parser for the conversational "Can I?" tab.
 * It turns free text like "45€ en un partido de fútbol el viernes" into a
 * structured { amount, type, category, date }. It is intentionally rule-based
 * (no external NLP): predictable, offline, and easy to test. Bilingual (es/en).
 */

import type { CategoryId } from "./categories";
import type { PlanType } from "./plans";
import { PLAN_TYPES } from "./plans";

export interface ParsedSpend {
  /** Amount in euros, or null if none could be read. */
  amount: number | null;
  /** Best-matched plan type, if the text hinted at one. */
  type: PlanType | null;
  /** Resolved spending category (from the type or a keyword). */
  category: CategoryId;
  /** ISO "YYYY-MM-DD" if a day was mentioned, else null. */
  date: string | null;
}

/** Strip accents and lowercase so "fútbol" matches "futbol". */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/* -------------------------------------------------------------------------- */
/* Keyword tables                                                             */
/* -------------------------------------------------------------------------- */

// Order matters: the first plan type with a keyword hit wins ties.
const PLAN_KEYWORDS: { type: PlanType; words: string[] }[] = [
  { type: "dinner", words: ["cena", "cenar", "dinner", "restaurante", "restaurant", "comer fuera", "comida fuera"] },
  { type: "drinks", words: ["copas", "copa", "birras", "cervezas", "canas", "drinks", "tomar algo"] },
  { type: "party", words: ["fiesta", "party", "botellon", "discoteca"] },
  { type: "concert", words: ["concierto", "concert", "festival", "teatro", "cine", "pelicula", "movie", "show", "entradas", "entrada"] },
  { type: "trip", words: ["viaje", "finde fuera", "escapada", "trip", "hotel", "airbnb", "vuelo", "vacaciones"] },
  { type: "sports", words: ["partido", "futbol", "football", "deporte", "gimnasio", "gym", "padel", "tenis", "match"] },
  { type: "gift", words: ["regalo", "gift", "cumpleanos", "cumple"] },
  { type: "shopping", words: ["ropa", "zapatillas", "zapatos", "comprar", "compras", "shopping", "tienda"] },
  { type: "transport", words: ["taxi", "uber", "cabify", "gasolina", "metro", "bus", "tren", "billete", "transporte", "transport"] },
];

// Categories without a plan type (essentials etc.).
const CATEGORY_KEYWORDS: { category: CategoryId; words: string[] }[] = [
  { category: "groceries", words: ["super", "supermercado", "mercadona", "carrefour", "lidl", "groceries", "compra del super"] },
  { category: "bills", words: ["factura", "facturas", "luz", "agua", "gas", "internet", "bill"] },
  { category: "housing", words: ["alquiler", "rent", "hipoteca", "piso", "vivienda"] },
  { category: "subscriptions", words: ["netflix", "spotify", "suscripcion", "subscription", "hbo", "disney", "prime"] },
  { category: "health", words: ["medico", "farmacia", "dentista", "salud", "health"] },
  { category: "education", words: ["curso", "matricula", "universidad", "libro", "libros", "education"] },
];

const WEEKDAYS: Record<string, number> = {
  domingo: 0, sunday: 0,
  lunes: 1, monday: 1,
  martes: 2, tuesday: 2,
  miercoles: 3, wednesday: 3,
  jueves: 4, thursday: 4,
  viernes: 5, friday: 5,
  sabado: 6, saturday: 6,
};

/* -------------------------------------------------------------------------- */
/* Parsing                                                                    */
/* -------------------------------------------------------------------------- */

export function parseSpendQuery(text: string, now: Date = new Date()): ParsedSpend {
  const norm = normalize(text);

  return {
    amount: parseAmount(norm),
    ...resolveCategory(norm),
    date: parseDate(norm, now),
  };
}

function parseAmount(norm: string): number | null {
  // Prefer a number explicitly tagged with € / euro(s).
  const tagged = norm.match(/(\d+(?:[.,]\d{1,2})?)\s*(?:€|eur|euros?)/);
  const generic = norm.match(/(\d+(?:[.,]\d{1,2})?)/);
  const raw = (tagged ?? generic)?.[1];
  if (!raw) return null;
  const value = parseFloat(raw.replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function resolveCategory(norm: string): { type: PlanType | null; category: CategoryId } {
  // 1. Plan type by keyword count (most specific wins).
  let best: { type: PlanType; hits: number } | null = null;
  for (const { type, words } of PLAN_KEYWORDS) {
    const hits = words.filter((w) => norm.includes(normalize(w))).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { type, hits };
  }
  if (best) {
    return { type: best.type, category: PLAN_TYPES[best.type].category };
  }

  // 2. Plain category keyword.
  for (const { category, words } of CATEGORY_KEYWORDS) {
    if (words.some((w) => norm.includes(normalize(w)))) {
      return { type: null, category };
    }
  }

  return { type: null, category: "other" };
}

function parseDate(norm: string, now: Date): string | null {
  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  // Relative day words (check "pasado mañana" before "mañana").
  if (/pasado manana|day after tomorrow/.test(norm)) return iso(addDays(base, 2));
  if (/\bmanana\b|\btomorrow\b/.test(norm)) return iso(addDays(base, 1));
  if (/\bhoy\b|\btoday\b|esta noche|tonight/.test(norm)) return iso(base);

  // Weekend → upcoming Saturday.
  if (/\bfinde\b|fin de semana|weekend/.test(norm)) {
    return iso(nextWeekday(base, 6));
  }

  // Named weekday → next occurrence (today if it matches).
  for (const [name, dow] of Object.entries(WEEKDAYS)) {
    if (new RegExp(`\\b${name}\\b`).test(norm)) return iso(nextWeekday(base, dow));
  }

  return null;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** The next date (today or later) whose day-of-week equals `dow` (0=Sun). */
function nextWeekday(from: Date, dow: number): Date {
  const delta = (dow - from.getDay() + 7) % 7;
  return addDays(from, delta);
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
