/**
 * Whether two values are the same value, rather than the same object.
 *
 * WHY THIS EXISTS. The editor has to know whether a host has actually changed
 * anything, and every control in it replaces state rather than mutating it: a
 * host who opens the palette list and re-picks the palette that was already
 * selected produces a brand new CardStyle object holding exactly the same
 * choices. Reference equality would call that an edit and put a "discard your
 * changes?" prompt in front of somebody who changed nothing.
 *
 * NOT JSON.stringify, which is the shorter version of this and the wrong one.
 * Two objects with the same entries in a different insertion order stringify
 * differently — and that is precisely the case here, because one side of the
 * comparison is a config the editor just built from an object literal and the
 * other is the same config parsed back out of a jsonb column, where the key
 * order is whatever the day it was saved happened to produce.
 *
 * A KEY HOLDING undefined EQUALS A MISSING KEY. The optional fields on
 * EventDraft — the parents' names, the cities — are absent from every draft
 * saved before they existed and `undefined` in a draft that has them empty.
 * Nothing renders either one, so nothing should call the difference an edit.
 *
 * Handles what the editor's state is made of: primitives, arrays, and plain
 * objects. Dates, Maps, Sets and class instances are not in a CardConfig or an
 * EventDraft, and this makes no promises about them.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) {
    return true;
  }

  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  ) {
    return false;
  }

  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }

    return a.every((item, index) => deepEqual(item, b[index]));
  }

  const left = a as Record<string, unknown>;
  const right = b as Record<string, unknown>;

  /* Absent and undefined are the same absence, so neither side sets a floor. */
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    if (!deepEqual(left[key], right[key])) {
      return false;
    }
  }

  return true;
}
