"use client";

import type { ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import CurtainRevealCover from "@/components/invite/covers/CurtainRevealCover";
import EnvelopeSealCover from "@/components/invite/covers/EnvelopeSealCover";
import FoldUnfoldCover from "@/components/invite/covers/FoldUnfoldCover";
import PetalDustCover from "@/components/invite/covers/PetalDustCover";
import VideoCover, { type DrawnCover } from "@/components/invite/covers/VideoCover";
import { CURTAIN_FILMS, ENVELOPE_FILMS, PETAL_FILMS, filmFor } from "@/lib/coverVideos";
import { curtainArt } from "@/lib/curtainArt";
import { envelopeArt } from "@/lib/envelopeArt";
import { petalCoverArt } from "@/lib/petalCoverArt";

/*
  The covers as they are drawn in code, which is what a filmed cover falls
  back to. Module level, so each is one object for the life of the page and a
  film's effects do not see a new one on every render.
*/
const DRAWN_CURTAIN: DrawnCover = {
  Component: CurtainRevealCover,
  images: (isLight) => curtainArt(isLight).images,
};

const DRAWN_ENVELOPE: DrawnCover = {
  Component: EnvelopeSealCover,
  images: (isLight) => envelopeArt(isLight).images,
};

const DRAWN_PETALS: DrawnCover = {
  Component: PetalDustCover,
  images: (isLight) => petalCoverArt(isLight).images,
};

/**
 * Picks the drawing for whichever animation the card was saved with.
 *
 * One switch, and nothing else: the shell owns the phases and the timer, each
 * visual owns its own markup, and this is the only place that knows which id
 * maps to which. A `null` is a complete answer — the shell still shows its
 * plain cover, still counts the same milliseconds, and still opens. So an id
 * with no drawing yet is a cover without a picture, never a broken invitation.
 */
export default function CoverVisual(state: CoverVisualState): ReactElement | null {
  switch (state.option.id) {
    case "envelope-seal":
      return (
        <VideoCover
          key={filmFor(ENVELOPE_FILMS, state.colors.isLight).poster}
          {...state}
          films={ENVELOPE_FILMS}
          drawn={DRAWN_ENVELOPE}
        />
      );

    case "curtain-reveal":
      /*
        Keyed by the film, so a host changing the palette in the editor from a
        dark one to a light one gets the other film from a clean start.
      */
      return (
        <VideoCover
          key={filmFor(CURTAIN_FILMS, state.colors.isLight).poster}
          {...state}
          films={CURTAIN_FILMS}
          drawn={DRAWN_CURTAIN}
        />
      );

    case "fold-unfold":
      return <FoldUnfoldCover {...state} />;

    case "petal-dust":
      return (
        <VideoCover
          key={filmFor(PETAL_FILMS, state.colors.isLight).poster}
          {...state}
          films={PETAL_FILMS}
          drawn={DRAWN_PETALS}
        />
      );

    /* The host asked for no animation. The shell never shows a cover at all. */
    case "none":
      return null;
  }
}
