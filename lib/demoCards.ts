/**
 * The sample invitation: a Nikah card that exists only in this file.
 *
 * WHAT IT IS FOR. The home page shows it screen by screen, and /demo/nikah
 * opens it whole, exactly as a guest's link would. Both draw it with the real
 * card, from the same types a saved card has, so what a visitor is shown is
 * the product and cannot fall behind it the way a screenshot does.
 *
 * IT NEVER TOUCHES THE DATABASE. Nothing reads it from Supabase and nothing
 * writes to it: there is no row, no invite code that resolves under /i/, and
 * a reply to it is kept in the browser tab and nowhere else (see `demo` on
 * InviteExperience). The people on it are invented.
 *
 * EVERY FIELD IS ONE THE EDITOR CAN SET. The design below is a card a host
 * could make by hand in the Design tab: the Cream palette with the inks that
 * come with it, the Royal fonts, the slim rose gold border, the Muslim pack's
 * hanging lights, crescent and stars with Bismillah above the names, the
 * royal texture, the scroll for the date, the banquet hall above the venue,
 * red butterflies and rose petals, behind the Curtain reveal.
 */

import { DEFAULT_SECTION_ORDER } from "@/lib/cardSections";
import { cardPalette, paletteTextColors } from "@/lib/textColors";
import type { CardConfig, CardSectionId } from "@/types/card";
import type { CoverAnimationId } from "@/types/coverAnimation";
import type { StoredEvent } from "@/types/database";
import type { EventDraft } from "@/types/event";

/*
  Where the card opens, and the carousel's own table, are in lib/demoSlides.ts:
  the home page reads those before any of the card's code has arrived, and a
  module that names a palette brings the palettes with it.
*/
export { DEMO_NIKAH_PATH } from "@/lib/demoSlides";

/**
 * What stands where a real card has its invite code: the key its scratch and
 * language choices are remembered under, and the stable half of its calendar
 * entries' ids. Not a code anything under /i/ will open.
 */
export const DEMO_NIKAH_CODE = "demo-nikah";

/**
 * What the sample's pass carries in its QR: a token no guest was ever issued,
 * so the code is a real one that scans and checks nobody in.
 */
export const DEMO_CHECKIN_TOKEN = "sample-pass-not-valid";

const VENUE = "The Crescent Garden Banquet";
const VENUE_ADDRESS = "Vibhuti Khand, Gomti Nagar, Lucknow 226010";

const DRAFT: EventDraft = {
  partyOneName: "Ayaan Siddiqui",
  partyTwoName: "Zoya Rizvi",
  joinerWord: "&",
  hostNames: "",
  eventTitle: "Nikah Ceremony",
  eventDate: "2026-12-12",
  eventTime: "19:00",
  venueName: VENUE,
  venueAddress: VENUE_ADDRESS,
  message:
    "With the blessings of Allah, we invite you to celebrate the Nikah of our children. Your presence and duas will make our joy complete.",
  /* The wedding occasion's own theme; every colour on it is the palette's. */
  themeId: "marigold",
  subEvents: [
    {
      id: "demo-mehndi",
      label: "Mehndi",
      date: "2026-12-11",
      time: "18:00",
      venueName: "Rizvi Residence",
      venueAddress: "Hazratganj, Lucknow 226001",
    },
    {
      id: "demo-walima",
      label: "Walima",
      date: "2026-12-13",
      time: "20:00",
      venueName: VENUE,
      venueAddress: VENUE_ADDRESS,
    },
  ],
  partyOneParents: "Mr. Imran Siddiqui and Mrs. Nazia Siddiqui",
  partyOneCity: "Lucknow",
  partyTwoParents: "Mr. Arshad Rizvi and Mrs. Farah Rizvi",
  partyTwoCity: "Lucknow",
};

const CONFIG: CardConfig = {
  themeId: DRAFT.themeId,
  musicUrl: null,
  blocks: DEFAULT_SECTION_ORDER.map((id) => ({
    kind: "builtin" as const,
    id,
    enabled: true,
  })),
  decorMotion: "float",
  decorIntensity: "normal",
  butterflies: "red",
  leaves: false,
  petals: "both",
  petalFlower: "rose",
  occasionId: "wedding",
  traditionId: "muslim",
  language: "en",
  rsvpEnabled: true,
  scratchTarget: "none",
  venueIllustration: "banquet",
  royalTexture: true,
  dateReveal: "scroll",
  divider: "rose",
  borderStyle: "flowerRosegold",
  style: {
    fontPairId: "royal",
    paletteId: "cream",
    density: "comfortable",
    accentOverride: null,
    /* The two inks Cream brings, as a host who picks the palette gets them. */
    textColors: paletteTextColors("cream"),
  },
  ornamentConfig: {
    enabledOrnaments: [
      "crescentMoon",
      "hangingLights",
      "stars",
      "geometricStar",
      "arabesqueBorder",
      "bismillah",
    ],
    greetingId: "salam",
    /* "Barakallahu feekum", May Allah bless you: the pack's dua for any occasion. */
    blessingId: "generalBarakah",
  },
  isPaid: true,
};

const COVER: CoverAnimationId = "curtain-reveal";

/**
 * The sample as the guest's page takes an invitation: the shape a stored
 * event has, so InviteExperience draws it through the path a real one takes.
 */
export const DEMO_NIKAH: StoredEvent = {
  id: DEMO_NIKAH_CODE,
  inviteCode: DEMO_NIKAH_CODE,
  config: CONFIG,
  draft: DRAFT,
  isPaid: true,
  coverAnimation: COVER,
  showWeather: false,
  coordinates: null,
  weatherTheme: null,
  /* On, so a yes is answered with a pass and its QR, as it is on a card that has check-in. */
  qrCheckinEnabled: true,
  changes: {
    originalEndDate: null,
    dateChangeCount: 0,
    nameChangeCount: 0,
    editUnlockedUntil: null,
  },
};

/** The sample card's own ground: what a frame shows until the card is in it. */
export const DEMO_NIKAH_GROUND = cardPalette(CONFIG.style).background;

/**
 * The sample as a carousel frame draws it: the screen the frame is of, with
 * nothing in motion.
 *
 * THE CARD, CUT DOWN TO WHAT THE FRAME NEEDS, never a section on its own. A
 * section alone would be drawn as no guest ever sees it: at the very top of
 * the card, under the hanging lights, with no names across the head of the
 * screen. So the cover is always kept before it, and the frame is scrolled to
 * the section (see DemoSlideCard), which is where the names band and the
 * dissolve under it come from. The date's screen is kept too: a card without
 * one offers its calendar button elsewhere, on a strip that is not part of
 * any screen shown here.
 *
 * Nothing flying or falling, because eight cards side by side on a low-end
 * phone cannot afford it, and a butterfly that settles on a line of text in a
 * frame nobody can scroll stays there. The ornaments, the border, the texture
 * and the words are the card's own, untouched.
 */
export function demoSlideConfig(section: CardSectionId): CardConfig {
  const kept: readonly CardSectionId[] =
    section === "cover" || section === "details"
      ? ["cover", "details"]
      : ["cover", "details", section];

  return {
    ...CONFIG,
    blocks: kept.map((id) => ({ kind: "builtin" as const, id, enabled: true })),
    decorMotion: "none",
    butterflies: "none",
    leaves: false,
    petals: "none",
  };
}
