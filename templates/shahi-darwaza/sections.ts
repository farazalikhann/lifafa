import { calendarPageText, resolveCoverNames } from "@/lib/cardFormat";
import { hasCountdown, hasTimeline } from "@/lib/cardSections";
import type { CardConfig, CardLanguage, CardSectionId } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** The letter's lines: the host's note and the two families. Both empty: no letter. */
export function letterLines(draft: EventDraft): { message: string; families: string[] } {
  return {
    message: draft.message.trim(),
    families: [draft.partyOneParents, draft.partyTwoParents]
      .map((line) => line?.trim() ?? "")
      .filter((line) => line.length > 0),
  };
}

/**
 * Whether a built-in section has anything to put on this card.
 *
 * Asked by the card before it draws a section, so a section with nothing to
 * say leaves no box behind and no garland over an empty space; each section
 * asks the same of itself too. The same tests the sections use, in one place.
 */
export function hasSection(
  id: CardSectionId,
  draft: EventDraft,
  config: CardConfig,
  language: CardLanguage,
): boolean {
  switch (id) {
    case "message": {
      const { message, families } = letterLines(draft);
      return message.length > 0 || families.length > 0;
    }
    case "family": {
      const names = resolveCoverNames(draft, config.occasionId, language);
      return !(names.kind === "line" && names.isPlaceholder);
    }
    case "details":
      return calendarPageText(draft.eventDate, draft.eventTime, language) !== null;
    case "timeline":
      return hasTimeline(draft);
    case "venue":
      return draft.venueName.trim().length > 0 || draft.venueAddress.trim().length > 0;
    case "countdown":
      return hasCountdown(draft);
    default:
      return true;
  }
}
