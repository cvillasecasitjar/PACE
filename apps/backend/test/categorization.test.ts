import { describe, it, expect } from "vitest";
import { categorizeWithRules } from "../src/services/categorization";

/**
 * `categorizeWithRules` is a pure function (the part of categorisation that
 * doesn't touch the DB), so it's easy and fast to test thoroughly.
 */
describe("categorizeWithRules", () => {
  it("matches built-in keyword rules", () => {
    expect(categorizeWithRules("Compra Mercadona", "Mercadona", undefined, [])).toBe(
      "groceries"
    );
    expect(categorizeWithRules("Netflix", "Netflix", undefined, [])).toBe(
      "subscriptions"
    );
    expect(categorizeWithRules("Metro Madrid", "Metro Madrid", undefined, [])).toBe(
      "transport"
    );
  });

  it("lets a user-learned rule OVERRIDE the built-in rules", () => {
    // "Kebab King" would normally be a restaurant...
    expect(categorizeWithRules("Kebab King", "Kebab King", undefined, [])).toBe(
      "restaurants"
    );
    // ...but if the user taught us "kebab" → leisure, that wins.
    const userRules = [{ keyword: "kebab", category: "leisure" as const }];
    expect(
      categorizeWithRules("Kebab King", "Kebab King", undefined, userRules)
    ).toBe("leisure");
  });

  it("falls back to the provider hint when no rule matches", () => {
    expect(
      categorizeWithRules("Tienda rara XYZ", "XYZ", "health", [])
    ).toBe("health");
  });

  it("falls back to 'other' when nothing matches", () => {
    expect(
      categorizeWithRules("Tienda rara XYZ", "XYZ", undefined, [])
    ).toBe("other");
  });
});
