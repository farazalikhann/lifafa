"use client";

import type { CSSProperties, ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { coupleOf, familyBlocks, type FamilyBlock } from "@/lib/cardSections";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  lineDelay,
  revealClass,
} from "@/lib/cardFormat";
import { cardCopy, type CardCopy } from "@/lib/cardLanguage";
import { cardPx } from "@/lib/cardScale";
import {
  COUPLE_CORNER,
  COUPLE_GOLD,
  COUPLE_MONOGRAM,
  COUPLE_PANEL,
  coupleAmpersand,
  coupleFigure,
  coupleInks,
  type CoupleInks,
  type CoupleRole,
} from "@/lib/coupleCard";
import { textRoles, type Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId, TraditionId } from "@/types/occasion";

/**
 * "Meet the Couple": the two people the card is for, each on a card of their
 * own — the name, whose son or daughter they are, where they are from, and a
 * figure in their tradition's dress beside it.
 *
 * This is the section that used to be "Families". It was a list: a name, the
 * parents under it, a city. On a card for a couple it is two cards now, and it
 * is drawn whenever the card names two people, parents or no parents, so the
 * names the cover sets are met again here as people. Nothing a host wrote has
 * gone anywhere: the same six fields are read, and a card saved before this
 * shows them in the new section without being touched.
 *
 * A card for one person — a birthday, a housewarming — is not a couple, and
 * keeps the list it had, shown as before only when there are parents or a
 * city to show. See `coupleOf` and `familyBlocks` in lib/cardSections.ts.
 *
 * THE FIRST CARD IS THE GROOM'S AND THE SECOND THE BRIDE'S, which is the order
 * the form asks for them in and the order the cover sets them. That is what
 * decides "Son of" and "Daughter of" and which figure each card carries.
 * Nothing is inferred from a name.
 *
 * THE FIGURES ARE FIXED: one pair to a tradition, chosen by the card's
 * tradition and by nothing else, and there is no photograph to upload. They
 * are seen from behind, on white, and laid on the ivory panel with `multiply`,
 * so the white is the panel. A host who would rather have none switches the
 * illustration off, and each card carries its person's initial in a round
 * gold frame instead.
 *
 * EACH CARD ARRIVES FROM ITS OWN SIDE, once: the groom's from the left and the
 * bride's from the right, when about a third of it is in view. Transform and
 * opacity only; under reduced motion they are simply there.
 */

/** How far a card travels in from its side, in px. */
const SLIDE_PX = 44;
const SLIDE_MS = 700;

/** One corner of a card: the same flowers, turned to face in from each. */
const CORNERS: readonly { at: CSSProperties; flip: string }[] = [
  { at: { top: 0, left: 0 }, flip: "none" },
  { at: { top: 0, right: 0 }, flip: "scaleX(-1)" },
  { at: { bottom: 0, left: 0 }, flip: "scaleY(-1)" },
  { at: { bottom: 0, right: 0 }, flip: "scale(-1, -1)" },
];

/** The first letter of a name, as the monogram sets it. */
function initialOf(name: string): string {
  const first = Array.from(name.replace(/[^\p{L}\p{N}]/gu, ""))[0];
  return first === undefined ? "" : first.toUpperCase();
}

/**
 * Whether the host already wrote whose child this is. Some type "S/o Mr …"
 * into the parents' field; the card's own "Son of" over that would say it
 * twice.
 */
function saysRelation(parents: string): boolean {
  const text = parents.trim().toLowerCase();

  return [
    "son of",
    "daughter of",
    "s/o",
    "d/o",
    "सुपुत्र",
    "पुत्र",
    "सुपुत्री",
    "पुत्री",
  ].some((opening) => text.startsWith(opening));
}

function Pin({ color }: { color: string }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 12 16"
      className="h-[0.95em] w-[0.72em] shrink-0"
      style={{ color }}
    >
      <path
        d="M6 0.8 C3.1 0.8 0.9 3 0.9 5.8 C0.9 9.4 6 15.2 6 15.2 C6 15.2 11.1 9.4 11.1 5.8 C11.1 3 8.9 0.8 6 0.8 Z"
        fill="currentColor"
      />
      <circle cx="6" cy="5.8" r="1.9" fill={COUPLE_PANEL} />
    </svg>
  );
}

function CoupleCard({
  person,
  role,
  traditionId,
  illustration,
  inks,
  copy,
}: {
  person: FamilyBlock;
  role: CoupleRole;
  traditionId: TraditionId;
  illustration: boolean;
  inks: CoupleInks;
  copy: CardCopy;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLDivElement>({
    threshold: 0.3,
    rootMargin: "0px",
  });
  /* The groom's figure stands on the left of his card, the bride's on the right of hers. */
  const figureFirst = role === "groom";
  const devanagari = copy.script === "devanagari";
  const name = person.name ?? "";
  const relation = role === "groom" ? copy.family.sonOf : copy.family.daughterOf;

  const picture = illustration ? (
    <img
      src={coupleFigure(traditionId, role)}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      /*
        As tall as the card allows and as wide as that makes it, never more
        than two fifths of the card: a lehenga is three times the width of a
        sherwani at the same height.
      */
      className="h-[52cqw] max-h-[14rem] w-auto max-w-[40cqw] shrink-0 object-contain object-bottom select-none @max-[17.5rem]:h-[58cqw] @max-[17.5rem]:max-w-[70cqw]"
      /* White is the panel: nothing of the picture's own ground is left to see. */
      style={{ mixBlendMode: "multiply" }}
    />
  ) : (
    <span className="relative flex aspect-square w-[38cqw] max-w-[9.5rem] shrink-0 items-center justify-center @max-[17.5rem]:w-[46cqw]">
      <img
        src={COUPLE_MONOGRAM}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full select-none"
      />
      <span
        aria-hidden="true"
        className="relative text-[13cqw] leading-none @max-[17.5rem]:text-[16cqw]"
        style={{
          color: COUPLE_GOLD,
          fontFamily: "var(--card-heading)",
          fontWeight: "var(--card-heading-weight)" as unknown as number,
        }}
      >
        {initialOf(name)}
      </span>
    </span>
  );

  return (
    <div
      ref={ref}
      className="@container w-full motion-reduce:transition-none"
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView
          ? "translate3d(0, 0, 0)"
          : `translate3d(${figureFirst ? -SLIDE_PX : SLIDE_PX}px, 0, 0)`,
        transition: `opacity ${SLIDE_MS}ms ease-out, transform ${SLIDE_MS}ms cubic-bezier(0.2, 0.7, 0.2, 1)`,
      }}
    >
      {/*
        The panel. `isolate`, so the figure is multiplied onto the ivory and
        onto nothing behind the card. The double border is two gold lines with
        the ivory between them, drawn as shadows so they follow the rounding.
      */}
      <div
        className="relative isolate overflow-hidden rounded-[1.15rem]"
        style={{
          backgroundColor: COUPLE_PANEL,
          boxShadow: `inset 0 0 0 1px ${COUPLE_GOLD}, inset 0 0 0 4px ${COUPLE_PANEL}, inset 0 0 0 5px ${COUPLE_GOLD}99, 0 10px 26px -18px rgba(58, 30, 8, 0.45)`,
        }}
      >
        {CORNERS.map((corner) => (
          <img
            key={corner.flip}
            src={COUPLE_CORNER}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            draggable={false}
            /* About 64px on a 390px phone, and the same share of the card at any size. */
            className="pointer-events-none absolute h-auto w-[19cqw] max-w-none select-none"
            style={{ ...corner.at, transform: corner.flip }}
          />
        ))}

        {/*
          Inset by more than the corners' own reach: two thirds of a corner top
          and bottom, where the flowers are deepest (they fill about half of
          it, and a script's ascenders stand above their own line), and two
          fifths either side, where only the vine runs. Nothing set in here is
          under a petal, however many lines a long name takes.
        */}
        <div
          className={`relative flex items-center gap-[4cqw] px-[8cqw] py-[13cqw] @max-[17.5rem]:flex-col ${
            figureFirst ? "flex-row" : "flex-row-reverse"
          }`}
        >
          {picture}

          <div className="flex min-w-0 flex-1 flex-col items-center gap-[1.6cqw] text-center">
            <p
              className={`max-w-full text-[calc(1.7*var(--card-rem,1rem)*var(--card-names-scale,1))] break-words text-balance ${
                devanagari ? "leading-[1.45]" : ""
              }`}
              style={{
                color: inks.primary,
                fontFamily: "var(--card-names)",
                fontWeight: "var(--card-names-weight)" as unknown as number,
                lineHeight: devanagari ? undefined : "var(--card-names-leading)",
                letterSpacing: "var(--card-names-tracking)",
                wordSpacing: "var(--card-names-word-spacing)",
              }}
            >
              {name}
            </p>

            {person.parents !== null ? (
              <>
                {saysRelation(person.parents) ? null : (
                  <p
                    className={`text-[0.75rem] ${
                      devanagari ? "leading-[1.5]" : "ps-[0.2em] leading-[1.4] tracking-[0.2em] uppercase"
                    }`}
                    style={{ color: inks.secondary }}
                  >
                    {relation}
                  </p>
                )}
                <p
                  className={`max-w-full text-[0.875rem] break-words text-pretty ${
                    devanagari ? "leading-[1.55]" : "leading-snug"
                  }`}
                  style={{ color: inks.secondary }}
                >
                  {person.parents}
                </p>
              </>
            ) : null}

            {person.city !== null ? (
              <p
                className={`mt-[0.6cqw] flex max-w-full items-center justify-center gap-1.5 text-[0.75rem] break-words ${
                  devanagari ? "leading-[1.5]" : "leading-[1.4] tracking-[0.12em] uppercase"
                }`}
                style={{ color: inks.secondary }}
              >
                <Pin color={COUPLE_GOLD} />
                <span className="min-w-0">{person.city}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FamilySection({
  draft,
  theme,
  minHeight,
  pad,
  occasionId,
  traditionId,
  language,
  illustration,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
  /** Decides whether the card is for a couple at all. */
  occasionId: OccasionId;
  /** Whose dress the figures wear. */
  traditionId: TraditionId;
  language: CardLanguage;
  /** The figures, or with them off the monogram. */
  illustration: boolean;
}): ReactElement | null {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);

  const couple = coupleOf(draft, occasionId);
  const blocks = couple === null ? familyBlocks(draft) : [];

  if (couple === null && blocks.length === 0) {
    return null;
  }

  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  if (couple !== null) {
    const copy = cardCopy(language);
    const inks = coupleInks(theme);

    return (
      <section
        ref={ref}
        className="flex flex-col items-center justify-center px-7 text-center"
        style={{
          minHeight,
          paddingTop: cardPx(pad),
          paddingBottom: cardPx(pad),
          gap: `calc(0.9 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))`,
        }}
      >
        <div className={reveal} style={lineDelay(0)}>
          <h3
            className={`text-[calc(2*var(--card-rem,1rem)*var(--card-names-scale,1))] text-balance ${
              copy.script === "devanagari" ? "leading-[1.45]" : "leading-[1.15]"
            }`}
            style={{
              color: textRoles(theme).heading,
              fontFamily: "var(--card-names)",
              fontWeight: "var(--card-names-weight)" as unknown as number,
            }}
          >
            {copy.family.heading}
          </h3>
        </div>

        <CoupleCard
          person={couple[0]}
          role="groom"
          traditionId={traditionId}
          illustration={illustration}
          inks={inks}
          copy={copy}
        />

        <div className={reveal} style={lineDelay(1)}>
          <p
            aria-hidden="true"
            className="text-[calc(1.9*var(--card-rem,1rem))] leading-none"
            style={{
              color: coupleAmpersand(theme),
              fontFamily: "var(--card-heading)",
              fontStyle: "italic",
            }}
          >
            &amp;
          </p>
        </div>

        <CoupleCard
          person={couple[1]}
          role="bride"
          traditionId={traditionId}
          illustration={illustration}
          inks={inks}
          copy={copy}
        />
      </section>
    );
  }

  /* A card for one person: the list it always was. */
  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: cardPx(pad),
        paddingBottom: cardPx(pad),
        gap: `calc(2 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))`,
      }}
    >
      {blocks.map((block, index) => (
        <div
          key={block.key}
          className={`flex flex-col items-center gap-1.5 ${reveal}`}
          style={lineDelay(index * 2)}
        >
          {block.name !== null ? (
            /*
              In the pair's names face, the one the cover sets them in. A
              script at this size is still a name and not a paragraph: it is
              given the face's own scale, leading and word spacing, and allowed
              to wrap.
            */
            <p
              className="max-w-full text-[calc(1.75*var(--card-rem,1rem)*var(--card-names-scale,1))] break-words text-balance"
              style={{
                color: theme.textPrimary,
                fontFamily: "var(--card-names)",
                fontWeight: "var(--card-names-weight)" as unknown as number,
                lineHeight: "var(--card-names-leading)",
                letterSpacing: "var(--card-names-tracking)",
                wordSpacing: "var(--card-names-word-spacing)",
              }}
            >
              {block.name}
            </p>
          ) : null}

          {block.parents !== null ? (
            <p
              className="max-w-[30ch] text-[calc(0.9375*var(--card-rem,1rem))] leading-relaxed break-words text-pretty"
              style={{ color: textRoles(theme).detail }}
            >
              {block.parents}
            </p>
          ) : null}

          {block.city !== null ? (
            <p
              className="text-[calc(0.8125*var(--card-rem,1rem))] tracking-[0.14em] uppercase"
              style={{ color: theme.textMuted }}
            >
              {block.city}
            </p>
          ) : null}
        </div>
      ))}
    </section>
  );
}
