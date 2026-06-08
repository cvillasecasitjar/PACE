import { describe, expect, it } from "vitest";
import { parseSpendQuery } from "./parse";

// Fixed "today" = Monday 8 June 2026, so weekday math is deterministic.
const MONDAY = new Date(2026, 5, 8);

describe("parseSpendQuery", () => {
  it("reads amount, plan type, category and weekday", () => {
    const r = parseSpendQuery("45€ en un partido de fútbol el viernes", MONDAY);
    expect(r.amount).toBe(45);
    expect(r.type).toBe("sports");
    expect(r.category).toBe("leisure");
    expect(r.date).toBe("2026-06-12"); // next Friday
  });

  it("handles 'euros' and 'mañana' without accents", () => {
    const r = parseSpendQuery("20 euros en una cena manana", MONDAY);
    expect(r.amount).toBe(20);
    expect(r.type).toBe("dinner");
    expect(r.category).toBe("restaurants");
    expect(r.date).toBe("2026-06-09");
  });

  it("maps essentials with no plan type", () => {
    const r = parseSpendQuery("compra del super", MONDAY);
    expect(r.amount).toBeNull();
    expect(r.type).toBeNull();
    expect(r.category).toBe("groceries");
  });

  it("understands 'finde' as the upcoming Saturday", () => {
    const r = parseSpendQuery("120€ en un finde fuera", MONDAY);
    expect(r.amount).toBe(120);
    expect(r.type).toBe("trip");
    expect(r.date).toBe("2026-06-13");
  });

  it("falls back gracefully when nothing matches", () => {
    const r = parseSpendQuery("hola que tal", MONDAY);
    expect(r.amount).toBeNull();
    expect(r.type).toBeNull();
    expect(r.category).toBe("other");
    expect(r.date).toBeNull();
  });

  it("accepts decimal amounts with comma", () => {
    const r = parseSpendQuery("12,50 en ropa", MONDAY);
    expect(r.amount).toBe(12.5);
    expect(r.category).toBe("shopping");
  });
});
