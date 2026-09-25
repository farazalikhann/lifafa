"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import FoldedMap from "@/components/card/FoldedMap";
import ScratchPanel, { type ScratchConfig } from "@/components/card/ScratchPanel";
import { useScratchReveal } from "@/components/card/ScratchReveal";
import { useInView } from "@/hooks/useInView";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import {
  REVEAL_BASE,
  SECTION_REVEAL_OPTIONS,
  directionsUrl,
  lineDelay,
  placeholderOpacity,
  readableAddress,
  resolve,
  revealClass,
} from "@/lib/cardFormat";
import { cardCopy } from "@/lib/cardLanguage";
import { cardPx, cardRem } from "@/lib/cardScale";
import { readableOn } from "@/lib/contrast";
import type { Theme } from "@/lib/themes";
import type { CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";

/** The section's own rhythm, shared with the group the panel covers. */
const GAP = "calc(1 * var(--card-rem, 1rem) * var(--card-gap-scale, 1))";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** How long "Address copied" stays up. */
const COPIED_MS = 2000;

/**
 * Puts text on the clipboard, and says whether it got there.
 *
 * The async API first. Where it is missing or refused — an older WebView, an
 * in-app browser, a page not served over https — the old select-and-copy on a
 * hidden textarea, which is deprecated but still works almost everywhere the
 * new one does not.
 */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard !== undefined && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* Fall through to the old way. */
  }

  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

function DirectionsIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" aria-hidden="true">
      <path
        d="M12 21.5s-6.5-6.9-6.5-11.5a6.5 6.5 0 0 1 13 0c0 4.6-6.5 11.5-6.5 11.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CopyIcon(): ReactElement {
  return (
    <svg viewBox="0 0 24 24" width="1.15em" height="1.15em" fill="none" aria-hidden="true">
      <rect x="8.5" y="8.5" width="11" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M15.5 8.5V6a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

/**
 * Where the celebration is, as a location card: a folded paper map with a pin
 * in the middle of it, the venue's name on a ribbon, the address, and the two
 * things a guest wants to do with an address.
 *
 * GET DIRECTIONS opens Google Maps' directions to the venue — the app on a
 * phone that has it, the website otherwise — built by `directionsUrl`, which
 * uses a Maps link or a "lat, lng" the host pasted in place of the words when
 * there is one. The map itself is the same link, for the guest who taps the
 * picture. COPY ADDRESS puts the name and the address on the clipboard, for
 * the taxi app or the family group.
 *
 * THE SCRATCH PANEL, when the host hid the venue, covers the name and the
 * address and nothing else: the map is decoration and gives nothing away, so
 * it stays. Both buttons are held until the venue is revealed, because either
 * would hand the guest exactly what the panel is hiding, and the map is not a
 * link until then either. The reveal is the card's shared one (see
 * ScratchReveal.tsx): the time and venue line under Save the date opens with
 * this panel, and a reload in the same session finds it open.
 */
export default function VenueSection({
  draft,
  theme,
  minHeight,
  pad,
  scratch,
  language,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
  /** Content inset, top and bottom, in px — see CoverSection for what it is for. */
  pad: number;
  /** Set when this is the section the host chose to hide; null otherwise. */
  scratch: ScratchConfig | null;
  /** The language the placeholders and the buttons are written in. */
  language: CardLanguage;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>(SECTION_REVEAL_OPTIONS);
  const reducedMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const shared = useScratchReveal(scratch === null ? undefined : "venue");
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }
    },
    [],
  );

  const copy = cardCopy(language);
  const venue = resolve(draft.venueName, copy.venue.namePlaceholder);
  const address = resolve(
    readableAddress(draft.venueAddress),
    copy.venue.addressPlaceholder,
  );
  const directions = directionsUrl(
    draft.venueName,
    draft.venueAddress,
    draft.venueMapsLink,
  );

  /*
    Covered while there is a panel a guest could still scratch. The host's
    preview clears its panels, and reduced motion draws none, so neither holds
    the buttons.
  */
  const locked =
    scratch !== null &&
    !scratch.preCleared &&
    !reducedMotion &&
    shared.revealed === null;

  const onAccent = readableOn(theme.accent, [theme.background, theme.textPrimary]);
  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;
  const isDevanagari = copy.script === "devanagari";

  /* The name and the address, with a pasted Maps link kept if it is all there is. */
  const clipboardText = [
    draft.venueName.trim(),
    readableAddress(draft.venueAddress) || draft.venueAddress.trim(),
  ]
    .filter((part) => part.length > 0)
    .join(", ");

  const handleCopy = (): void => {
    void copyText(clipboardText).then((ok) => {
      if (!ok) {
        return;
      }

      setCopied(true);

      if (copiedTimer.current !== null) {
        window.clearTimeout(copiedTimer.current);
      }

      copiedTimer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
    });
  };

  const map = <FoldedMap theme={theme} shown={isInView} />;

  /*
    A link once there is somewhere to go and nothing hiding it. Out of the tab
    order and hidden from a screen reader, because the button under it is the
    same link with words on it; this is for the thumb that taps the picture.
  */
  const mapBlock: ReactNode =
    directions !== null && !locked ? (
      <a
        href={directions}
        target="_blank"
        rel="noopener noreferrer"
        tabIndex={-1}
        aria-hidden="true"
        className="block w-full transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        {map}
      </a>
    ) : (
      map
    );

  const where = (
    <div className="flex flex-col items-center text-center" style={{ gap: GAP }}>
      {/*
        The ribbon. Notched at both ends, in the accent, with the name in the
        pair's heading face in whichever of the card's two text colours reads
        on it. A long name wraps inside it rather than running off the card.
      */}
      <p
        className="max-w-full px-7 py-2 text-[calc(1.3*var(--card-rem,1rem))] break-words text-balance"
        style={{
          backgroundColor: theme.accent,
          color: onAccent,
          fontFamily: "var(--card-heading)",
          fontWeight: "var(--card-heading-weight)" as unknown as number,
          lineHeight: isDevanagari ? 1.55 : 1.25,
          clipPath:
            "polygon(0 0, 100% 0, calc(100% - 0.7rem) 50%, 100% 100%, 0 100%, 0.7rem 50%)",
          opacity: placeholderOpacity(venue.isPlaceholder, "primary"),
        }}
      >
        {venue.text}
      </p>

      {/*
        A guest has to be able to read the address in full, so it is never
        truncated: 34ch and text-pretty, and `break-words` for a plus code or a
        run-together landmark name that would otherwise run off the card.
      */}
      <p
        className="max-w-[34ch] text-[calc(0.9*var(--card-rem,1rem))] leading-relaxed break-words text-pretty"
        style={{
          color: theme.textMuted,
          opacity: placeholderOpacity(address.isPlaceholder, "muted"),
        }}
      >
        {address.text}
      </p>
    </div>
  );

  const buttonBase =
    "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-[calc(0.9*var(--card-rem,1rem))] font-semibold whitespace-nowrap transition-[transform,opacity] duration-150 focus-visible:outline-2 focus-visible:outline-offset-4 motion-reduce:transition-none";

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 text-center"
      style={{
        minHeight,
        paddingTop: cardPx(pad),
        paddingBottom: cardPx(pad),
        gap: GAP,
      }}
    >
      <div className="w-full" style={{ maxWidth: cardRem(18.5) }}>
        {mapBlock}
      </div>

      <div className={reveal} style={lineDelay(1)}>
        {scratch === null ? (
          where
        ) : (
          <ScratchPanel
            {...scratch}
            label={copy.scratch.hint}
            showRevealButton={false}
            fit="box"
          >
            {where}
          </ScratchPanel>
        )}
      </div>

      {directions !== null ? (
        <div
          className={`mt-1 flex flex-col items-center gap-2 ${reveal}`}
          style={lineDelay(2)}
        >
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {locked ? (
              <button
                type="button"
                disabled
                className={`${buttonBase} cursor-not-allowed opacity-45`}
                style={{ backgroundColor: theme.accent, color: onAccent }}
              >
                <DirectionsIcon />
                {copy.venue.getDirections}
              </button>
            ) : (
              <a
                href={directions}
                target="_blank"
                rel="noopener noreferrer"
                className={`${buttonBase} hover:-translate-y-px active:scale-[0.98] motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100`}
                style={{
                  backgroundColor: theme.accent,
                  color: onAccent,
                  outlineColor: theme.accent,
                  boxShadow: `0 6px 18px -10px ${theme.accent}`,
                }}
              >
                <DirectionsIcon />
                {copy.venue.getDirections}
              </a>
            )}

            <button
              type="button"
              onClick={handleCopy}
              disabled={locked}
              className={`${buttonBase} border enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:enabled:hover:translate-y-0`}
              style={{
                borderColor: `${theme.accent}99`,
                color: theme.textPrimary,
                outlineColor: theme.accent,
              }}
            >
              <CopyIcon />
              {copy.venue.copyAddress}
            </button>
          </div>

          {/*
            One line under the buttons that is either the reason they are held,
            with the way round the panel for a guest who cannot scratch, or the
            two second note that the copy worked. Announced politely either way.
          */}
          <div aria-live="polite" className="flex min-h-6 flex-col items-center">
            {locked ? (
              <>
                <p className="text-[calc(0.8125*var(--card-rem,1rem))]" style={{ color: theme.textMuted }}>
                  {copy.venue.revealFirst}
                </p>
                <button
                  type="button"
                  onClick={shared.reveal}
                  className="min-h-11 rounded-full px-3 text-xs font-medium underline decoration-transparent underline-offset-4 opacity-70 transition-opacity duration-150 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: theme.accent, outlineColor: theme.accent }}
                >
                  {copy.scratch.reveal}
                </button>
              </>
            ) : copied ? (
              <p
                className="lifafa-reveal-in text-[calc(0.8125*var(--card-rem,1rem))] font-medium"
                style={{ color: theme.textPrimary }}
              >
                {copy.venue.addressCopied}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
