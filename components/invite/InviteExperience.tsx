"use client";

import { useState, type ReactElement } from "react";
import CardCanvas from "@/components/card/CardCanvas";
import Watermark, { WATERMARK_CLEARANCE } from "@/components/card/Watermark";
import CoverShell from "@/components/invite/CoverShell";
import CoverVisual from "@/components/invite/covers/CoverVisual";
import RsvpPanel from "@/components/invite/RsvpPanel";
import RsvpConfirmed from "@/components/invite/RsvpConfirmed";
import type { CalendarInvite } from "@/lib/calendar";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { DEFAULT_COVER_ANIMATION } from "@/lib/coverAnimations";
import { addOrUpdateReply } from "@/lib/db/guests";
import { getMotifs } from "@/lib/motifs";
import { getPalette } from "@/lib/palettes";
import { inviteUrl } from "@/lib/siteUrl";
import { getTheme } from "@/lib/themes";
import type { StoredEvent } from "@/types/database";
import type { RsvpSubmission } from "@/types/guest";

type InviteStage = "form" | "confirmed";

/**
 * The guest's side of an invitation: the card, then the reply.
 *
 * A client component because the reply stage lives in state, wrapped by a
 * server page that has already fetched the event. The split is what lets the
 * event be read on the server — where the session cookie and the RLS policies
 * are — while the interaction stays here.
 *
 * A guest never signs in. Nothing on this path touches auth.
 */
export default function InviteExperience({
  event,
}: {
  event: StoredEvent;
}): ReactElement {
  const [stage, setStage] = useState<InviteStage>("form");
  /** Kept whole, so "Change my reply" returns a filled form. */
  const [submitted, setSubmitted] = useState<RsvpSubmission | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { config, draft } = event;
  const theme = getTheme(config.themeId);
  const palette = getPalette(config.style.paletteId);
  const motifs = getMotifs(config.occasionId, config.traditionId);

  /*
    The same names the card's own cover sets, flattened to one line. Read from
    the draft rather than from a saved column: the animation a host picks is the
    next step's work, so for now every invitation opens the same way.
  */
  const names = resolveCoverNames(draft, config.occasionId);
  const coverTitle = names.kind === "line" && names.isPlaceholder
    ? undefined
    : coverNameLine(names);

  /*
    Built here rather than from window.location: this component server-renders
    first, and an origin the two runtimes could disagree about would put one
    link in the markup and another in the hydrated tree.
  */
  const invite: CalendarInvite = {
    code: event.inviteCode,
    url: inviteUrl(event.inviteCode),
  };

  const handleSubmit = (submission: RsvpSubmission): void => {
    setIsSending(true);
    setSubmitError(null);

    void addOrUpdateReply(event.inviteCode, {
      name: submission.name,
      phone: submission.phone,
      status: submission.status,
      partySize: submission.partySize,
      message: submission.message,
    })
      .then((result) => {
        setIsSending(false);

        if (!result.ok) {
          setSubmitError(result.error);
          return;
        }

        /*
          Only advanced once the write has actually landed. Showing the
          confirmation optimistically would tell a guest their reply was sent
          when the row may never have been written, and the host would be
          catering for someone who thinks they are coming.
        */
        setSubmitted(submission);
        setStage("confirmed");
      })
      .catch((cause: unknown) => {
        console.error("[invite] reply failed:", cause);
        setIsSending(false);
        setSubmitError("Could not send your reply, please try again.");
      });
  };

  return (
    <CoverShell
      animationId={DEFAULT_COVER_ANIMATION}
      title={coverTitle}
      renderVisual={(state) => <CoverVisual {...state} />}
    >
      <main
        className="min-h-screen"
        style={{ backgroundColor: palette.background }}
      >
        {/*
          The card opens with names set in display type, but they are a design
          element rather than a document heading. This carries the outline so a
          screen reader announces what the page is before the card starts.
        */}
        <h1 className="sr-only">
          {draft.eventTitle} — {draft.hostNames}
        </h1>

        <div
          className="relative"
          style={
            config.isPaid ? undefined : { paddingBottom: WATERMARK_CLEARANCE }
          }
        >
          <CardCanvas
            draft={draft}
            theme={theme}
            config={config}
            motifs={motifs}
            sizing="viewport"
            audience="guest"
            invite={invite}
          />

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
            onChangeReply={() => setStage("form")}
          />
        ) : (
          <RsvpPanel
            theme={theme}
            initial={submitted}
            onSubmit={handleSubmit}
            isSending={isSending}
            submitError={submitError}
          />
        )}
      </main>
    </CoverShell>
  );
}
