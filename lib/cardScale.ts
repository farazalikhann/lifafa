import type { CSSProperties } from "react";

/**
 * How the guest's card grows past its phone width on a tablet or a laptop.
 *
 * THE PROBLEM IT SOLVES. The card was pinned at 420px on every screen, so on an
 * iPad it was a phone-width column in the middle of a wide empty page, with the
 * border framing only that column. Widening the box alone would have left
 * phone-sized type floating in it, so everything that sets the card's size
 * has to grow with it: the type, the gaps, the ornaments and the padding that
 * keeps text clear of them.
 *
 * THE MECHANISM. From 768px up, a card marked `.lifafa-card-fluid` fills the
 * screen, sets its text in a centred column, and publishes two lengths in
 * globals.css:
 *
 *   --card-rem   what 1rem is on this card: the type and the spacing
 *   --card-px    what 1px is on this card: the ornaments, and the room the
 *                card leaves to clear one
 *
 * Each is a width over the 420px design width, so every size written against
 * `--card-rem` grows by one factor and the hierarchy between all of them is
 * exactly what it was at 420px, and every size written against `--card-px`
 * grows by the other. They are two numbers rather than one because the type
 * could otherwise barely grow at all; globals.css has the arithmetic. Every
 * size that should grow reads one of the two with the plain unit as its
 * fallback — `calc(2.75 * var(--card-rem, 1rem))`.
 *
 * WHY THE FALLBACK IS THE WHOLE SAFETY STORY. Below 768px, and on every card
 * that is not the guest's (the editor's frame and its full screen preview),
 * neither variable exists, so each size computes to exactly the value it had
 * before any of this: `calc(2.75 * 1rem)` is 44px just as `2.75rem` is. The
 * phone card is not a second code path that could drift from this one.
 *
 * TWO THINGS DO NOT GO THROUGH THESE HELPERS:
 *
 *  - Tailwind's named utilities (`px-7`, `gap-4`, `h-9`, `text-xs`). Tailwind
 *    compiles those to `var(--spacing)` and `var(--text-xs)`, and globals.css
 *    redefines both inside a fluid card, so they scale without being touched.
 *
 *  - Artwork sized by a `width` attribute: ornaments, motifs, butterflies. Those
 *    carry a rounded attribute that a CSS length could not reproduce exactly,
 *    so they are left alone and overridden from 768px up instead — see
 *    `artWidth` below.
 */

/**
 * A length in the card's own pixels: `value`px at 420px wide, more on a wider
 * card. The ornament scale — use it for artwork and for anything that exists
 * to keep clear of some.
 */
export function cardPx(value: number): string {
  return `calc(${value} * var(--card-px, 1px))`;
}

/** A length in the card's own rems: `value`rem at 420px wide, more on a wider card. */
export function cardRem(value: number): string {
  return `calc(${value} * var(--card-rem, 1rem))`;
}

/**
 * The inline style that lets a piece of artwork grow with a fluid card.
 *
 * Spread onto the element wrapping an `<img>` or `<svg>`, alongside the
 * `lifafa-card-art` class. From 768px up, globals.css sizes that child to this
 * many card pixels wide and lets its height follow its own aspect ratio. Below
 * that the rule does not exist and the child keeps its own width and height
 * attributes, byte for byte.
 *
 * `width` is the rendered width at 420px, in px, which for most ornaments is
 * not their `size`: `size` measures the longer side.
 */
export function artWidth(width: number): CSSProperties {
  return {
    "--art-width": String(Math.round(width * 100) / 100),
  } as CSSProperties;
}
