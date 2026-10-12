"use client";

import { useState, type ReactElement, type ReactNode } from "react";
import CheckinPanel from "@/components/create/CheckinPanel";
import CoverAnimationPicker from "@/components/create/CoverAnimationPicker";
import MusicPanel from "@/components/create/MusicPanel";
import PdfPanel from "@/components/create/PdfPanel";
import WeatherPicker from "@/components/create/WeatherPicker";
import CollapsibleSection, {
  type Accordion,
} from "@/components/editor/CollapsibleSection";
import ToggleSwitch from "@/components/editor/ToggleSwitch";
import { CARD_SECTIONS } from "@/lib/cardSections";
import { getFontPair, pairRoleVar } from "@/lib/fontPairs";
import { getPalette } from "@/lib/palettes";
import {
  selectedPalette,
  withTemplatePalette,
} from "@/templates/shared/customize";
import type { TemplateConfig } from "@/templates/types";
import type { CardBorderStyle } from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { CardBlock } from "@/types/customSection";
import type { CardStyle, FontPairId } from "@/types/style";
import type { WeatherThemeId } from "@/types/weather";

const HEADING =
  "text-[0.6875rem] tracking-[0.26em] text-[var(--lifafa-marigold)] uppercase";
const OPTION =
  "flex min-h-14 min-w-0 items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]";
const OPTION_ON = "border-[var(--lifafa-marigold)] bg-[var(--lifafa-ink-raised)]";
const OPTION_OFF =
  "border-[var(--lifafa-hairline)] hover:border-[var(--lifafa-marigold)]/60";

function Group({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id={id} className={HEADING}>
          {title}
        </h2>
        {hint !== undefined ? (
          <p className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
            {hint}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

/**
 * Step 3: the little that can be changed about a template.
 *
 * Its two or three colourways, its two or three type pairs, the music, and
 * which sections the card shows. Everything else about the look is the
 * template's and is not offered: that is what choosing a template means.
 *
 * Under those, folded away, the things that are not about the look at all and
 * are off or at their default until asked for: the opening animation, the
 * weather, check-in at the door and the PDF copy. They are the tabbed editor's
 * own panels, unchanged.
 *
 * Holds nothing of the card's. Every value comes in and every change goes out
 * to the wizard's useCardEditor; only what is folded open is kept here.
 */
export default function CustomizeStep({
  template,
  namesLine,
  style,
  onLookChange,
  onFontPairChange,
  blocks,
  onBlocksChange,
  rsvpEnabled,
  onRsvpEnabledChange,
  countdownScratched,
  onCountdownScratchedChange,
  musicUrl,
  onMusicUrlChange,
  coverAnimation,
  onCoverAnimationChange,
  showWeather,
  weatherTheme,
  onShowWeatherChange,
  onWeatherThemeChange,
  qrCheckinEnabled,
  onQrCheckinEnabledChange,
  pdfDownload,
  onPdfDownloadChange,
}: {
  template: TemplateConfig;
  /** The names as the cover sets them, for the type samples. */
  namesLine: string;
  style: CardStyle;
  /** A colourway: the style it gives, and the border that goes with it. */
  onLookChange: (style: CardStyle, borderStyle: CardBorderStyle) => void;
  onFontPairChange: (fontPairId: FontPairId) => void;
  blocks: readonly CardBlock[];
  onBlocksChange: (blocks: readonly CardBlock[]) => void;
  rsvpEnabled: boolean;
  onRsvpEnabledChange: (enabled: boolean) => void;
  /** Whether guests scratch to see the countdown. Offered only by a template that draws it. */
  countdownScratched: boolean;
  onCountdownScratchedChange: (scratched: boolean) => void;
  musicUrl: string | null;
  onMusicUrlChange: (musicUrl: string | null) => void;
  coverAnimation: CoverAnimationId;
  onCoverAnimationChange: (coverAnimation: CoverAnimationId) => void;
  showWeather: boolean;
  weatherTheme: WeatherThemeId;
  onShowWeatherChange: (showWeather: boolean) => void;
  onWeatherThemeChange: (weatherTheme: WeatherThemeId) => void;
  qrCheckinEnabled: boolean;
  onQrCheckinEnabledChange: (enabled: boolean) => void;
  pdfDownload: boolean;
  onPdfDownloadChange: (enabled: boolean) => void;
}): ReactElement {
  const chosen = selectedPalette(template, style);

  /* Which panel is folded open, and whether "More options" is. Not the card's. */
  const [openId, setOpenId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const accordion: Accordion = {
    openId,
    onToggle: (id) => setOpenId((previous) => (previous === id ? null : id)),
  };

  /* The sections this template lets a host switch, that the card has a block for. */
  const switchable = blocks.filter(
    (block): block is Extract<CardBlock, { kind: "builtin" }> =>
      block.kind === "builtin" && template.sections.includes(block.id),
  );

  const setSection = (id: string, enabled: boolean): void => {
    onBlocksChange(
      blocks.map((block) =>
        block.kind === "builtin" && block.id === id
          ? { ...block, enabled }
          : block,
      ),
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-9">
      {/* A template whose artwork is one colour has no colourway to choose. */}
      {template.palettes.length > 1 ? (
      <Group id="customize-colours" title="Colours">
        <div
          role="radiogroup"
          aria-labelledby="customize-colours"
          className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3"
        >
          {template.palettes.map((palette) => {
            const colours = getPalette(palette.paletteId);
            const active = chosen === palette;

            return (
              <button
                key={palette.id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => {
                  const next = withTemplatePalette(template, style, palette);
                  onLookChange(next.style, next.borderStyle);
                }}
                className={`${OPTION} ${active ? OPTION_ON : OPTION_OFF}`}
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[var(--lifafa-hairline)]"
                  style={{ backgroundColor: colours.background }}
                >
                  <span
                    className="size-3.5 rounded-full"
                    style={{
                      backgroundColor: palette.accentOverride ?? colours.accent,
                    }}
                  />
                </span>
                <span className="min-w-0 truncate text-[0.9375rem] font-medium text-[var(--lifafa-cream)]">
                  {palette.label}
                </span>
              </button>
            );
          })}
        </div>
      </Group>
      ) : null}

      <Group id="customize-fonts" title="Fonts">
        <div
          role="radiogroup"
          aria-labelledby="customize-fonts"
          className="flex flex-col gap-2"
        >
          {template.fontPairs.map((id) => {
            const pair = getFontPair(id);
            const active = style.fontPairId === id;

            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onFontPairChange(id)}
                className={`${OPTION} justify-between ${active ? OPTION_ON : OPTION_OFF}`}
              >
                {/* The names in the pair's own face; `truncate` keeps a long pair of names on one line. */}
                <span
                  className="min-w-0 truncate text-xl text-[var(--lifafa-cream)]"
                  style={{ fontFamily: `var(${pairRoleVar(pair, "names")})` }}
                >
                  {namesLine}
                </span>
                <span className="shrink-0 text-xs text-[var(--lifafa-muted)]">
                  {pair.label}
                </span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group
        id="customize-sections"
        title="Sections"
        hint="Switch off anything you do not want on the card. A section with nothing in it is left off anyway."
      >
        <ul className="flex flex-col divide-y divide-[var(--lifafa-hairline)] rounded-2xl border border-[var(--lifafa-hairline)] px-4">
          {switchable.map((block) => (
            <li
              key={block.id}
              className="flex min-h-14 items-center justify-between gap-3 py-1.5"
            >
              <span className="min-w-0 text-[0.9375rem] text-[var(--lifafa-cream)]">
                {CARD_SECTIONS[block.id].label}
              </span>
              <ToggleSwitch
                checked={block.enabled}
                onChange={(enabled) => setSection(block.id, enabled)}
                label={CARD_SECTIONS[block.id].label}
              />
            </li>
          ))}
          <li className="flex min-h-14 items-center justify-between gap-3 py-1.5">
            <span className="min-w-0 text-[0.9375rem] text-[var(--lifafa-cream)]">
              Reply form (RSVP)
            </span>
            <ToggleSwitch
              checked={rsvpEnabled}
              onChange={onRsvpEnabledChange}
              label="Reply form (RSVP)"
            />
          </li>
          {template.countdownScratch === true ? (
            <li className="flex min-h-14 items-center justify-between gap-3 py-1.5">
              <span className="min-w-0 text-[0.9375rem] text-[var(--lifafa-cream)]">
                Scratch to reveal the countdown
              </span>
              <ToggleSwitch
                checked={countdownScratched}
                onChange={onCountdownScratchedChange}
                label="Scratch to reveal the countdown"
              />
            </li>
          ) : null}
        </ul>
      </Group>

      <div className="flex min-w-0 flex-col gap-3">
        <MusicPanel
          musicUrl={musicUrl}
          onMusicUrlChange={onMusicUrlChange}
          accordion={accordion}
        />

        <CollapsibleSection
          title="More options"
          summary={
            template.cover === undefined
              ? "Cover, weather, check-in, PDF"
              : "Weather, check-in, PDF"
          }
          isOpen={moreOpen}
          onToggle={() => setMoreOpen((open) => !open)}
        >
          <div className="flex min-w-0 flex-col gap-3">
            {/* A template with a cover of its own opens with that one. */}
            {template.cover === undefined ? (
              <CoverAnimationPicker
                coverAnimation={coverAnimation}
                onChange={onCoverAnimationChange}
                accordion={accordion}
              />
            ) : null}
            <WeatherPicker
              showWeather={showWeather}
              weatherTheme={weatherTheme}
              onShowWeatherChange={onShowWeatherChange}
              onWeatherThemeChange={onWeatherThemeChange}
              accordion={accordion}
            />
            <CheckinPanel
              enabled={qrCheckinEnabled}
              onEnabledChange={onQrCheckinEnabledChange}
              repliesOpen={rsvpEnabled}
              accordion={accordion}
            />
            <PdfPanel
              enabled={pdfDownload}
              onEnabledChange={onPdfDownloadChange}
              accordion={accordion}
            />
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}
