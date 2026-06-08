/**
 * Canonical spending categories shared by the backend (categorization engine)
 * and the mobile app (icons, colours, labels). Keeping this list in one place
 * guarantees the server and client never disagree on what a category means.
 */

export type CategoryId =
  | "groceries"
  | "restaurants"
  | "transport"
  | "leisure"
  | "shopping"
  | "subscriptions"
  | "housing"
  | "bills"
  | "health"
  | "education"
  | "income"
  | "transfers"
  | "other";

export interface CategoryMeta {
  id: CategoryId;
  /** English label */
  label_en: string;
  /** Spanish label */
  label_es: string;
  /** Emoji used as a lightweight icon across the UI */
  icon: string;
  /** Hex colour used for chips, charts and progress bars */
  color: string;
  /** Whether this category counts as discretionary "fun money" spending */
  discretionary: boolean;
}

export const CATEGORIES: Record<CategoryId, CategoryMeta> = {
  groceries: {
    id: "groceries",
    label_en: "Groceries",
    label_es: "Supermercado",
    icon: "🛒",
    color: "#34C759",
    discretionary: false,
  },
  restaurants: {
    id: "restaurants",
    label_en: "Restaurants",
    label_es: "Restaurantes",
    icon: "🍽️",
    color: "#FF9F0A",
    discretionary: true,
  },
  transport: {
    id: "transport",
    label_en: "Transport",
    label_es: "Transporte",
    icon: "🚌",
    color: "#5AC8FA",
    discretionary: false,
  },
  leisure: {
    id: "leisure",
    label_en: "Leisure",
    label_es: "Ocio",
    icon: "🎉",
    color: "#FF375F",
    discretionary: true,
  },
  shopping: {
    id: "shopping",
    label_en: "Shopping",
    label_es: "Compras",
    icon: "🛍️",
    color: "#BF5AF2",
    discretionary: true,
  },
  subscriptions: {
    id: "subscriptions",
    label_en: "Subscriptions",
    label_es: "Suscripciones",
    icon: "🔁",
    color: "#AF52DE",
    discretionary: false,
  },
  housing: {
    id: "housing",
    label_en: "Housing",
    label_es: "Vivienda",
    icon: "🏠",
    color: "#FF9500",
    discretionary: false,
  },
  bills: {
    id: "bills",
    label_en: "Bills",
    label_es: "Facturas",
    icon: "⚡",
    color: "#FFD60A",
    discretionary: false,
  },
  health: {
    id: "health",
    label_en: "Health",
    label_es: "Salud",
    icon: "💊",
    color: "#30D158",
    discretionary: false,
  },
  education: {
    id: "education",
    label_en: "Education",
    label_es: "Educación",
    icon: "📚",
    color: "#0A84FF",
    discretionary: false,
  },
  income: {
    id: "income",
    label_en: "Income",
    label_es: "Ingresos",
    icon: "💰",
    color: "#32D74B",
    discretionary: false,
  },
  transfers: {
    id: "transfers",
    label_en: "Transfers",
    label_es: "Transferencias",
    icon: "↔️",
    color: "#8E8E93",
    discretionary: false,
  },
  other: {
    id: "other",
    label_en: "Other",
    label_es: "Otros",
    icon: "•",
    color: "#8E8E93",
    discretionary: true,
  },
};

export const CATEGORY_IDS = Object.keys(CATEGORIES) as CategoryId[];

export function getCategory(id: string): CategoryMeta {
  return CATEGORIES[(id as CategoryId)] ?? CATEGORIES.other;
}

export function isDiscretionary(id: string): boolean {
  return getCategory(id).discretionary;
}
