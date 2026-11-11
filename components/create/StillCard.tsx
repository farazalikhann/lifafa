"use client";

import { useEffect, useRef, type ReactElement } from "react";
import { MotionStillContext } from "@/lib/motionBudget";
import TemplateCard from "@/templates/TemplateCard";
import { PREVIEW_INVITE } from "@/lib/calendar";
import type { Motif } from "@/lib/motifs";
import type { Theme } from "@/lib/themes";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { EventWeather, WeatherThemeId } from "@/types/weather";

/** The card drawn at a phone's size, in its own proportions, then scaled. */
export const STILL_WIDTH = 390;
export const STILL_HEIGHT = 720;

/** Long enough for any card's opening to have played. */
const SETTLE_MS = 2500;

/**
 * A still picture of the card's first screen: drawn at a phone's size and
 * scaled down, inert, so no part of it takes a touch, a scroll or the focus.
 *
 * The phone's preview on /create (components/create/CardPreview.tsx) and the
 * card on the sign-in page (components/auth/SavedCardPreview.tsx). Placed
 * absolutely at the top left of a box `STILL_WIDTH * scale` wide and
 * `STILL_HEIGHT * scale` high, which the caller draws.
 *
 * STILL MEANS STILL. Its floating layers start held, as for a guest who asked
 * for less movement (MotionStillContext, lib/motionBudget.ts), and once the
 * card's opening has played (SETTLE_MS) every CSS loop left in it is held
 * where it is (data-settled, app/globals.css): a picture this small costs the
 * phone nothing while the host reads and types beside it.
 */
export default function StillCard({
  draft,
  theme,
  config,
  motifs,
  weather,
  weatherTheme,
  scale,
}: {
  draft: EventDraft;
  theme: Theme;
  config: CardConfig;
  motifs: readonly Motif[];
  weather: EventWeather | null;
  weatherTheme: WeatherThemeId;
  scale: number;
}): ReactElement {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => root.current?.setAttribute("data-settled", ""), SETTLE_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div
      ref={root}
      data-motion-still=""
      aria-hidden="true"
      inert
      className="pointer-events-none absolute top-0 left-0 origin-top-left overflow-hidden select-none"
      style={{ width: STILL_WIDTH, height: STILL_HEIGHT, transform: `scale(${scale})` }}
    >
      <MotionStillContext.Provider value={true}>
      <TemplateCard
        draft={draft}
        theme={theme}
        config={config}
        motifs={motifs}
        sizing="frame"
        frameHeight={STILL_HEIGHT}
        invite={PREVIEW_INVITE}
        audience="host-preview"
        weather={weather}
        weatherTheme={weatherTheme}
        closingNote="card"
      />
      </MotionStillContext.Provider>
    </div>
  );
}
