import type { ChosenModifier, ModifierGroup } from "@/core/domain/entities/Cashier";

/** How many options a group takes; a max of 0 or none sets no limit. */
export const groupLimit = (group: ModifierGroup) =>
  group.maxSelection && group.maxSelection > 0 ? group.maxSelection : Infinity;

/** How many options the guest must pick from a group. */
export const groupNeed = (group: ModifierGroup) =>
  Math.max(group.minSelection || 0, group.isRequired ? 1 : 0);

const pickedIn = (group: ModifierGroup, selected: string[]) =>
  group.modifiers.filter((option) => selected.includes(option.id));

/**
 * Tapping an option: it goes off if on; a single-choice group swaps to it; a
 * group already at its max stays as it is.
 */
export function toggleOption(
  selected: string[],
  group: ModifierGroup,
  optionId: string
): string[] {
  if (selected.includes(optionId)) return selected.filter((id) => id !== optionId);
  const limit = groupLimit(group);
  if (limit === 1) {
    const others = new Set(group.modifiers.map((option) => option.id));
    return [...selected.filter((id) => !others.has(id)), optionId];
  }
  if (pickedIn(group, selected).length >= limit) return selected;
  return [...selected, optionId];
}

export const defaultOptions = (groups: ModifierGroup[]) =>
  groups.flatMap((group) =>
    group.modifiers
      .filter((option) => option.isDefault)
      .slice(0, groupLimit(group))
      .map((option) => option.id)
  );

/** The first group that still needs more picked, if any. */
export const missingGroup = (groups: ModifierGroup[], selected: string[]) =>
  groups.find((group) => pickedIn(group, selected).length < groupNeed(group));

export const chosenModifiers = (
  groups: ModifierGroup[],
  selected: string[]
): ChosenModifier[] =>
  groups.flatMap((group) =>
    pickedIn(group, selected).map((option) => ({
      modifierId: option.id,
      name: option.name,
      priceDelta: option.priceDelta,
    }))
  );

/** The options kept on a line, from whatever shape the server sent. */
export const chosenOf = (value: unknown): ChosenModifier[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is ChosenModifier =>
          Boolean(item) && typeof item === "object" && "modifierId" in item
      )
    : [];

/** What a line's options add to one unit. */
export const modifierExtra = (value: unknown) =>
  chosenOf(value).reduce((sum, option) => sum + (Number(option.priceDelta) || 0), 0);

/** The option ids checkout sends; the server prices them. */
export const modifierRefs = (value: unknown) =>
  chosenOf(value).map((option) => ({ modifierId: option.modifierId }));

export const modifierKey = (value: unknown) =>
  chosenOf(value)
    .map((option) => option.modifierId)
    .sort()
    .join("+");
