"use client";

import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
  type RefObject,
} from "react";
import { cardCopy } from "@/lib/cardLanguage";
import { coupleOf, familyBlocks, type FamilyBlock } from "@/lib/cardSections";
import { ART, TAG_ASPECT, TAG_BOX, TAG_PIVOT } from "@/templates/gulab-mahal/art";
import styles from "@/templates/gulab-mahal/gulab.module.css";
import { Foil, Shadow } from "@/templates/gulab-mahal/Decor";
import GulabPage from "@/templates/gulab-mahal/Page";
import { scriptLeading, type GulabFonts } from "@/templates/gulab-mahal/shared";
import { fitInside } from "@/templates/gulab-mahal/useFitInside";
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

/* A name's largest size, as a share of the tag's type, and how small it may go on one line before both may take two. */
const NAME_MAX = 1.92;
const ONE_LINE_FLOOR = 0.62;
const TWO_LINE_FLOOR = 0.4;
/* What a name is measured at; any size will do, as width goes with size. */
const MEASURE_PX = 100;

const pc = (share: number): string => `${(share * 100).toFixed(1)}%`;

interface TagParts {
  box: HTMLDivElement | null;
  words: HTMLDivElement | null;
  name: HTMLHeadingElement | null;
}

/** How wide `text` is in `like`'s face at MEASURE_PX, by a hidden copy. */
function widthOf(text: string, like: HTMLElement): number {
  const probe = document.createElement("span");
  const style = getComputedStyle(like);
  probe.textContent = text;
  probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font-family:${style.fontFamily};font-weight:${style.fontWeight};font-style:${style.fontStyle};letter-spacing:${style.letterSpacing};font-size:${MEASURE_PX}px`;
  like.parentElement?.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

/**
 * The names on the tags, at one size, and the rest of each tag fitted under.
 *
 * BOTH NAMES THE SAME SIZE: the largest at which the longer one still fits
 * on one line, so neither wraps while the other does not. Only when that
 * would be smaller than ONE_LINE_FLOOR of the tag's own size may names take
 * two lines, at the size where both fit in two and no single word is wider
 * than the tag. Then each tag's other lines are stepped down to fit what is
 * left (fitInside); the names are in px and keep their size.
 *
 * Read and written before the first paint, and again when the tags change
 * size or the fonts arrive; never while anything moves.
 */
function useNamesAlike(parts: RefObject<TagParts[]>, key: string): void {
  useLayoutEffect(() => {
    let live = true;

    const fit = (): void => {
      const tags = parts.current.filter(
        (tag): tag is { box: HTMLDivElement; words: HTMLDivElement; name: HTMLHeadingElement | null } =>
          tag.box !== null && tag.words !== null,
      );

      if (!live || tags.length === 0) {
        return;
      }

      for (const tag of tags) {
        tag.words.style.fontSize = "1em";
      }

      const room = tags[0].box.clientWidth;
      const largest = parseFloat(getComputedStyle(tags[0].box).fontSize) * NAME_MAX;
      const named = tags.flatMap((tag) => (tag.name !== null ? [tag.name] : []));

      if (named.length > 0 && room > 0) {
        /* The size each name fits one line at, and the size its longest word fits at. */
        /* The name itself, from its mark: the element holds it twice, for its light. */
        const textOf = (name: HTMLElement): string => name.dataset.name ?? name.textContent ?? "";
        const oneLine = named.map((name) => (room / Math.max(1, widthOf(textOf(name), name))) * MEASURE_PX);
        const longestWord = named.map((name) => {
          const words = textOf(name).split(/\s+/).filter((word) => word.length > 0);
          const widest = Math.max(1, ...words.map((word) => widthOf(word, name)));
          return (room / widest) * MEASURE_PX;
        });

        const shared = Math.min(...oneLine);
        const onOneLine = shared >= largest * ONE_LINE_FLOOR;
        const size = onOneLine
          ? Math.min(largest, shared)
          : Math.max(
              largest * TWO_LINE_FLOOR,
              Math.min(largest, ...oneLine.map((size) => size * 1.85), ...longestWord),
            );

        for (const name of named) {
          name.style.fontSize = `${(size * 0.98).toFixed(2)}px`;
          name.style.whiteSpace = onOneLine ? "nowrap" : "normal";
        }
      }

      for (const tag of tags) {
        fitInside(tag.box, tag.words);
      }
    };

    fit();

    const first = parts.current[0]?.box ?? null;
    const observer = typeof ResizeObserver === "function" && first !== null ? new ResizeObserver(fit) : null;

    if (first !== null) {
      observer?.observe(first);
    }

    void document.fonts?.ready.then(fit);

    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [parts, key]);
}

/** One tag on its ribbon: dropped in, swaying, and swung harder when tapped. */
function Tag({
  person,
  side,
  order,
  language,
  fonts,
  register,
}: {
  person: FamilyBlock;
  /** Left for the groom; right for the bride, whose tag is the picture turned over. */
  side: "left" | "right" | "middle";
  order: number;
  language: CardLanguage;
  fonts: GulabFonts;
  register: TagParts;
}): ReactElement {
  const copy = cardCopy(language);
  const kickRef = useRef<HTMLDivElement>(null);

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
            <Shadow src={ART.shadow.tag} aspect={TAG_ASPECT} className={side === "right" ? styles.tagArtTurned : ""} />
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
              ref={(element) => {
                register.box = element;
              }}
              className={styles.tagBox}
              style={{
                top: pc(TAG_BOX.top),
                bottom: pc(TAG_BOX.bottom),
                left: pc(TAG_BOX.side),
                right: pc(TAG_BOX.side),
              }}
            >
              <div
                ref={(element) => {
                  register.words = element;
                }}
                className={styles.tagWords}
              >
                {person.name !== null ? (
                  <h3
                    ref={(element) => {
                      register.name = element;
                    }}
                    data-name={person.name}
                    className={`${styles.script} ${styles.tagName}`}
                    style={{ ...fonts.names, lineHeight: scriptLeading(language) }}
                  >
                    <Foil text={person.name} />
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
 * Page 4: the couple, on two tags hanging from ribbons that come down from
 * the top of the page, the groom's on the left and the bride's on the right,
 * a rose-gold "&" between them; in the middle of the page, with room to the
 * screen's edges and the page dots.
 *
 * Each tag is the one picture, the bride's turned over (her words are not):
 * on it, under its roses and inside its border (TAG_BOX, measured off the
 * picture), the name in wine script, "Son of" or "Daughter of" and the
 * parents, and the home town if there is one. The two names are set at one
 * size (useNamesAlike), in rose-gold foil; a name with nothing under it is set
 * in the middle. Each tag has its soft shadow under it, swinging with it.
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
  const parts = useRef<TagParts[]>([
    { box: null, words: null, name: null },
    { box: null, words: null, name: null },
  ]);

  useNamesAlike(
    parts,
    `${people.map((person) => `${person.name ?? ""}|${person.parents ?? ""}|${person.city ?? ""}`).join("||")}|${language}`,
  );

  if (people.length === 0) {
    return null;
  }

  return (
    <GulabPage label={copy.family.heading} images={[ART.coupleTag, ART.shadow.tag]} variant={2}>
      <div
        className={styles.tags}
        style={{ "--tag-aspect": String(TAG_ASPECT), "--tag-pivot": String(TAG_PIVOT) } as CSSProperties}
      >
        {people.length > 1 ? (
          <>
            <Tag person={people[0]} side="left" order={0} language={language} fonts={fonts} register={parts.current[0]} />
            <span
              aria-hidden="true"
              className={`${styles.tagsAnd} ${styles.onVelvet} ${styles.lineUp}`}
              style={{ ...fonts.names, "--gm-delay": "700ms" } as CSSProperties}
            >
              &amp;
            </span>
            <Tag person={people[1]} side="right" order={1} language={language} fonts={fonts} register={parts.current[1]} />
          </>
        ) : (
          <Tag person={people[0]} side="middle" order={0} language={language} fonts={fonts} register={parts.current[0]} />
        )}
      </div>
    </GulabPage>
  );
}
