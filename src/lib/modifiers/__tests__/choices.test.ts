import { describe, expect, it } from "vitest";
import type { ModifierGroup } from "@/core/domain/entities/Cashier";
import {
  chosenModifiers,
  defaultOptions,
  missingGroup,
  modifierExtra,
  modifierKey,
  toggleOption,
} from "../choices";

const group = (over: Partial<ModifierGroup> = {}): ModifierGroup => ({
  id: "add-ons",
  name: "Add-ons",
  minSelection: 0,
  maxSelection: 2,
  isRequired: false,
  modifiers: [
    { id: "egg", name: "Egg", priceDelta: "500.0000", isDefault: false },
    { id: "cheese", name: "Cheese", priceDelta: "700.0000", isDefault: false },
    { id: "bacon", name: "Bacon", priceDelta: "900.0000", isDefault: false },
  ],
  ...over,
});

describe("modifier choices", () => {
  it("picks several options up to the group's max", () => {
    const addOns = group();
    let picked = toggleOption([], addOns, "egg");
    picked = toggleOption(picked, addOns, "cheese");
    picked = toggleOption(picked, addOns, "bacon");
    expect(picked).toEqual(["egg", "cheese"]);
    expect(toggleOption(picked, addOns, "egg")).toEqual(["cheese"]);
  });

  it("swaps the choice in a single-choice group", () => {
    const size = group({ maxSelection: 1 });
    expect(toggleOption(["egg"], size, "cheese")).toEqual(["cheese"]);
  });

  it("sets no limit when the group has no max", () => {
    const addOns = group({ maxSelection: null });
    const picked = ["egg", "cheese", "bacon"].reduce(
      (current, id) => toggleOption(current, addOns, id),
      [] as string[]
    );
    expect(picked).toHaveLength(3);
  });

  it("asks for a required group until something is picked", () => {
    const sauce = group({ isRequired: true });
    expect(missingGroup([sauce], [])).toBe(sauce);
    expect(missingGroup([sauce], ["egg"])).toBeUndefined();
    expect(missingGroup([group({ minSelection: 2 })], ["egg"])).toBeDefined();
  });

  it("starts from the default options, within the max", () => {
    const addOns = group({
      maxSelection: 1,
      modifiers: group().modifiers.map((option) => ({ ...option, isDefault: true })),
    });
    expect(defaultOptions([addOns])).toEqual(["egg"]);
  });

  it("prices and keys the picked options", () => {
    const chosen = chosenModifiers([group()], ["cheese", "egg"]);
    expect(chosen.map((option) => option.name)).toEqual(["Egg", "Cheese"]);
    expect(modifierExtra(chosen)).toBe(1200);
    expect(modifierKey(chosen)).toBe("cheese+egg");
    expect(modifierExtra({ legacy: "shape" })).toBe(0);
  });
});
