"use client";

import { use, useState, type ReactElement } from "react";
import CardCanvas from "@/components/card/CardCanvas";
import RsvpPanel from "@/components/invite/RsvpPanel";
import RsvpConfirmed from "@/components/invite/RsvpConfirmed";
import { getMotifs } from "@/lib/motifs";
import {
  DEFAULT_OCCASION_ID,
  DEFAULT_TRADITION_ID,
  getOccasion,
} from "@/lib/occasions";
import { DEFAULT_SECTION_ORDER } from "@/lib/cardSections";
import { getTheme } from "@/lib/themes";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { RsvpSubmission } from "@/types/guest";

/**
 * PLACEHOLDER EVENT.
 *
 * There is no database in this step, so every invite code renders the same
 * sample invitation. Looking the draft up by `inviteCode` comes later.
 */
const SAMPLE_DRAFT: EventDraft = {
  hostNames: "Aarav and Meera",
  eventTitle: "Wedding Reception",
  eventDate: "2026-12-14",
  eventTime: "19:00",
  venueName: "The Grand Ballroom",
  venueAddress: "12 MG Road, Bengaluru 560001",
  message: "We would love to have you with us as we begin this chapter.",
  themeId: "marigold",
};

type InviteStage = "form" | "confirmed";

export default function InvitePage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}): ReactElement {
  /* Unwrapped so the route stays correct once this drives a real lookup. */
  use(params);

  const [stage, setStage] = useState<InviteStage>("form");
  /** The whole submission is kept, so the form comes back filled in. */
  const [submitted, setSubmitted] = useState<RsvpSubmission | null>(null);

  const theme = getTheme(SAMPLE_DRAFT.themeId);

  /* Hardcoded for this step; these follow the event once it is stored. */
  const occasion = getOccasion(DEFAULT_OCCASION_ID);
  const config: CardConfig = {
    themeId: SAMPLE_DRAFT.themeId,
    blocks: DEFAULT_SECTION_ORDER.map((id) => ({
      kind: "builtin" as const,
      id,
      enabled: true,
    })),
    decorMotion: occasion.defaultMotion,
    decorIntensity: "normal",
    occasionId: DEFAULT_OCCASION_ID,
    traditionId: DEFAULT_TRADITION_ID,
  };
  const motifs = getMotifs(config.occasionId, config.traditionId);

  const handleSubmit = (submission: RsvpSubmission): void => {
    setSubmitted(submission);
    setStage("confirmed");
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: theme.background }}>
      {/* No frame here — the card fills the phone screen. */}
      <CardCanvas
        draft={SAMPLE_DRAFT}
        theme={theme}
        config={config}
        motifs={motifs}
        sizing="viewport"
      />

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
