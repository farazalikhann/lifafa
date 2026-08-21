"use client";

import { use, useState, type ReactElement } from "react";
import CardCanvas from "@/components/card/CardCanvas";
import Watermark from "@/components/card/Watermark";
import RsvpPanel from "@/components/invite/RsvpPanel";
import RsvpConfirmed from "@/components/invite/RsvpConfirmed";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { getMotifs } from "@/lib/motifs";
import { getMockEvent } from "@/lib/mockEvent";
import { getPalette } from "@/lib/palettes";
import { getTheme } from "@/lib/themes";
import type { CardConfig } from "@/types/card";
import type { RsvpSubmission } from "@/types/guest";

type InviteStage = "form" | "confirmed";

export default function InvitePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}): ReactElement {
  const { inviteCode } = use(params);

  const [stage, setStage] = useState<InviteStage>("form");
  /** The whole submission is kept, so the form comes back filled in. */
  const [submitted, setSubmitted] = useState<RsvpSubmission | null>(null);

  /*
    Same lookup the share image runs, so the card a guest opens and the preview
    that got them here can never describe two different events.
  */
  const event = getMockEvent(inviteCode);
  const theme = getTheme(event.draft.themeId);
  /* Page background follows the palette, the same source the card resolves from. */
  const palette = getPalette(event.style.paletteId);

  const config: CardConfig = {
    themeId: event.draft.themeId,
    blocks: event.blocks,
    decorMotion: event.decorMotion,
    decorIntensity: event.decorIntensity,
    occasionId: event.occasionId,
    traditionId: event.traditionId,
    scratchTarget: event.scratchTarget,
    style: event.style,
    /*
      Hardcoded until there is a payment to read. A guest holding a link must
      never meet a watermark, so this side is pinned true and only the wiring
      below is real: when the flag starts coming from the stored event, the
      card starts marking itself with no further change here.
    */
    isPaid: true,
  };
  const motifs = getMotifs(config.occasionId, config.traditionId);

  const handleSubmit = (submission: RsvpSubmission): void => {
    setSubmitted(submission);
    setStage("confirmed");
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: palette.background }}>
      {/*
        The card opens with host names set in display type, but they are a
        design element rather than a document heading — promoting them to an h1
        would put the page's typography and its outline in the same object and
        let one drag the other around. This carries the outline instead, so a
        screen reader announces what the page is before the card starts.
      */}
      <h1 className="sr-only">
        {event.draft.eventTitle} —{" "}
        {coverNameLine(resolveCoverNames(event.draft))}
      </h1>

      {/* No frame here — the card fills the phone screen. */}
      <div className="relative">
        <CardCanvas
          draft={event.draft}
          theme={theme}
          config={config}
          motifs={motifs}
          sizing="viewport"
          audience="guest"
        />

        {/* Renders nothing while isPaid holds. */}
        <Watermark
          show={!config.isPaid}
          accent={config.style.accentOverride ?? palette.accent}
          surface={palette.surface}
        />
      </div>

      {stage === "confirmed" && submitted !== null ? (
        <RsvpConfirmed
          status={submitted.status}
          partySize={submitted.partySize}
          name={submitted.name}
          theme={theme}
          /* Values stay in state, so the form comes back pre-filled. */
          onChangeReply={() => setStage("form")}
        />
      ) : (
        <RsvpPanel theme={theme} initial={submitted} onSubmit={handleSubmit} />
      )}
    </main>
  );
}
