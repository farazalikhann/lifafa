import type { ReactElement } from "react";
import { WATERMARK_CLEARANCE } from "@/components/card/Watermark";
import { effectiveTheme } from "@/lib/cardTheme";
import { MADE_WITH_LIFAFA_URL } from "@/lib/site";
import type { Theme } from "@/lib/themes";
import { getTemplate } from "@/templates/registry";
import type { CardConfig } from "@/types/card";

/** The credit's words. English on every card, like the watermark: it is the maker's name. */
export const MADE_WITH_LIFAFA = "Made with Lifafa";

/** Which of a template's own colours the credit is set in; `creditInk` on TemplateConfig. */
export type CreditInk = "text" | "accent";

/** The logo's red dot. It stays this red on every card, whatever the ink. */
const BRAND_RED = "#E0392E";

/** How strongly the words and the V are inked: quiet, never louder than the card. */
const INK_OPACITY = 0.65;

/**
 * "Made with Lifafa" and the V mark, at the very end of an invitation: after
 * the card's border, the reply form and the closing words, on the card's own
 * ground. Never on the cover, which is over the whole page until it opens.
 *
 * Inked in the card's own colours, from its theme: the template's text colour
 * or its accent (`creditInk`, one token per template), at about 65 percent,
 * in the card's body face. A dark card gets a light mark and a light card a
 * dark one, because a card's text is always set against its ground. Only the
 * dot is fixed.
 *
 * A link to the home page in a new tab, so the guest keeps the invitation.
 * It carries UTM parameters and nothing else: no script on the invitation
 * tracks anyone.
 *
 * `clearPill`: on a card that shows the "not yet active" pill (an unpaid
 * card's host preview), the credit stands clear above it.
 */
export default function MadeWithLifafa({
  theme,
  config,
  clearPill = false,
}: {
  /** The card's theme as handed to the card; the card's own colours are worked out here. */
  theme: Theme;
  config: CardConfig;
  clearPill?: boolean;
}): ReactElement {
  const cardTheme = effectiveTheme(theme, config.style);
  const ink =
    getTemplate(config.templateId).creditInk === "accent"
      ? cardTheme.accent
      : cardTheme.textPrimary;

  return (
    /*
      A layer of its own just over the card's ground: a template with a fixed
      ground of its own (Emerald Shahi's damask) otherwise paints over the
      small mark. Still under everything pinned to the screen (z-30 and up).
    */
    <div
      lang="en-IN"
      className="relative z-[1] flex justify-center px-5 pt-8 pb-10"
      style={clearPill ? { paddingBottom: WATERMARK_CLEARANCE } : undefined}
    >
      <a
        href={MADE_WITH_LIFAFA_URL}
        target="_blank"
        rel="noopener"
        aria-label={`${MADE_WITH_LIFAFA} (opens in a new tab)`}
        className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-[0.78125rem] tracking-[0.03em] focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{
          color: ink,
          fontFamily: cardTheme.fontFamily,
          outlineColor: ink,
        }}
      >
        <CreditMark ink={ink} />
        <span style={{ opacity: INK_OPACITY }}>{MADE_WITH_LIFAFA}</span>
      </a>
    </div>
  );
}

/**
 * The V and its dot, from public/brand/lifafa-mark-*.svg, drawn here so the V
 * can take the card's ink. Cropped to the drawing, 13px tall.
 */
function CreditMark({ ink }: { ink: string }): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="2 14 96 62"
      width={20}
      height={13}
      className="shrink-0"
    >
      <path
        d="M10 22 L50 68 L90 22"
        fill="none"
        stroke={ink}
        strokeOpacity={INK_OPACITY}
        strokeWidth={16}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx="50" cy="32" r="13" fill={BRAND_RED} />
    </svg>
  );
}
