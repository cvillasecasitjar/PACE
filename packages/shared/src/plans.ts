/**
 * Planned events ("Plans"): things the user knows are coming up this month
 * (a dinner, a weekend away, a concert…). Each plan type maps to a spending
 * category so we can both attribute the cost and LEARN a typical amount from
 * the user's history. Shared between backend (suggestions, totals) and mobile
 * (icons, labels, the Calendar tab).
 */

import type { CategoryId } from "./categories";

export type PlanType =
  | "dinner"
  | "drinks"
  | "party"
  | "concert"
  | "trip"
  | "sports"
  | "shopping"
  | "gift"
  | "transport"
  | "other";

export type PlanStatus = "planned" | "done" | "skipped";

export interface PlanTypeMeta {
  id: PlanType;
  label_en: string;
  label_es: string;
  icon: string;
  /** Spending category this plan maps to (for learning + attribution). */
  category: CategoryId;
  /** Sensible first guess before we have any personal history (in EUR). */
  defaultAmount: number;
}

export const PLAN_TYPES: Record<PlanType, PlanTypeMeta> = {
  dinner: {
    id: "dinner",
    label_en: "Dinner out",
    label_es: "Cena fuera",
    icon: "🍽️",
    category: "restaurants",
    defaultAmount: 25,
  },
  drinks: {
    id: "drinks",
    label_en: "Drinks / night out",
    label_es: "Salir de fiesta",
    icon: "🍸",
    category: "leisure",
    defaultAmount: 30,
  },
  party: {
    id: "party",
    label_en: "Party",
    label_es: "Fiesta",
    icon: "🎉",
    category: "leisure",
    defaultAmount: 20,
  },
  concert: {
    id: "concert",
    label_en: "Concert / show",
    label_es: "Concierto / show",
    icon: "🎵",
    category: "leisure",
    defaultAmount: 40,
  },
  trip: {
    id: "trip",
    label_en: "Weekend away / trip",
    label_es: "Finde fuera / viaje",
    icon: "✈️",
    category: "leisure",
    defaultAmount: 120,
  },
  sports: {
    id: "sports",
    label_en: "Match / sports",
    label_es: "Partido / deporte",
    icon: "⚽",
    category: "leisure",
    defaultAmount: 25,
  },
  shopping: {
    id: "shopping",
    label_en: "Shopping",
    label_es: "Compras",
    icon: "🛍️",
    category: "shopping",
    defaultAmount: 50,
  },
  gift: {
    id: "gift",
    label_en: "Gift",
    label_es: "Regalo",
    icon: "🎁",
    category: "shopping",
    defaultAmount: 30,
  },
  transport: {
    id: "transport",
    label_en: "Travel / transport",
    label_es: "Viaje / transporte",
    icon: "🚆",
    category: "transport",
    defaultAmount: 20,
  },
  other: {
    id: "other",
    label_en: "Other plan",
    label_es: "Otro plan",
    icon: "📌",
    category: "other",
    defaultAmount: 20,
  },
};

export const PLAN_TYPE_IDS = Object.keys(PLAN_TYPES) as PlanType[];

export function getPlanType(id: string): PlanTypeMeta {
  return PLAN_TYPES[id as PlanType] ?? PLAN_TYPES.other;
}
