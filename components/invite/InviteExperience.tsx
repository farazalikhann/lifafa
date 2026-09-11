"use client";

import { useState, type ReactElement } from "react";
import CardCanvas from "@/components/card/CardCanvas";
import Watermark, { WATERMARK_CLEARANCE } from "@/components/card/Watermark";
import CoverShell from "@/components/invite/CoverShell";
import CoverVisual from "@/components/invite/covers/CoverVisual";
import GuestPass from "@/components/invite/GuestPass";
import RsvpPanel from "@/components/invite/RsvpPanel";
import RsvpConfirmed from "@/components/invite/RsvpConfirmed";
import type { CalendarInvite } from "@/lib/calendar";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { effectiveTheme } from "@/lib/cardTheme";
import { addOrUpdateReply } from "@/lib/db/guests";
import { getMotifs } from "@/lib/motifs";
import { getPalette } from "@/lib/palettes";
import { inviteUrl } from "@/lib/siteUrl";
import { getTheme } from "@/lib/themes";
import type { StoredEvent } from "@/types/database";
import type { RsvpSubmission } from "@/types/guest";
import type { EventWeather } from "@/types/weather";

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
  weather,
}: {
  event: StoredEvent;
  /** Resolved by the page, on the server. Null means the card shows none. */
  weather: EventWeather | null;
}): ReactElement {
  const [stage, setStage] = useState<InviteStage>("form");
  /** Kept whole, so "Change my reply" returns a filled form. */
  const [submitted, setSubmitted] = useState<RsvpSubmission | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /**
   * The guest's own check-in token, as their latest reply handed it back. Null
   * for any reply that is not a yes, and for every reply before 0006 is applied.
   */
  const [checkinToken, setCheckinToken] = useState<string | null>(null);

  const { config, draft } = event;
  const theme = getTheme(config.themeId);
  /*
    What the card is actually painted in, which is not the theme.

    themeId comes from the occasion and no control in the editor changes it;
    the Colour picker writes the palette. Everything laid out beside the card —
    the reply form, the confirmation, the guest's pass — used to be handed the
    raw theme, so a host who chose a light palette got a card in cream with a
    reply form underneath it in near-black text fields and invisible labels.

    CardCanvas composes the same thing from the same helper, so the two cannot
    drift apart again.
  */
  const cardTheme = effectiveTheme(theme, config.style);
  const palette = getPalette(config.style.paletteId);
  const motifs = getMotifs(config.occasionId, config.traditionId);

  /* The same names the card's own cover sets, flattened to one line. */
  const names = resolveCoverNames(draft, config.occasionId);
  const coverTitle = names.kind === "line" && names.isPlaceholder
    ? undefined
    : coverNameLine(names);

  /* What the saved pass calls the occasion: its title, or the names if it has none. */
  const passEventName =
    draft.eventTitle.trim().length > 0
      ? draft.eventTitle.trim()
      : (coverTitle ?? "Invitation");

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
        setCheckinToken(result.data.checkinToken);
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
      animationId={event.coverAnimation}
      /*
        The card's own colours, so the cover a guest taps is made of the same
        material as the invitation behind it. The accent is resolved the same
        way the watermark resolves it, which is what stops a host's overridden
        accent meeting the product's marigold on the way in.
      */
      palette={palette}
      accent={config.style.accentOverride}
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
            /*
              The page resolves the reading on the server and hands it here; it
              used to stop at this component, which took the prop and never
              passed it on. Everything behind it worked — the venue was
              geocoded at save time, the forecast was fetched and cached, the
              host picked a treatment for it — and CardCanvas fell back to its
              `weather = null` default, so no invitation has ever shown a sky.
            */
            weather={weather}
            weatherTheme={event.weatherTheme}
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
            theme={cardTheme}
            onChangeReply={() => setStage("form")}
            pass={
              /*
                Three gates, and all three must hold: the host switched check-in
                on, this reply is a yes, and the database issued a token. Any one
                missing renders nothing at all — no heading, no empty box.
              */
              event.qrCheckinEnabled &&
              submitted.status === "accepted" &&
              checkinToken !== null ? (
                <GuestPass
                  token={checkinToken}
                  guestName={submitted.name}
                  eventName={passEventName}
                  theme={cardTheme}
                />
              ) : null
            }
          />
        ) : (
          <RsvpPanel
            theme={cardTheme}
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
