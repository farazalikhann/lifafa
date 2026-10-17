"use client";

import { useRef, type CSSProperties, type ReactElement } from "react";
import { cardCopy } from "@/lib/cardLanguage";
import { coupleOf, familyBlocks, type FamilyBlock } from "@/lib/cardSections";
import { ART, TAG_ASPECT, TAG_BOX, TAG_PIVOT } from "@/templates/gulab-mahal/art";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import GulabPage from "@/templates/gulab-mahal/Page";
import { scriptLeading, type GulabFonts } from "@/templates/gulab-mahal/shared";
import { useFitInside } from "@/templates/gulab-mahal/useFitInside";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { OccasionId } from "@/types/occasion";

/* A tap's swing: out and back, smaller each way, about the ribbon's top. */
const KICK: Keyframe[] = [
  { transform: "rotate(0deg)" },
  { transform: "rotate(9deg)", offset: 0.14 },
  { transform: "rotate(-7deg)", offset: 0.34 },
  { transform: "rotate(4.5deg)", offset: 0.54 },
  { transform: "rotate(-2.5deg)", offset: 0.72 },
  { transform: "rotate(1deg)", offset: 0.87 },
  { transform: "rotate(0deg)" },
];

const pc = (share: number): string => `${(share * 100).toFixed(1)}%`;

/** One tag on its ribbon: dropped in, swaying, and swung harder when tapped. */
function Tag({
  person,
  side,
  order,
  language,
  fonts,
}: {
  person: FamilyBlock;
  /** Left for the groom; right for the bride, whose tag is the picture turned over. */
  side: "left" | "right" | "middle";
  order: number;
  language: CardLanguage;
  fonts: GulabFonts;
}): ReactElement {
  const copy = cardCopy(language);
  const kickRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLDivElement>(null);

  useFitInside(
    boxRef,
    wordsRef,
    `${person.name ?? ""}|${person.parents ?? ""}|${person.city ?? ""}|${language}`,
  );

  /* "Son of" for the first named, the groom; "Daughter of" for the second, the bride. */
  const childOf = person.key === "one" ? copy.family.sonOf : copy.family.daughterOf;

  return (
    <div
      className={`${styles.tagHang} ${styles.tagDrop}`}
      style={{ "--gm-delay": `${order * 160}ms` } as CSSProperties}
    >
      {/* The sway at rest, about the ribbon's top; out of step with the other tag. */}
      <div
        className={styles.tagSway}
        style={{ animationDelay: `${order === 1 ? -1.7 : 0}s` } as CSSProperties}
      >
        <div
          ref={kickRef}
          className={styles.tagKick}
          style={{ "--gm-delay": `${order * 160 + 380}ms` } as CSSProperties}
          onClick={() => {
            kickRef.current?.animate(KICK, { duration: 2200, easing: "ease-in-out" });
          }}
        >
          <span aria-hidden="true" className={styles.tagRibbon} />
          <div className={styles.tag} style={{ aspectRatio: String(TAG_ASPECT) }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ART.coupleTag}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className={`${styles.tagArt} ${side === "right" ? styles.tagArtTurned : ""}`}
            />
            <div
              ref={boxRef}
              className={styles.tagBox}
              style={{
                top: pc(TAG_BOX.top),
                bottom: pc(TAG_BOX.bottom),
                left: pc(TAG_BOX.side),
                right: pc(TAG_BOX.side),
              }}
            >
              <div ref={wordsRef} className={styles.tagWords}>
                {person.name !== null ? (
                  <h3
                    className={`${styles.script} ${styles.tagName}`}
                    style={{ ...fonts.names, lineHeight: scriptLeading(language) }}
                  >
                    {person.name}
                  </h3>
                ) : null}
                {person.parents !== null ? (
                  <>
                    <p className={`${styles.caps} ${styles.tagChildOf}`} style={fonts.heading}>
                      {childOf}
                    </p>
                    <p className={`${styles.tagParents} wrap-anywhere`} style={fonts.body}>
                      {person.parents}
                    </p>
                  </>
                ) : null}
                {person.city !== null ? (
                  <p className={`${styles.tagCity} wrap-anywhere`} style={fonts.italic(language)}>
                    {person.city}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Page 4: the couple, on two tags hanging from ribbons at the top of the
 * page, the groom's on the left and the bride's on the right, a rose-gold "&"
 * between them.
 *
 * Each tag is the one picture, the bride's turned over (her words are not):
 * on it, under its roses and inside its border (TAG_BOX, measured off the
 * picture), the name in wine script, "Son of" or "Daughter of" and the
 * parents, and the home town if there is one; a long name or a Hindi one
 * shrinks to fit, and a name with nothing under it is set in the middle.
 *
 * THE SWING, about the top of each ribbon: the tags drop in from above on a
 * spring and swing to rest; at rest they sway by about two degrees, out of
 * step with each other; a tap swings a tag harder, and it settles. All of it
 * rotation; the sway is held while the page is off the screen.
 *
 * Who is who is the card's own: `coupleOf` for a couple, `familyBlocks` for
 * anyone else with parents or a town written.
 */
export default function GulabTagsPage({
  draft,
  occasionId,
  language,
  fonts,
}: {
  draft: EventDraft;
  occasionId: OccasionId;
  language: CardLanguage;
  fonts: GulabFonts;
}): ReactElement | null {
  const copy = cardCopy(language);
  const people = coupleOf(draft, occasionId) ?? familyBlocks(draft);

  if (people.length === 0) {
    return null;
  }

  return (
    <GulabPage label={copy.family.heading} images={[ART.coupleTag]}>
      <div
        className={styles.tags}
        style={{ "--tag-aspect": String(TAG_ASPECT), "--tag-pivot": String(TAG_PIVOT) } as CSSProperties}
      >
        {people.length > 1 ? (
          <>
            <Tag person={people[0]} side="left" order={0} language={language} fonts={fonts} />
            <span
              aria-hidden="true"
              className={`${styles.tagsAnd} ${styles.lineUp}`}
              style={{ ...fonts.names, "--gm-delay": "700ms" } as CSSProperties}
            >
              &amp;
            </span>
            <Tag person={people[1]} side="right" order={1} language={language} fonts={fonts} />
          </>
        ) : (
          <Tag person={people[0]} side="middle" order={0} language={language} fonts={fonts} />
        )}
      </div>
    </GulabPage>
  );
}
