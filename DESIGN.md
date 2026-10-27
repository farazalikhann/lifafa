---
version: 1
name: Lifafa
description: A light, editorial landing page for Lifafa, digital wedding invitations with RSVP and a live headcount. Washi ivory paper, a deep emerald for the voice of the brand, gold only as a hairline, and one sindoor accent at most per section. Fraunces for headings, Manrope for everything else, Noto Sans Devanagari behind both so Hindi and the rupee sign always render.
scope: The home route (app/page.tsx) only. Every other page keeps its current dark theme until it is moved over on purpose.

colors:
  washi: "#F6EFE0"        # page background
  paper: "#FAF6EE"        # cards, table, accordion
  emerald: "#0E3B2B"      # primary buttons, the closing band, the highlighted column
  emerald-press: "#0A2C20"
  gold: "#B8893B"         # hairlines, ornaments, side patterns. Never text.
  gold-ink: "#7A5A1E"     # gold-toned text (eyebrows, small labels) on light grounds
  gold-soft: "#E7D3A6"    # gold-toned text on emerald
  sindoor: "#C8372D"      # one accent per section, at most
  ink: "#1E1B18"          # headings and body text
  ink-muted: "#5C534A"    # secondary text
  blush: "#E8C9C0"        # soft fills: icon wells, the Lifafa column tint
  on-emerald: "#F6EFE0"   # text on emerald

typography:
  display:
    fontFamily: "Fraunces, Georgia, 'Noto Sans Devanagari', serif"
    weights: [600, 700]
  body:
    fontFamily: "Manrope, system-ui, 'Noto Sans Devanagari', sans-serif"
    weights: [400, 500, 600, 700]
  h1:  { size: "clamp(2.375rem, 9vw, 4.25rem)", weight: 600, lineHeight: 1.06, tracking: "-0.025em" }
  h2:  { size: "clamp(1.875rem, 6.5vw, 3rem)",  weight: 600, lineHeight: 1.12, tracking: "-0.02em" }
  h3:  { size: "1.25rem to 1.5rem",            weight: 600, lineHeight: 1.25 }
  lead: { size: "1.0625rem to 1.25rem", weight: 400, lineHeight: 1.6 }
  body: { size: "1rem (16px) minimum", weight: 400, lineHeight: 1.6 }
  eyebrow: { size: "0.75rem", weight: 700, tracking: "0.22em", case: uppercase, color: gold-ink }
  small: { size: "0.875rem", weight: 500, lineHeight: 1.5 }

spacing:
  gutter-mobile: 20px
  gutter-tablet: 32px
  section-mobile: 72px
  section-desktop: 112px
  content-max: 1120px
  prose-max: 40rem

rounded:
  pill: 9999px
  card: 24px
  phone: 40px
  small: 12px
---

# Lifafa design system

## 1. Visual theme

Lifafa sells a celebration, so the page should feel like good stationery: a warm ivory sheet, generous margins, a serif that has some ink in it, and gold used the way a printer uses foil, as a thin line and never as a fill. Emerald is the voice of the brand. It colours the one button that matters, the closing band and the column of the comparison table that is Lifafa. Sindoor red is the bindi on the page: one small mark per section, never more.

The page is quiet and editorial rather than busy and promotional. There are no gradients behind text, no glows, no badges, no testimonials and no stock photography. The product itself, the invitation on a phone, is the picture.

Two Japanese patterns, seigaiha (waves) and asanoha (hemp leaf), run as faint vertical strips down the left and right edges on wider screens. They frame the page like the deckle of handmade paper and are never strong enough to read as decoration in their own right.

**Key characteristics**
- Washi ivory canvas (`washi`) with paper cards (`paper`) one step lighter.
- Emerald pill for the primary action, outline pill for the secondary. Nothing else is a button.
- Gold hairlines between sections and around cards. Gold is never used for text on ivory: it is 2.75:1 there. Use `gold-ink` for gold-toned text.
- Fraunces 600 to 700 for headings, Manrope 400 to 700 for body and UI.
- The invitation in a phone frame is the hero image of the page.

## 2. Colour palette and roles

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `washi` | #F6EFE0 | Page background | |
| `paper` | #FAF6EE | Cards, table, accordion rows | |
| `emerald` | #0E3B2B | Primary button fill, closing band, Lifafa column header | 10.9:1 with ivory |
| `gold` | #B8893B | Hairlines, ornaments, pattern strips, focus ring on emerald | 2.75:1 on washi: decoration only |
| `gold-ink` | #7A5A1E | Eyebrows, small gold-toned labels on light grounds | 5.5:1 on washi |
| `gold-soft` | #E7D3A6 | Gold-toned text on emerald | 8.5:1 on emerald |
| `sindoor` | #C8372D | A single accent per section: a step number, a check, a short rule | 4.5:1 on washi, 4.8:1 on paper |
| `ink` | #1E1B18 | Headings and body | 15:1 on washi |
| `ink-muted` | #5C534A | Secondary text, captions, table cells | 6.6:1 on washi |
| `blush` | #E8C9C0 | Soft fills: icon wells, the tint behind the Lifafa column | Ink on blush is 11:1 |

Rules
- Body text is `ink` or `ink-muted`, never lighter. Every text pairing meets WCAG AA (4.5:1) and most exceed AAA.
- Sindoor appears at most once in any section. If a second element wants it, it does not get it.
- Emerald fills are reserved for the primary button, the closing call to action band and the Lifafa column. A section is never painted emerald just for variety.
- Tokens live as CSS custom properties on `.lifafa-paper` in `app/globals.css` (`--paper-washi`, `--paper-emerald`, and so on). Components read them through Tailwind arbitrary values. Never inline a hex in a component.

## 3. Typography

- **Fraunces** (variable, already self-hosted by next/font as `--font-display`) for h1, h2, h3, template names and prices. Weight 600 by default, 700 for the hero heading if it needs more presence. Slight negative tracking at display sizes.
- **Manrope** (self-hosted by next/font as `--font-paper-sans`, landing page only) for body, buttons, table and FAQ. 400 for running text, 600 for buttons and labels, 700 for eyebrows.
- **Noto Sans Devanagari** (`--font-devanagari`) is the last family in both stacks. It carries Hindi and the rupee sign, so `₹699` renders in every browser even where the Latin face has no glyph for it.
- Body text is at least 16px on mobile with a line height of 1.6. Nothing a visitor needs to read is smaller than 14px.
- Headings use `text-wrap: balance`. Paragraphs are capped at about 60 characters.
- Prices are always read from `lib/pricing.ts` and written with `formatPrice` (`₹699`). Never type a price into copy.

## 4. Components

**Primary button** (`PAPER_PRIMARY`): emerald pill, ivory text, Manrope 600 16px, min height 48px, padding 0 28px. Hover lifts 2px with a transform. Pressed darkens to `emerald-press`. Focus ring 2px `emerald` offset 3px (on emerald grounds, the ring is `gold`).

**Secondary button** (`PAPER_SECONDARY`): transparent pill, 1.5px `emerald` border, emerald text, same size. Hover fills with emerald at 6 percent.

**On-emerald button**: the closing band inverts the primary button, ivory fill with emerald text, so it still reads as the one action.

**Eyebrow**: Manrope 700, 12px, 0.22em tracking, uppercase, `gold-ink`.

**Gold hairline divider** (`SectionRule`): a 1px `gold` line at 45 percent opacity, the width of the content column, with a small gold lozenge at its centre. Sits between sections.

**Card**: `paper` fill, 1px `gold` border at 35 percent, radius 24px, padding 24px to 32px, no shadow at rest.

**Phone frame**: radius 40px, 8px border in `ink`, a soft long shadow (`0 30px 60px -30px rgba(30,27,24,0.45)`), a small speaker slot drawn in CSS. Holds a template's poster or video at 9:19.5.

**Template carousel**: one row of phone frames with CSS scroll snap, previous and next buttons and a dot per slide. Auto-advances every 5 seconds; see section 7.

**Comparison table**: a real `<table>` on `paper`, three option columns after a row label column. The Lifafa column has a blush tint, an emerald header with ivory text and 600 weight cells. On a phone the table sits in its own horizontal scroll box with a sticky first column, so the page itself never scrolls sideways.

**Feature tile**: a Fluent 3D icon in a blush well, an h3 and one line of body copy.

**Pricing card**: `paper` card with collection name, the price in Fraunces 700, a short list and one button. The Premium card gets a 1.5px emerald border. No "most popular" badges.

**FAQ**: native `<details>` and `<summary>` rows on paper, separated by gold hairlines, with a plus that turns into a cross.

**Closing band**: full-width emerald, ivory heading, `gold-soft` small line, the inverted button.

## 5. Layout

- Content column max 1120px, centred, with 20px gutters on phones and 32px from 640px.
- Sections are separated by 72px on phones and 112px on desktop, with a gold hairline between most of them.
- Hero: centred copy on phones; on desktop the copy sits left and the carousel is directly under the hero, full width.
- Grids collapse by dropping columns, never by shrinking cards: features go 1, 2 then 3 across, how it works 1 then 3, pricing 1 then 2.
- The side pattern strips are absolutely positioned inside the page wrapper, so they scroll with the page. They are never fixed or sticky.

## 6. Depth

The page is almost flat. Depth comes from paper on paper (`paper` cards on `washi`) and gold hairlines, not shadows.

- Level 0: `washi` canvas.
- Level 1: `paper` card with a gold hairline border. No shadow.
- Level 2: the phone frame, the only element with a real shadow, because it is the only object on the page.
- Focus: a 2px outline, never a glow.

## 7. Motion

Motion follows the lifafa-motion rules: low-end Android first.

- Animate transform and opacity only. Nothing animates layout, box-shadow, filter or clip-path.
- The carousel auto-advances every 5 seconds. It pauses on touch, hover, focus or drag and resumes after 8 seconds without interaction. It also pauses while it is off screen (IntersectionObserver) or the tab is hidden. With `prefers-reduced-motion: reduce` it never auto-advances and no video autoplays.
- Only the centred slide plays its preview video (muted, inline, looped). Others show the poster. A video that fails falls back to the poster.
- Hover lifts are 2px transforms over 200ms, removed under reduced motion.

## 8. Do and Don't

**Do**
- Keep the page on `washi`, with `paper` for anything that holds content.
- Use one emerald pill per screen for the main action and an outline pill for the second.
- Read every price from `lib/pricing.ts`.
- Write plain, short English: "Choose a design", "Share one link".
- Keep gold to hairlines, ornaments and patterns.
- Keep side patterns at 10 to 15 percent opacity, `aria-hidden` and `pointer-events: none`.
- Show the product: an invitation on a phone.

**Don't**
- Don't set text in `gold` on a light ground. Use `gold-ink`.
- Don't use more than one sindoor accent in a section.
- Don't add testimonials, review stars, fake counters or a registered trademark symbol.
- Don't use emojis or em dashes in copy.
- Don't add a third button style, gradients behind text or decorative glows.
- Don't fix or stick the pattern strips to the viewport.
- Don't promise anything the product does not do. Check the policy pages and the code first.

## 9. Responsive rules

| Width | Changes |
|---|---|
| < 640px | One column. Pattern strips hidden. Hero centred. Carousel shows one phone with the next peeking. Comparison table in its own scroll box with a sticky first column. |
| 640 to 1023px | Pattern strips 28px wide. Features 2 across. Pricing 2 across. |
| >= 1024px | Pattern strips 64px wide. How it works 3 across, features 3 across. Carousel shows three phones, the centre one playing. |
| >= 1440px | Same as desktop, more side margin. Content never wider than 1120px. |

- Touch targets are at least 44 by 44px, buttons 48px tall.
- No horizontal page scroll at 360px. Anything wider scrolls inside its own box.
- Images are WebP, sized for where they are shown. Video is fetched only for the slide near view.

## 10. Agent guide

When changing the landing page:

1. Read this file and the lifafa-motion skill first.
2. Use the tokens on `.lifafa-paper` and the shared class strings in `components/landing/styles.ts`. Never inline a hex.
3. Prices come from `lib/pricing.ts` through `formatPrice`. Templates come from `listedPremium()` in `templates/premium.ts`, which leaves out anything not yet listed.
4. Keep sections as server components. Only the carousel and anything that truly needs state is a client component.
5. The Meta Pixel runs on `/` and must never run on `/i`, `/demo`, `/checkin` or `/admin`. Do not embed those routes in the landing page; use recorded previews instead. Run `npm run check:pixel` after any change.
6. Before claiming a feature in copy, confirm it in the code or on the policy pages (`app/terms`, `app/refunds`).
7. Preview videos are recorded with `npm run previews:record` (see `scripts/record-previews.mjs`). Re-record when a premium template's opening changes.
8. Check 360, 390 and 1440 widths, reduced motion, and keyboard focus through the carousel before committing.
