"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import CardCanvas from "@/components/card/CardCanvas";
import Watermark, {
  WATERMARK_CLEARANCE,
  WATERMARK_PILL_SELECTOR,
} from "@/components/card/Watermark";
import CoverShell from "@/components/invite/CoverShell";
import CoverVisual from "@/components/invite/covers/CoverVisual";
import GuestPass from "@/components/invite/GuestPass";
import InvitedCue from "@/components/invite/InvitedCue";
import LanguageSwitch, {
  LANGUAGE_SWITCH_CLEARANCE,
} from "@/components/invite/LanguageSwitch";
import RsvpPanel from "@/components/invite/RsvpPanel";
import RsvpConfirmed from "@/components/invite/RsvpConfirmed";
import type { CalendarInvite } from "@/lib/calendar";
import { coverNameLine, resolveCoverNames } from "@/lib/cardFormat";
import { CARD_LANGUAGES, cardCopy, cardLanguage } from "@/lib/cardLanguage";
import { effectiveTheme } from "@/lib/cardTheme";
import {
  cardInLanguage,
  hasHeadlineIn,
  inviteLinkIn,
} from "@/lib/cardTranslation";
import { addOrUpdateReply } from "@/lib/db/guests";
import { getMotifs } from "@/lib/motifs";
import { getPalette } from "@/lib/palettes";
import { getTheme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { StoredEvent } from "@/types/database";
import type { RsvpSubmission } from "@/types/guest";
import type { EventWeather } from "@/types/weather";

type InviteStage = "form" | "confirmed";

/**
 * Why a reply did not go through, kept as a reason rather than a sentence, so
 * a guest who switches language after a failure reads it in the new one.
 */
type ReplyError =
  | { kind: "failed" }
  | { kind: "closed" }
  /* The invitation is not paid for; only its host can be here to see this. */
  | { kind: "inactive" }
  /* The event ended while the form was open. */
  | { kind: "ended" }
  /* The server's own sentence, which is English; see submitErrorText. */
  | { kind: "server"; text: string };

/** Where a guest's language choice is remembered, per invitation. */
function languageKey(inviteCode: string): string {
  return `lifafa:invite-lang:${inviteCode}`;
}

function readRememberedLanguage(inviteCode: string): CardLanguage | null {
  try {
    const stored = window.localStorage.getItem(languageKey(inviteCode));
    return stored !== null && cardLanguage(stored) === stored ? stored : null;
  } catch {
    return null;
  }
}

function rememberLanguage(inviteCode: string, language: CardLanguage): void {
  try {
    window.localStorage.setItem(languageKey(inviteCode), language);
  } catch {
    /* Storage blocked; the choice still holds for this visit and in the URL. */
  }
}

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
  initialLanguage,
  linkLanguage,
  ended,
  weather,
  inviteUrl,
}: {
  /**
   * The event as stored: the card in its own language, with its words in the
   * other language beside it in `translations`. Resolved here, per language,
   * so the guest can switch without the page being fetched again.
   */
  event: StoredEvent;
  /** The language the page opens in: the link's ?lang=, or the card's own. */
  initialLanguage: CardLanguage;
  /**
   * The language the link named, if it named one. A link that says ?lang=hi
   * opens in Hindi even for a guest who once chose English on the plain link.
   */
  linkLanguage: CardLanguage | null;
  /**
   * The event is over (lib/eventLock.ts), decided by the page on the server so
   * the two renders agree. The card stays as a keepsake; the replies close.
   */
  ended: boolean;
  /** Resolved by the page, on the server. Null means the card shows none. */
  weather: EventWeather | null;
  /** This card's own link, without a language; see inviteLinkIn below. */
  inviteUrl: string;
}): ReactElement {
  const [stage, setStage] = useState<InviteStage>("form");
  /** Kept whole, so "Change my reply" returns a filled form. */
  const [submitted, setSubmitted] = useState<RsvpSubmission | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [submitError, setSubmitError] = useState<ReplyError | null>(null);
  /**
   * The guest's own check-in token, as their latest reply handed it back. Null
   * for any reply that is not a yes, and for every reply before 0006 is applied.
   */
  const [checkinToken, setCheckinToken] = useState<string | null>(null);

  /*
    THE LANGUAGE.

    State, so a switch redraws everything below from the same stored event: the
    cover's names and prompt, the card, its fixed words, the reply form, the
    confirmation and the pass all read `config.language` and the draft that
    cardInLanguage hands back. Nothing is fetched and the page is not reloaded.

    Offered only when the card can be read in both: the host wrote the names or
    the title in the other language. Otherwise there is no switch, and the card
    opens in the link's language or its own, as it always has.
  */
  const [language, setLanguage] = useState<CardLanguage>(initialLanguage);
  const switchable = CARD_LANGUAGES.every((option) =>
    hasHeadlineIn(event.draft, event.config.language, option.id),
  );

  /*
    A guest's earlier choice, read after hydration so the server and the first
    client render agree, and before paint so the cover never flashes in the
    other language. A link that names a language outranks it.
  */
  useLayoutEffect(() => {
    if (!switchable || linkLanguage !== null) {
      return;
    }

    const remembered = readRememberedLanguage(event.inviteCode);

    if (remembered !== null && remembered !== initialLanguage) {
      setLanguage(remembered);
    }
  }, [event.inviteCode, initialLanguage, linkLanguage, switchable]);

  /*
    Remembered for this invitation, and written into the address too, so a
    reload or a link copied from the bar opens in the language on screen.
  */
  const handleLanguageChange = useCallback(
    (next: CardLanguage): void => {
      setLanguage(next);
      rememberLanguage(event.inviteCode, next);

      try {
        const url = new URL(window.location.href);
        url.searchParams.set("lang", next);
        window.history.replaceState(window.history.state, "", url);
      } catch {
        /* The address is a convenience; the switch has already happened. */
      }
    },
    [event.inviteCode],
  );

  const { config, draft } = useMemo(
    () => cardInLanguage(event.draft, event.config, language),
    [event.draft, event.config, language],
  );
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

  /*
    Everything laid out around the card — the cover, the form, the pass — is
    written in the card's language, read from the same config the card reads
    it from.
  */
  const copy = cardCopy(language);

  /* The same names the card's own cover sets, flattened to one line. */
  const names = resolveCoverNames(draft, config.occasionId, language);
  const coverTitle = names.kind === "line" && names.isPlaceholder
    ? undefined
    : coverNameLine(names);

  /* What the saved pass calls the occasion: its title, or the names if it has none. */
  const passEventName =
    draft.eventTitle.trim().length > 0
      ? draft.eventTitle.trim()
      : (coverTitle ?? copy.invite.headingFallback);

  /*
    The page's heading, from the same resolution the cover prints. hostNames is
    only the fallback line and is empty on most pair cards, so reading it here
    announced "Wedding: " with nobody's name after the colon.
  */
  const pageHeading = [draft.eventTitle.trim(), coverTitle]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(": ");

  /*
    The link arrives from the server rather than being built here: this
    component server-renders first, and an origin the two runtimes could
    disagree about, such as the page's own, would put one link in the markup
    and another in the hydrated tree.
  */
  const invite: CalendarInvite = {
    code: event.inviteCode,
    /*
      In the language this card is being read in, so the link written into a
      guest's calendar brings them back to the card they saved it from.
    */
    url: inviteLinkIn(inviteUrl, language),
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
          /* Shown in English only on an English card; see submitErrorText. */
          setSubmitError({ kind: "server", text: result.error });
          return;
        }

        /*
          The host switched replies off after this guest opened the card. Said
          plainly, with the form left where it is: "try again" would only have
          them try again.
        */
        if (result.data.kind === "closed") {
          setSubmitError({ kind: "closed" });
          return;
        }

        if (result.data.kind === "inactive") {
          setSubmitError({ kind: "inactive" });
          return;
        }

        if (result.data.kind === "ended") {
          setSubmitError({ kind: "ended" });
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
        setSubmitError({ kind: "failed" });
      });
  };

  /*
    The reason, in the language on screen now. The server's sentence is
    written in English for a host, and in development carries the Postgres
    code on the end. An English card shows it as it always has; a Hindi one
    says the same thing in its own words, because a guest reading Hindi cannot
    act on an English error any better than on no error at all.
  */
  const submitErrorText =
    submitError === null
      ? null
      : submitError.kind === "closed"
        ? copy.invite.repliesClosed
        : submitError.kind === "inactive"
          ? copy.invite.notActive
          : submitError.kind === "ended"
            ? copy.invite.eventEnded
            : submitError.kind === "server" && language === "en"
              ? submitError.text
              : copy.invite.replyFailed;

  return (
    <>
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
        fontPairId={config.style.fontPairId}
        language={language}
        /*
          The cover's drawing keeps clear of the switch above it, and of the
          host's preview banner when there is one (0 for every guest).
        */
        topClearance={
          switchable ? LANGUAGE_SWITCH_CLEARANCE : "var(--lifafa-preview-h, 0px)"
        }
        renderVisual={(state) => <CoverVisual {...state} />}
      >
        <main
          /*
            The card's language on everything below, the form and the pass
            included — they sit outside the card's own root, which carries it
            too. The card's body stack goes with it, in every language: the
            form under a Royal card is set in Royal's text face, not in the
            product's own Inter, which is what an English card used to get.
          */
          lang={copy.lang}
          className="min-h-screen"
          style={{
            /* Room for the host's preview banner; 0 for every guest. */
            paddingTop: "var(--lifafa-preview-h, 0px)",
            backgroundColor: palette.background,
            fontFamily: cardTheme.fontFamily,
          }}
        >
          {/*
            The card opens with names set in display type, but they are a design
            element rather than a document heading. This carries the outline so a
            screen reader announces what the page is before the card starts.
          */}
          <h1 className="sr-only">
            {pageHeading.length > 0 ? pageHeading : copy.invite.headingFallback}
          </h1>

          <div
            className="relative"
            /*
              The event's own is_paid, as the server page loaded it. The card's
              JSON carries a copy that toStoredEvent overwrites from the column,
              so the two agree today; reading the column is what keeps it from
              depending on that.
            */
            style={
              event.isPaid ? undefined : { paddingBottom: WATERMARK_CLEARANCE }
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
                Grows with a tablet or laptop screen from 768px up, and fills the
                page either side of it. The one card in the app that does: the
                editor's previews draw it inside a phone-sized box of their own.
              */
              fluid
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
              show={!event.isPaid}
              language={language}
              accent={config.style.accentOverride ?? palette.accent}
              surface={palette.surface}
            />
          </div>

          {/*
            "You are invited", pinned to the foot of the screen until the guest
            scrolls. Inside the cover's children so it knows when the cover has
            gone; fixed, so where it sits in the tree changes nothing on screen.
            Above the watermark pill on a card that shows one, which is only
            ever the host's own preview.
          */}
          <InvitedCue
            language={language}
            theme={cardTheme}
            clearOf={event.isPaid ? undefined : WATERMARK_PILL_SELECTOR}
          />

          {/*
            Nothing at all when the host switched replies off: no heading, no
            empty box, no line explaining the absence. The card simply ends where
            the host's last section ends, which is what a card sent only to share
            the details should do.

            A host who switches replies off while this page is open does not
            reach it here — the config was read when the page was — and that
            guest meets the refusal in addOrUpdateReply instead.
          */}
          {stage === "confirmed" && submitted !== null ? (
            <RsvpConfirmed
              status={submitted.status}
              partySize={submitted.partySize}
              name={submitted.name}
              theme={cardTheme}
              language={language}
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
                    language={language}
                  />
                ) : null
              }
            />
          ) : ended && config.rsvpEnabled ? (
            /*
              Where the reply form was, once the event is over: the card is a
              keepsake now, and the database refuses a reply to it anyway.
            */
            <section className="mx-auto w-full max-w-[480px] px-5 pt-10 pb-14 text-center sm:px-6">
              <p
                className="text-base leading-relaxed text-balance"
                style={{
                  color: cardTheme.textPrimary,
                  fontFamily: cardTheme.displayFontFamily,
                }}
              >
                {copy.invite.eventEnded}
              </p>
            </section>
          ) : config.rsvpEnabled ? (
            <RsvpPanel
              theme={cardTheme}
              language={language}
              initial={submitted}
              onSubmit={handleSubmit}
              isSending={isSending}
              submitError={submitErrorText}
            />
          ) : null}
        </main>
      </CoverShell>

      {/*
        Outside the cover rather than inside it: everything inside is inert while
        the cover is up, and a guest should be able to pick their language before
        they tap in. See LanguageSwitch for where it sits and when it hides.
      */}
      {switchable ? (
        <LanguageSwitch
          value={language}
          onChange={handleLanguageChange}
          palette={palette}
          accent={config.style.accentOverride ?? palette.accent}
        />
      ) : null}
    </>
  );
}
