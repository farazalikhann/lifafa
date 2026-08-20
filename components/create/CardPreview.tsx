import type { ReactElement } from "react";
import CardCanvas from "@/components/card/CardCanvas";
import type { Motif } from "@/lib/motifs";
import { getTheme } from "@/lib/themes";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

/**
 * Phone-shaped viewport onto the invitation.
 *
 * The card is a scrollable vertical page, so the host scrolls this frame
 * exactly as a guest scrolls the real invite. Sizing is "frame" rather than
 * "viewport": sections size against this 620px box instead of the host's
 * monitor, so the proportions match what a guest sees on a phone.
 */
export default function CardPreview({
  draft,
  config,
  motifs,
}: {
  draft: EventDraft;
  config: CardConfig;
  motifs: readonly Motif[];
}): ReactElement {
  const theme = getTheme(draft.themeId);

  return (
    <div
      className="mx-auto h-[620px] w-full max-w-[380px] overflow-y-auto overscroll-contain rounded-[2rem] border border-[var(--lifafa-hairline)] shadow-[0_24px_60px_-24px_rgba(0,0,0,0.65)]"
      style={{ backgroundColor: theme.background }}
    >
      <CardCanvas
        draft={draft}
        theme={theme}
        config={config}
        motifs={motifs}
        sizing="frame"
      />
    </div>
  );
}
