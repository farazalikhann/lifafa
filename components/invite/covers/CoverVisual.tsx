"use client";

import type { ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import BreezeCover from "@/components/invite/covers/BreezeCover";
import CurtainRevealCover from "@/components/invite/covers/CurtainRevealCover";
import EnvelopeSealCover from "@/components/invite/covers/EnvelopeSealCover";
import FoldUnfoldCover from "@/components/invite/covers/FoldUnfoldCover";
import LightFilmCover from "@/components/invite/covers/LightFilmCover";
import type { DrawnCover } from "@/components/invite/covers/VideoCover";
import { curtainArt } from "@/lib/curtainArt";
import { CURTAIN_LIGHT_FILM } from "@/lib/curtainLightFilm";
import { ENVELOPE_LIGHT_FILM } from "@/lib/envelopeLightFilm";
import { FOLD_LIGHT_FILM } from "@/lib/foldLightFilm";
import { envelopeArt } from "@/lib/envelopeArt";
import { gatefoldArt } from "@/lib/gatefoldArt";
import { RIBBON_SEAL_FILM } from "@/lib/ribbonSealFilm";
import { ROSE_BLOOM_FILM } from "@/lib/roseBloomFilm";

/*
  The covers as they are drawn in code, which is what a filmed cover falls
  back to. Module level, so each is one object for the life of the page and a
  film's effects do not see a new one on every render.
*/
const DRAWN_ENVELOPE: DrawnCover = {
  Component: EnvelopeSealCover,
  images: (isLight) => envelopeArt(isLight).images,
};

const DRAWN_CURTAIN: DrawnCover = {
  Component: CurtainRevealCover,
  images: () => curtainArt().images,
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
      /*
        A film that ends in plain light, which the card comes out of. One
        film for every card; the envelope drawn in code is what it falls back
        to, in the card's own paper. Keyed by the card's ground, so a host
        changing the palette in the editor gets that paper from a clean start.
      */
      return (
        <LightFilmCover
          key={String(state.colors.isLight)}
          {...state}
          film={ENVELOPE_LIGHT_FILM}
          drawn={DRAWN_ENVELOPE}
        />
      );

    case "curtain-reveal":
      /*
        A film that ends in plain light, which the card comes out of. One
        film for every card. The curtains drawn in code are what it falls
        back to; see LightFilmCover.
      */
      return <LightFilmCover {...state} film={CURTAIN_LIGHT_FILM} drawn={DRAWN_CURTAIN} />;

    case "fold-unfold":
      /*
        A film that ends in plain light, like the envelope's, with the doors
        drawn in code to fall back to, in the card's own paper.
      */
      return (
        <LightFilmCover
          key={String(state.colors.isLight)}
          {...state}
          film={FOLD_LIGHT_FILM}
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

    /*
      A film that ends in plain light, like the curtain's. Nothing is drawn
      in code behind this one: when the film cannot play, its still fades to
      the card.
    */
    case "rose-bloom":
      return <LightFilmCover {...state} film={ROSE_BLOOM_FILM} />;

    /*
      The same again: a film that ends in plain light, with nothing drawn in
      code behind it. Its still fades to the card when the film cannot play.
    */
    case "ribbon-seal":
      return <LightFilmCover {...state} film={RIBBON_SEAL_FILM} />;

    /* The host asked for no animation. The shell never shows a cover at all. */
    case "none":
      return null;
  }
}
