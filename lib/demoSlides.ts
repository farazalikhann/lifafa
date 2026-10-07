/**
 * The sample invitation's carousel on the home page: where the card opens,
 * the size a frame draws it at, and the frames in order.
 *
 * ON ITS OWN, AWAY FROM THE CARD (lib/demoCards.ts), and with nothing
 * imported but a type. This is what the home page's own script reads, and
 * everything it imports is downloaded by every visitor before they have
 * scrolled: the card itself, its palettes and its words come later, in the
 * chunk that draws a frame.
 */

import type { CardSectionId } from "@/types/card";

/** Where the whole card opens. */
export const DEMO_NIKAH_PATH = "/demo/nikah";

/**
 * The size a carousel frame draws the card at before it is scaled to fit: a
 * phone 390px wide, in the frame's own 9 by 19.5.
 */
export const DEMO_STAGE_WIDTH = 390;
export const DEMO_STAGE_HEIGHT = 845;

/** One frame of the home page's carousel: one screen of the sample. */
export interface DemoSlide {
  id: string;
  /** Under the frame, in a few words. */
  caption: string;
  /** What the frame shows, for someone who cannot see it. */
  label: string;
  /**
   * The one section of the card the frame draws, or "closed" for the cover a
   * guest meets before any of it.
   */
  screen: CardSectionId | "closed";
}

/** The carousel, in the order a guest meets the card. */
export const DEMO_NIKAH_SLIDES: readonly DemoSlide[] = [
  {
    id: "opening",
    caption: "The opening",
    label:
      "Closed red velvet curtains with You are invited and the names Ayaan Siddiqui and Zoya Rizvi, and a Tap to open button.",
    screen: "closed",
  },
  {
    id: "bismillah",
    caption: "Bismillah and dua",
    label:
      "Bismillah in black calligraphy under hanging lights and a crescent, then Assalamu Alaikum and Barakallahu feekum in Arabic, transliteration and English.",
    screen: "cover",
  },
  {
    id: "couple",
    caption: "Meet the couple",
    label:
      "Meet the Couple: Ayaan Siddiqui, son of Mr. Imran Siddiqui and Mrs. Nazia Siddiqui, and Zoya Rizvi, daughter of Mr. Arshad Rizvi and Mrs. Farah Rizvi, both of Lucknow, each beside a painted figure.",
    screen: "family",
  },
  {
    id: "countdown",
    caption: "Countdown to the day",
    label: "A countdown in days, hours, minutes and seconds inside a frame of roses.",
    screen: "countdown",
  },
  {
    id: "venue",
    caption: "Venue with directions",
    label:
      "A painting of a banquet hall above The Crescent Garden Banquet, its address in Lucknow, and buttons for directions and to copy the address.",
    screen: "venue",
  },
  {
    id: "date",
    caption: "Save the date",
    label:
      "Save the Date on an open gold scroll: Saturday 12 December 2026, 7:00 PM, at The Crescent Garden Banquet, with an Add to my calendar button.",
    screen: "details",
  },
  {
    id: "functions",
    caption: "Every function in one place",
    label:
      "The Celebrations: Mehndi on 11 December, the Nikah Ceremony on 12 December and the Walima on 13 December, each with its time, place, directions and a calendar link.",
    screen: "timeline",
  },
  {
    id: "note",
    caption: "A note from the families",
    label:
      "A note: With the blessings of Allah, we invite you to celebrate the Nikah of our children. Your presence and duas will make our joy complete.",
    screen: "message",
  },
];
