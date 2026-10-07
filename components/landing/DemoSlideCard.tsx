"use client";

import { useLayoutEffect, useMemo, useRef, type ReactElement } from "react";
import CardCanvas from "@/components/card/CardCanvas";
import { CardStillContext } from "@/hooks/useCardStill";
import { PREVIEW_INVITE } from "@/lib/calendar";
import { DEMO_NIKAH, demoSlideConfig } from "@/lib/demoCards";
import { DEMO_STAGE_HEIGHT } from "@/lib/demoSlides";
import { getMotifs } from "@/lib/motifs";
import { getTheme } from "@/lib/themes";
import type { CardSectionId } from "@/types/card";

/**
 * How far short of a section's top its frame stops, in the card's own px, for
 * a section that does not fit the frame.
 *
 * The functions run to more than a screen, so their heading is the first line
 * under the names and the lights, where the card dissolves what scrolls
 * beneath them. A guest reads it on the way there, a little further down the
 * screen; the frame is stopped where they would be.
 */
const LEAD: Partial<Record<CardSectionId, number>> = {
  timeline: 64,
};

/**
 * One screen of the sample card, drawn by the card itself.
 *
 * The same CardCanvas a guest's link draws, handed the sample and sized
 * against the frame it stands in. Not a screenshot: a change to the card is a
 * change to this, with nothing to retake.
 *
 * SCROLLED TO ITS SCREEN, AS A GUEST WOULD HAVE. The frame is a phone's
 * screen, and the box here is what scrolls in it: the card is drawn from its
 * cover down (see demoSlideConfig) and the box is moved to the section the
 * frame is of. So the section stands where a guest who has swiped to it sees
 * it, under the names pinned across the head of the screen, and not where it
 * would be if it were the first thing on the card. Nobody can scroll it: the
 * box hides what overflows it and the frame takes no pointer.
 *
 * In a chunk of its own (see Showcase, which loads it only for the frames on
 * screen), because the card is most of the product's code and the home page
 * should not wait on it to paint.
 *
 * Drawn for the host's preview, not the guest: nothing in a frame can be
 * tapped, so nothing may wait to be. With no link, the card remembers nothing
 * and its calendar buttons carry none.
 */
export default function DemoSlideCard({
  section,
}: {
  section: CardSectionId;
}): ReactElement {
  const config = useMemo(() => demoSlideConfig(section), [section]);
  const { draft } = DEMO_NIKAH;
  const boxRef = useRef<HTMLDivElement>(null);

  /*
    The box, moved to its section, and kept there: the sections above it grow
    as their pictures and faces arrive, and the section moves down with them.
    The cover is the top of the card, and is simply left there.

    Measured through the frame's own scaling: the box is drawn at a phone's
    size and brought down to fit, so what the browser reports is the scaled
    size and the scroll is in the unscaled one.
  */
  useLayoutEffect(() => {
    const box = boxRef.current;

    if (box === null || section === "cover") {
      return;
    }

    const place = (): void => {
      const sections = box.querySelectorAll("section");
      const target = sections[sections.length - 1];
      const bounds = box.getBoundingClientRect();

      if (target === undefined || bounds.height === 0) {
        return;
      }

      const scale = bounds.height / DEMO_STAGE_HEIGHT;
      const top = (target.getBoundingClientRect().top - bounds.top) / scale + box.scrollTop;

      box.scrollTop = Math.max(0, Math.round(top) - (LEAD[section] ?? 0));
    };

    place();

    if (typeof ResizeObserver !== "function") {
      return;
    }

    const card = box.firstElementChild;
    const observer = new ResizeObserver(place);

    if (card !== null) {
      observer.observe(card);
    }

    return () => observer.disconnect();
  }, [section]);

  return (
    <div ref={boxRef} className="h-full w-full overflow-hidden">
      <CardStillContext value={true}>
        <CardCanvas
          draft={draft}
          theme={getTheme(config.themeId)}
          config={config}
          motifs={getMotifs(config.occasionId, config.traditionId)}
          sizing="frame"
          frameHeight={DEMO_STAGE_HEIGHT}
          audience="host-preview"
          invite={PREVIEW_INVITE}
        />
      </CardStillContext>
    </div>
  );
}
