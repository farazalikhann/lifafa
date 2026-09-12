"use client";

import type { ReactElement } from "react";
import { useRouter } from "next/navigation";
import CardEditor, {
  type EditorSnapshot,
  type SaveOutcome,
} from "@/components/create/CardEditor";
import ExistingInvitationsNotice from "@/components/create/ExistingInvitationsNotice";
import { createEvent } from "@/lib/db/events";
import { clearPendingCard, readPendingCard, writePendingCard } from "@/lib/pendingCard";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_SECTION_ORDER } from "@/lib/cardSections";
import { DEFAULT_FONT_PAIR_ID } from "@/lib/fontPairs";
import { DEFAULT_COVER_ANIMATION } from "@/lib/coverAnimations";
import { DEFAULT_WEATHER_THEME } from "@/lib/weatherThemes";
import { DEFAULT_ORNAMENT_CONFIG } from "@/lib/ornaments/muslim";
import { DEFAULT_OCCASION_ID, DEFAULT_TRADITION_ID, getOccasion } from "@/lib/occasions";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * A new invitation.
 *
 * A wrapper and nothing else: every control, the four tabs and the preview live
 * in CardEditor, which /dashboard/[eventId]/edit mounts over a saved event in
 * exactly the same way. What belongs here is only what is true of *creating*
 * one — the empty card to start from, the sign-in detour, and what saving does.
 *
 * OPEN TO EVERYONE. The middleware lets anyone reach this page; the account is
 * asked for at save time, which is the first moment it is actually needed.
 */

const DEFAULT_OCCASION = getOccasion(DEFAULT_OCCASION_ID);

const EMPTY_DRAFT: EventDraft = {
  partyOneName: "",
  partyTwoName: "",
  /* The commonest joining word on the cards this is built for. */
  joinerWord: "weds",
  hostNames: "",
  eventTitle: "",
  eventDate: "",
  eventTime: "",
  venueName: "",
  venueAddress: "",
  message: "",
  themeId: DEFAULT_OCCASION.defaultThemeId,
  subEvents: [],
};

/**
 * The card an empty editor starts from.
 *
 * The defaults are all here rather than inside CardEditor, because "what a new
 * card looks like" is a fact about creating one: the editor's job is to show
 * whatever it is handed, whether that is this or a wedding somebody saved eight
 * months ago.
 */
const EMPTY_CONFIG: CardConfig = {
  themeId: DEFAULT_OCCASION.defaultThemeId,
  /* Every built-in section starts enabled, in the registry order. */
  blocks: DEFAULT_SECTION_ORDER.map((id) => ({
    kind: "builtin" as const,
    id,
    enabled: true,
  })),
  decorMotion: DEFAULT_OCCASION.defaultMotion,
  decorIntensity: "normal",
  butterflies: "none",
  occasionId: DEFAULT_OCCASION_ID,
  traditionId: DEFAULT_TRADITION_ID,
  /* Off by default: a card that hides its own date has to be asked for. */
  scratchTarget: "none",
  /* Off by default: a border is an addition to the card, not a part of it. */
  borderStyle: "none",
  style: {
    fontPairId: DEFAULT_FONT_PAIR_ID,
    paletteId: DEFAULT_OCCASION.defaultPaletteId,
    density: "comfortable",
    accentOverride: null,
  },
  ornamentConfig: DEFAULT_ORNAMENT_CONFIG,
  /* A link the host pastes. Null is "no music", and nothing ever autoplays. */
  musicUrl: null,
  /* Nothing in the editor has been paid for — that is what /create is. */
  isPaid: false,
};

export default function CreatePage(): ReactElement {
  const router = useRouter();

  /**
   * Saves a brand new invitation, or sends the host to sign in first.
   *
   * The session is read here rather than taken from a hook, and that is
   * deliberate: a hook that has not answered yet reports "signed out", which
   * would stash a signed-in host's card and march them off to a sign-in page
   * they do not need. Asking at the moment of the click also catches a session
   * that expired while the card was being built.
   */
  const handleSave = async (snapshot: EditorSnapshot): Promise<SaveOutcome> => {
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.getUser();
    const user = authError === null ? data.user : null;

    /*
      Signed out: stash the card and send them to sign in. The draft has to
      survive a full round trip out of the browser and back — the magic link
      often opens in a different tab — so component state is no use and
      sessionStorage is.
    */
    if (user === null) {
      const stashed = writePendingCard({
        draft: snapshot.draft,
        config: snapshot.config,
        coverAnimation: snapshot.coverAnimation,
        showWeather: snapshot.showWeather,
        weatherTheme: snapshot.weatherTheme,
        qrCheckinEnabled: snapshot.qrCheckinEnabled,
      });

      if (!stashed) {
        /*
          Storage can be unavailable or full. Saying so beats sending them off
          to sign in and losing everything they typed on the way back.
        */
        return {
          ok: false,
          error:
            "Your browser would not let us hold onto this card. Please try again, or check your privacy settings.",
        };
      }

      router.push(`/login?redirectTo=${encodeURIComponent("/create")}`);
      return { ok: true };
    }

    const result = await createEvent(
      snapshot.draft,
      snapshot.config,
      snapshot.coverAnimation,
      { showWeather: snapshot.showWeather, themeId: snapshot.weatherTheme },
      snapshot.qrCheckinEnabled,
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    /* Saved — the stash has done its job. */
    clearPendingCard();
    router.push(`/dashboard/${result.data.id}`);

    return { ok: true };
  };

  /**
   * The card that was waiting through the sign-in detour, if there is one.
   *
   * Cleared as it is read: restoring it twice would overwrite whatever the host
   * had started typing in the meantime. The four fields that are not part of
   * CardConfig fall back to this page's own defaults, because an entry stashed
   * before they existed carries nothing for them.
   */
  const restore = (): EditorSnapshot | null => {
    const pending = readPendingCard();

    if (pending === null) {
      return null;
    }

    clearPendingCard();

    return {
      draft: pending.draft,
      config: pending.config,
      coverAnimation: pending.coverAnimation ?? DEFAULT_COVER_ANIMATION,
      showWeather: pending.showWeather === true,
      weatherTheme: pending.weatherTheme ?? DEFAULT_WEATHER_THEME,
      qrCheckinEnabled: pending.qrCheckinEnabled === true,
    };
  };

  return (
    <CardEditor
      mode="create"
      initialDraft={EMPTY_DRAFT}
      initialConfig={EMPTY_CONFIG}
      initialCoverAnimation={DEFAULT_COVER_ANIMATION}
      initialShowWeather={false}
      initialWeatherTheme={DEFAULT_WEATHER_THEME}
      initialQrCheckinEnabled={false}
      onSave={handleSave}
      restore={restore}
      notice={<ExistingInvitationsNotice />}
    />
  );
}
