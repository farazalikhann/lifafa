"use server";

import { geocodeVenue, getEventWeather } from "@/lib/weather";
import type { EventWeather } from "@/types/weather";

/**
 * The reading for a card that has not been saved yet.
 *
 * The editor's preview says "exactly what your guests will see", and for the
 * weather it was not telling the truth: a host could switch it on, choose a
 * treatment for it and see nothing, because the reading is resolved on the
 * server and the preview is a client component with no way to ask for one.
 * They found out whether the choice had worked by saving, opening the guest
 * link and looking.
 *
 * A server action is the way a client component asks a server question, so
 * that is what this is. It repeats what createEvent does at save time —
 * geocode the venue, then read the sky over it — against the draft in front of
 * the host rather than against a stored row.
 *
 * Both calls underneath are cached by Next's fetch cache and keyed by URL, so
 * a host nudging the same address around pays for the first lookup and not the
 * rest, and the answer this returns is the same one their guests will get.
 *
 * Never throws: everything in lib/weather.ts returns null on failure, and null
 * here means the preview shows no weather — which is also what the card would
 * do with the same venue.
 */

/*
  Long enough for any venue anyone writes, short enough that nothing strange
  can be pushed through this into an upstream query string. The values are
  already URL encoded where they are used; this is about size, not escaping.
*/
const MAX_FIELD_LENGTH = 200;

export async function previewWeather(
  venueName: string,
  venueAddress: string,
  eventDate: string,
): Promise<EventWeather | null> {
  const name = venueName.slice(0, MAX_FIELD_LENGTH);
  const address = venueAddress.slice(0, MAX_FIELD_LENGTH);

  /* Nothing to look up. Saves a request on every keystroke before the venue exists. */
  if (name.trim().length === 0 && address.trim().length === 0) {
    return null;
  }

  const coordinates = await geocodeVenue(name, address);

  return getEventWeather(coordinates, eventDate);
}
