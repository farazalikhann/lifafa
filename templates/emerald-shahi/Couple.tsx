"use client";

import type { CSSProperties, ReactElement } from "react";
import { cardCopy } from "@/lib/cardLanguage";
import { coupleOf, familyBlocks, type FamilyBlock } from "@/lib/cardSections";
import Slide from "@/templates/emerald-shahi/Slide";
import styles from "@/templates/emerald-shahi/emerald.module.css";
import { useEnter } from "@/templates/emerald-shahi/useEnter";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/**
 * "Meet the Couple": two dark emerald cards under a thin gold line, the groom
 * and then the bride, with a gold "&" between them.
 *
 * Each card has its figure in gold line against one edge, a third of its ink
 * and faded out by the card's foot, and the words on the other side: the name
 * in script, whose child they are, and where they are from. The groom's figure
 * is on the left and his card comes in from the left; the bride's is on the
 * right and hers comes in from the right.
 *
 * WHO IS WHO. The first name on the card is the groom and the second the
 * bride, which is the order the editor asks for them in and the order the
 * card's own "Son of" and "Daughter of" already follow.
 *
 * A card that names one person, or an occasion that is not a couple's, gets
 * the same card for whoever has parents or a home town written, with no
 * figure: the two drawings are a bride and a groom and nobody else.
 */
export default function EmeraldShahiCouple({
  draft,
  occasionId,
  language,
  namesFont,
  headingFont,
  bodyFont,
}: {
  draft: EventDraft;
  occasionId: OccasionId;
  language: CardLanguage;
  namesFont: CSSProperties;
  headingFont: CSSProperties;
  bodyFont: CSSProperties;
}): ReactElement | null {
  const heading = useEnter<HTMLDivElement>();
  const first = useEnter<HTMLDivElement>();
  const second = useEnter<HTMLDivElement>();
  const copy = cardCopy(language);
  const couple = coupleOf(draft, occasionId);
  const people = couple ?? familyBlocks(draft);

  if (people.length === 0) {
    return null;
  }

  /* "S/O" and "D/O" as an Indian card prints them; Hindi has its own words. */
  const childOf = (key: FamilyBlock["key"]): string =>
    language === "hi"
      ? key === "one"
        ? copy.family.sonOf
        : copy.family.daughterOf
      : key === "one"
        ? "S/O"
        : "D/O";

  const card = (person: FamilyBlock, entered: boolean): ReactElement => {
    /* By who they are, not by where they come in the list: a card can name the second alone. */
    const side = person.key === "one" ? "left" : "right";
    const figured = couple !== null;

    return (
      <Slide
        as="article"
        entered={entered}
        from={side}
        className={`${styles.person} flex w-full items-center`}
      >
        {figured ? (
          <span
            aria-hidden="true"
            className={`${styles.figure} ${
              side === "left" ? styles.figureGroom : styles.figureBride
            }`}
          />
        ) : null}

        <div
          className={`relative flex min-w-0 flex-col gap-[calc(0.3*var(--es))] py-[calc(1.1*var(--es))] ${
            !figured
              ? "w-full items-center px-5 text-center"
              : side === "left"
                ? "ml-auto w-[58%] items-end pr-[calc(1.1*var(--es))] text-right"
                : "mr-auto w-[58%] items-start pl-[calc(1.1*var(--es))] text-left"
          }`}
        >
          {person.name !== null ? (
            <h3
              className={`${styles.script} max-w-full wrap-anywhere`}
              style={{
                ...namesFont,
                fontSize: "calc(1.9 * var(--es))",
                lineHeight: language === "hi" ? 1.5 : 1.2,
              }}
            >
              {person.name}
            </h3>
          ) : null}

          {person.parents !== null ? (
            <>
              <p className={styles.caps} style={headingFont}>
                {childOf(person.key)}
              </p>
              <p
                className="max-w-full text-[calc(0.86*var(--es))] leading-snug wrap-anywhere"
                style={{ ...bodyFont, color: "var(--es-ivory)" }}
              >
                {person.parents}
              </p>
            </>
          ) : null}

          {person.city !== null ? (
            <p
              className="max-w-full text-[calc(0.8*var(--es))] wrap-anywhere"
              style={{ ...bodyFont, color: "var(--es-gold)" }}
            >
              {person.city}
            </p>
          ) : null}
        </div>
      </Slide>
    );
  };

  return (
    <section className="mx-auto flex w-full max-w-[26rem] flex-col items-center gap-[calc(1.1*var(--es))] px-5 py-[calc(3.5*var(--es))]">
      <div ref={heading.ref} className="w-full text-center">
        <Slide as="h2" entered={heading.entered} from="left">
          <span className={styles.caps} style={headingFont}>
            {copy.family.heading}
          </span>
        </Slide>
      </div>

      <div ref={first.ref} className="w-full">
        {card(people[0], first.entered)}
      </div>

      {people.length > 1 ? (
        <>
          <Slide
            as="p"
            entered={first.entered}
            from="right"
            order={2}
            style={{
              ...headingFont,
              color: "var(--es-gold)",
              fontSize: "calc(1.5 * var(--es))",
              lineHeight: 1,
            }}
          >
            &amp;
          </Slide>

          <div ref={second.ref} className="w-full">
            {card(people[1], second.entered)}
          </div>
        </>
      ) : null}
    </section>
  );
}
