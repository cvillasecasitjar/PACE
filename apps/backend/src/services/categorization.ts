import type { CategoryId } from "@pace/shared";
import { CATEGORY_IDS } from "@pace/shared";
import { prisma } from "../lib/prisma";

/**
 * Rule-based categorisation with a light "learning" layer (FR-04).
 *
 * Priority:
 *   1. User-learned rules (from manual corrections) — highest signal.
 *   2. Built-in keyword rules.
 *   3. Provider's own category hint.
 *   4. Fallback: "other".
 */

const KEYWORD_RULES: { match: RegExp; category: CategoryId }[] = [
  { match: /mercadona|lidl|carrefour|dia|aldi|supermerc|grocer/i, category: "groceries" },
  { match: /mcdonald|telepizza|kebab|burger|sushi|restaurante|cafeter|coffee|starbucks|bar /i, category: "restaurants" },
  { match: /metro|renfe|cabify|uber|bus|bicimad|taxi|gasolin|parking/i, category: "transport" },
  { match: /cine|yelmo|concert|boliche|spotify concert|teatro|festival|disco/i, category: "leisure" },
  { match: /zara|amazon|decathlon|fnac|nike|adidas|shop|store/i, category: "shopping" },
  { match: /netflix|spotify|disney|hbo|prime video|youtube premium|icloud/i, category: "subscriptions" },
  { match: /alquiler|rent|landlord|piso|habitaci/i, category: "housing" },
  { match: /vodafone|movistar|orange|endesa|iberdrola|factura|water|agua|luz|gas/i, category: "bills" },
  { match: /farmacia|gym|gimnasio|basicfit|hospital|clinica|dentist|salud/i, category: "health" },
  { match: /universidad|matricula|libro|curso|udemy|education|tuition/i, category: "education" },
  { match: /beca|nómina|nomina|payroll|salary|salario|ingreso/i, category: "income" },
  { match: /transfer|bizum|transferencia|paypal/i, category: "transfers" },
];

export type UserRule = { keyword: string; category: CategoryId };

export function categorizeWithRules(
  description: string,
  merchant: string | null,
  rawCategory: string | undefined,
  userRules: UserRule[]
): CategoryId {
  const haystack = `${description} ${merchant ?? ""}`.toLowerCase();

  // 1. User-learned rules.
  for (const rule of userRules) {
    if (rule.keyword && haystack.includes(rule.keyword.toLowerCase())) {
      return rule.category;
    }
  }

  // 2. Built-in keyword rules.
  for (const rule of KEYWORD_RULES) {
    if (rule.match.test(haystack)) return rule.category;
  }

  // 3. Provider hint, if it's one we recognise.
  if (rawCategory && (CATEGORY_IDS as string[]).includes(rawCategory)) {
    return rawCategory as CategoryId;
  }

  // 4. Fallback.
  return "other";
}

export async function getUserRules(userId: string): Promise<UserRule[]> {
  const rules = await prisma.categoryRule.findMany({ where: { userId } });
  return rules.map((r) => ({ keyword: r.keyword, category: r.category as CategoryId }));
}

/**
 * Persist what we learned from a manual correction: map the transaction's
 * merchant (or first description word) to the corrected category so future
 * transactions auto-categorise the same way.
 */
export async function learnFromCorrection(
  userId: string,
  merchant: string | null,
  description: string,
  category: CategoryId
): Promise<void> {
  const keyword = (merchant || description.split(" ")[0] || "").trim();
  if (keyword.length < 2) return;
  await prisma.categoryRule.upsert({
    where: { userId_keyword: { userId, keyword } },
    create: { userId, keyword, category },
    update: { category },
  });
}
