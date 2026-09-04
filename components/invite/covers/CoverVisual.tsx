"use client";

import type { ReactElement } from "react";
import type { CoverVisualState } from "@/components/invite/CoverShell";
import CurtainRevealCover from "@/components/invite/covers/CurtainRevealCover";
import EnvelopeSealCover from "@/components/invite/covers/EnvelopeSealCover";
import FoldUnfoldCover from "@/components/invite/covers/FoldUnfoldCover";
import PetalDustCover from "@/components/invite/covers/PetalDustCover";

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
      return <EnvelopeSealCover {...state} />;

    case "curtain-reveal":
      return <CurtainRevealCover {...state} />;

    case "fold-unfold":
      return <FoldUnfoldCover {...state} />;

    case "petal-dust":
      return <PetalDustCover {...state} />;

    /* The host asked for no animation. The shell never shows a cover at all. */
    case "none":
      return null;
  }
}
