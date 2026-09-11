"use client";

import { useEffect, useState } from "react";
import { previewWeather } from "@/lib/weatherPreview";
import type { EventWeather } from "@/types/weather";

/**
 * Long enough that typing an address does not fire a lookup per keystroke,
 * short enough that a host who has stopped typing is not left wondering.
 */
const DEBOUNCE_MS = 700;

/**
 * The weather the editor's preview should draw, for a card not yet saved.
 *
 * Returns null until there is an answer — which is also what it returns when
 * there is no answer to be had, and the two look the same on purpose: a card
 * whose venue cannot be resolved shows no weather, so a preview that drew a
 * placeholder while it waited would be showing the host something no guest
 * will ever see.
 *
 * Only ever settles from the newest request. A host editing an address
 * produces a run of overlapping lookups, and without the cancelled flag a slow
 * early one could land after a fast later one and leave the preview showing
 * the sky over somewhere they have already typed past.
 */
export function useWeatherPreview({
  enabled,
  venueName,
  venueAddress,
  eventDate,
}: {
  enabled: boolean;
  venueName: string;
  venueAddress: string;
  eventDate: string;
}): EventWeather | null {
  const [weather, setWeather] = useState<EventWeather | null>(null);

  useEffect(() => {
    /*
      Switched off, or nothing to ask about yet. Cleared rather than left
      standing, so turning the switch off empties the preview at once instead
      of leaving the last reading sitting on a card that will not carry it.
    */
    if (!enabled || eventDate.length === 0) {
      setWeather(null);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(() => {
      void previewWeather(venueName, venueAddress, eventDate).then(
        (result) => {
          if (!cancelled) {
            setWeather(result);
          }
        },
        /*
          A server action can still fail for reasons lib/weather.ts never sees
          — an offline host, a deploy mid-edit. No weather, same as any other
          unanswerable venue, and nothing said about it: the host is editing a
          card, not debugging a network.
        */
        () => {
          if (!cancelled) {
            setWeather(null);
          }
        },
      );
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, venueName, venueAddress, eventDate]);

  return weather;
}
