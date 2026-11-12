import type { ReactElement } from "react";
import StillCard, { STILL_HEIGHT } from "@/components/create/StillCard";
import { getMotifs } from "@/lib/motifs";
import { cardPalette } from "@/lib/textColors";
import { getTheme } from "@/lib/themes";
import { DEFAULT_WEATHER_THEME } from "@/lib/weatherThemes";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * The visitor's own card on the sign-in page, as the still picture /create
 * shows on a phone (components/create/StillCard.tsx). Its own module, fetched
 * after the page is ready (components/auth/SavedCardPreview.tsx): it is what
 * brings the card's renderers, and the buttons must not wait for them.
 */
export default function SavedCardStill({
  draft,
  config,
  height,
}: {
  draft: EventDraft;
  config: CardConfig;
  height: number;
}): ReactElement {
  return (
    <>
      {/* The card's own ground behind it, as the frame on /create has. */}
      <div aria-hidden="true" className="absolute inset-0" style={{ backgroundColor: cardPalette(config.style).background }} />
      <StillCard
      draft={draft}
      theme={getTheme(draft.themeId)}
      config={config}
      motifs={getMotifs(config.occasionId, config.traditionId)}
      /* No forecast on a sign-in page: the card is shown as it is, without one. */
      weather={null}
      weatherTheme={DEFAULT_WEATHER_THEME}
      scale={height / STILL_HEIGHT}
      /* Shown as saved: an empty detail is left out, never "Your names". */
      placeholders={false}
      />
    </>
  );
}
