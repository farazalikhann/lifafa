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

  return [
    ...pack.slots.top,
    ...pack.slots.aboveNames,
    ...(pack.slots.corners ?? []),
    ...(pack.slots.frame ?? []),
    ...(pack.slots.sides ?? []),
  ];
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

/**
 * Which of a pack's corner ornaments stand in the two corners: the two
 * switched on last, in the pack's own order, so the same two always stand
 * the same way round. A pack may offer three for two corners, and a card
 * saved before its pack had corners can hold all three; the newer choices
 * are the ones its host meant.
 */
export function chosenCorners(
  pack: TraditionPack | null,
  enabled: readonly AnyOrnamentId[],
): readonly AnyOrnamentId[] {
  const offered = [...new Set(pack?.slots?.corners ?? [])];
  const on = [...new Set(enabled.filter((id) => offered.includes(id)))].slice(-2);

  return offered.filter((id) => on.includes(id));
}

export interface CornerPair {
  left: PackOrnament;
  right: PackOrnament;
  /**
   * One ornament standing in both corners, turned to face the other way on
   * the right. Never an `uprightOnly` one: that stands the same way in both.
   */
  mirrorRight: boolean;
}

export interface ChosenSlots {
  top: PackOrnament | null;
  aboveNames: PackOrnament | null;
  corners: CornerPair | null;
  /** What the names are set inside, for a pack that has a frame. */
  frame: PackOrnament | null;
  /** What stands in the side margins of the names' screen, for a pack that has one. */
  sides: PackOrnament | null;
}

const NOTHING: ChosenSlots = {
  top: null,
  aboveNames: null,
  corners: null,
  frame: null,
  sides: null,
};

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

  const [left = null, right = null] = chosenCorners(pack, enabled)
    .map((id) => pack.findOrnament(id))
    .filter((entry) => entry !== null);

  return {
    top: find(chosenIn(pack.slots.top, enabled)),
    aboveNames: find(chosenIn(pack.slots.aboveNames, enabled)),
    /* Two different ornaments each keep their own way round; one in both corners is turned on the right. */
    corners:
      left !== null && right !== null
        ? { left, right, mirrorRight: false }
        : left !== null
          ? { left, right: left, mirrorRight: left.uprightOnly !== true }
          : null,
    frame: find(chosenIn(pack.slots.frame ?? [], enabled)),
    sides: find(chosenIn(pack.slots.sides ?? [], enabled)),
  };
}

/**
 * The list after a tap on a slotted tile.
 *
 * A one-at-a-time slot: the tapped ornament replaces whatever was there, and
 * tapping the one already there takes it off. The corners hold two, so each
 * tile there is simply on or off; where a pack offers a third, switching it
 * on takes off the older of the two already there.
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
          : (slots.frame ?? []).includes(id)
            ? (slots.frame ?? [])
            : (slots.sides ?? []).includes(id)
              ? (slots.sides ?? [])
              : null;

  if (place === null) {
    const corners = slots?.corners ?? [];

    if (!corners.includes(id)) {
      return [...enabled, id];
    }

    /* Whichever corner ornament is not one of the two the card keeps goes. */
    const next = [...enabled, id];
    const kept = chosenCorners(pack, next);

    return next.filter((current) => !corners.includes(current) || kept.includes(current));
  }

  return [...enabled.filter((current) => !place.includes(current)), id];
}
