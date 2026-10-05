"use client";

import type { ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import BreezeCover from "@/components/invite/covers/BreezeCover";
import CurtainRevealCover from "@/components/invite/covers/CurtainRevealCover";
import EnvelopeSealCover from "@/components/invite/covers/EnvelopeSealCover";
import FoldUnfoldCover from "@/components/invite/covers/FoldUnfoldCover";
import VideoCover, { type DrawnCover } from "@/components/invite/covers/VideoCover";
import { ENVELOPE_FILMS, FOLD_FILMS, filmFor } from "@/lib/coverVideos";
import { envelopeArt } from "@/lib/envelopeArt";
import { gatefoldArt } from "@/lib/gatefoldArt";

/*
  The covers as they are drawn in code, which is what a filmed cover falls
  back to. Module level, so each is one object for the life of the page and a
  film's effects do not see a new one on every render.
*/
const DRAWN_ENVELOPE: DrawnCover = {
  Component: EnvelopeSealCover,
  images: (isLight) => envelopeArt(isLight).images,
};

const DRAWN_FOLD: DrawnCover = {
  Component: FoldUnfoldCover,
  images: (isLight) => gatefoldArt(isLight).images,
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
        Drawn, not filmed: the card has to show between the curtains, and
        nothing shows through a film. One cloth for every card.
      */
      return <CurtainRevealCover {...state} />;

    case "fold-unfold":
      return (
        <VideoCover
          key={filmFor(FOLD_FILMS, state.colors.isLight).poster}
          {...state}
          films={FOLD_FILMS}
          drawn={DRAWN_FOLD}
        />
      );

    /*
      The breeze, under the petal dust cover's id. Drawn over the card like
      the curtain. Keyed by the card's ground, so a host changing the palette
      in the editor gets the veil in the new colour from a clean start.
    */
    case "petal-dust":
      return <BreezeCover key={state.colors.ground} {...state} />;

    /* The host asked for no animation. The shell never shows a cover at all. */
    case "none":
      return null;
  }
}
