import { describe, expect, test } from "bun:test";
import { decodeMoneyManagerIcons } from "./icons";

describe("decodeMoneyManagerIcons", () => {
  test("maps private-use icon glyphs to real emoji", () => {
    expect(decodeMoneyManagerIcons("\uF4B0 Salary")).toBe("💰 Salary");
    expect(decodeMoneyManagerIcons("\uF35C Food")).toBe("🍜 Food");
    expect(decodeMoneyManagerIcons("\uF696 Transport")).toBe("🚖 Transport");
  });

  test("inserts a space when an icon is glued to text", () => {
    expect(decodeMoneyManagerIcons("\uF4A1Rent Electricity")).toBe(
      "💡 Rent Electricity",
    );
  });

  test("keeps variation selectors and skin-tone modifiers", () => {
    expect(decodeMoneyManagerIcons("\uF6CD\uFE0F Grocery")).toBe(
      "🛍️ Grocery",
    );
    expect(decodeMoneyManagerIcons("\uF9D8\uF3FC Health")).toBe(
      "🧘🏼 Health",
    );
  });

  test("leaves plain text untouched", () => {
    expect(decodeMoneyManagerIcons("Food")).toBe("Food");
    expect(decodeMoneyManagerIcons("")).toBe("");
  });
});
