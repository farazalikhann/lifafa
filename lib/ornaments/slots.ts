import type { PackOrnament, TraditionPack } from "@/lib/traditionPacks";
import type { AnyOrnamentId } from "@/types/ornament";

/**
 * Reading a pack's slots out of a card's `enabledOrnaments`, and writing a
 * tap back into it.
 *
 * The one place either happens, so the editor's idea of what is in a slot and
 * the card's can never disagree. See OrnamentSlots in lib/traditionPacks.tsx
 * for why the list is still the storage.
 */

/** Everything a pack's slots claim, so no other layer draws it too. */
export function slottedIds(pack: TraditionPack | null): readonly AnyOrnamentId[] {
  if (pack === null || pack.slots === null) {
    return [];
  }

  return [...pack.slots.top, ...pack.slots.aboveNames, ...pack.slots.corners];
}

/**
 * Which of a one-at-a-time slot's ornaments is in it: the one switched on
 * last. The editor never lets a card hold two, but a card saved before slots
 * existed can, and the newer choice is the one its host meant.
 */
export function chosenIn(
  ids: readonly AnyOrnamentId[],
  enabled: readonly AnyOrnamentId[],
): AnyOrnamentId | null {
  for (let index = enabled.length - 1; index >= 0; index -= 1) {
    if (ids.includes(enabled[index])) {
      return enabled[index];
    }
  }

  return null;
}

export interface CornerPair {
  left: PackOrnament;
  right: PackOrnament;
  /** One ornament standing in both corners, turned to face the other way on the right. */
  mirrorRight: boolean;
}

export interface ChosenSlots {
  top: PackOrnament | null;
  aboveNames: PackOrnament | null;
  corners: CornerPair | null;
}

const NOTHING: ChosenSlots = { top: null, aboveNames: null, corners: null };

/** What the card draws in each place. Every place empty for a pack without slots. */
export function resolveSlots(
  pack: TraditionPack | null,
  enabled: readonly AnyOrnamentId[],
): ChosenSlots {
  if (pack === null || pack.slots === null) {
    return NOTHING;
  }

  const find = (id: AnyOrnamentId | null): PackOrnament | null =>
    id === null ? null : pack.findOrnament(id);

  const [leftId, rightId] = pack.slots.corners;
  const left = enabled.includes(leftId) ? pack.findOrnament(leftId) : null;
  const right = enabled.includes(rightId) ? pack.findOrnament(rightId) : null;
  const only = left ?? right;

  return {
    top: find(chosenIn(pack.slots.top, enabled)),
    aboveNames: find(chosenIn(pack.slots.aboveNames, enabled)),
    corners:
      left !== null && right !== null
        ? { left, right, mirrorRight: false }
        : only !== null
          ? { left: only, right: only, mirrorRight: true }
          : null,
  };
}

/**
 * The list after a tap on a slotted tile.
 *
 * A one-at-a-time slot: the tapped ornament replaces whatever was there, and
 * tapping the one already there takes it off. The corners hold two, each in
 * its own corner, so each tile there is simply on or off.
 */
export function tapSlotted(
  pack: TraditionPack,
  enabled: readonly AnyOrnamentId[],
  id: AnyOrnamentId,
): readonly AnyOrnamentId[] {
  const slots = pack.slots;
  const isOn = enabled.includes(id);

  if (isOn) {
    return enabled.filter((current) => current !== id);
  }

  const place =
    slots === null
      ? null
      : slots.top.includes(id)
        ? slots.top
        : slots.aboveNames.includes(id)
          ? slots.aboveNames
          : null;

  const cleared =
    place === null ? enabled : enabled.filter((current) => !place.includes(current));

  return [...cleared, id];
}
