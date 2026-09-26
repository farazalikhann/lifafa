import {
  calendarPageText,
  formatWhen,
  readableAddress,
  resolveCoverNames,
} from "@/lib/cardFormat";
import { cardCopy, type WhatsAppGreeting } from "@/lib/cardLanguage";
import { timelineEntries } from "@/lib/cardSections";
import { cardInLanguage, inviteLinkIn } from "@/lib/cardTranslation";
import { pairsNames } from "@/lib/occasions";
import type { CardConfig, CardLanguage } from "@/types/card";
import type { EventDraft } from "@/types/event";
import type { TraditionId } from "@/types/occasion";

/**
 * The WhatsApp message a host sends with their invitation.
 *
 * Built from the card in the language it is being shared in, so the message
 * and the card it links to say the same names, date and venue. Every word is
 * in lib/cardLanguage.ts; this only decides which lines go in and in what
 * order. A line with nothing to say is left out rather than sent half empty.
 *
 * NOTHING BEHIND A SCRATCH PANEL. A card that hides its date or venue is
 * saving the surprise for the guest, and a message that printed it above the
 * link would spoil it before the card was opened.
 *
 * Pure, so the dashboard builds it on the server for every language and the
 * share sheet only has to hold the text.
 */

/** How many functions the message lists before pointing at the card. */
const MAX_CELEBRATIONS = 5;

function greetingFor(tradition: TraditionId): WhatsAppGreeting {
  return tradition === "muslim" || tradition === "hindu" || tradition === "sikh"
    ? tradition
    : "other";
}

/*
  States, and the country, as they end an Indian address. The city is the
  part of the address before them, and the guest wants the city.
*/
const NOT_A_CITY = new Set(
  [
    "india",
    "andhra pradesh",
    "arunachal pradesh",
    "assam",
    "bihar",
    "chhattisgarh",
    "goa",
    "gujarat",
    "haryana",
    "himachal pradesh",
    "jharkhand",
    "karnataka",
    "kerala",
    "madhya pradesh",
    "maharashtra",
    "manipur",
    "meghalaya",
    "mizoram",
    "nagaland",
    "odisha",
    "orissa",
    "punjab",
    "rajasthan",
    "sikkim",
    "tamil nadu",
    "telangana",
    "tripura",
    "uttar pradesh",
    "uttarakhand",
    "west bengal",
    "jammu and kashmir",
    "ladakh",
    "भारत",
    "उत्तर प्रदेश",
    "मध्य प्रदेश",
    "राजस्थान",
    "बिहार",
    "महाराष्ट्र",
    "गुजरात",
    "हरियाणा",
    "पंजाब",
    "झारखंड",
    "छत्तीसगढ़",
    "उत्तराखंड",
    "हिमाचल प्रदेश",
    "तेलंगाना",
    "कर्नाटक",
    "पश्चिम बंगाल",
  ],
);

/** Longer than this and a comma-less "city" is the whole address. */
const MAX_CITY_LENGTH = 40;

/**
 * The city from a free-text address, or null.
 *
 * "Road No. 1, Banjara Hills, Hyderabad, Telangana 500034, India" reads as
 * Hyderabad: the last part that is not a PIN code, a state or the country.
 * A guess, and a careful one: anything it cannot place is left out, and the
 * venue's name still carries the line.
 */
export function venueCity(venueAddress: string): string | null {
  const parts = readableAddress(venueAddress)
    .split(/[,\n]/)
    .map((part) =>
      part
        .replace(/\b\d{3}\s?\d{3}\b/g, "")
        .replace(/[\s\-–.]+$/g, "")
        .trim(),
    )
    .filter(
      (part) =>
        part.length > 0 &&
        !/^\d+$/.test(part) &&
        !NOT_A_CITY.has(part.toLowerCase()),
    );
  const city = parts.at(-1);

  return city !== undefined && city.length <= MAX_CITY_LENGTH ? city : null;
}

/** "Taj Krishna, Hyderabad", without saying Hyderabad twice. */
function venueLine(venueName: string, venueAddress: string): string | null {
  const name = venueName.trim();
  const city = venueCity(venueAddress);

  if (name.length === 0) {
    return city;
  }

  return city === null || name.toLowerCase().includes(city.toLowerCase())
    ? name
    : `${name}, ${city}`;
}

/** "10 December, 4:00 PM" / "10 दिसंबर, शाम 4:00 बजे": the year is the card's. */
function functionWhen(
  date: string,
  time: string,
  language: CardLanguage,
): string | null {
  const page = calendarPageText(date, time, language);

  if (page === null) {
    return null;
  }

  const day = `${page.day} ${page.month}`;

  return page.time === null ? day : `${day}, ${page.time}`;
}

/** The host's names for the sign-off: the parents, one family to a line. */
function signOffNames(draft: EventDraft): readonly string[] {
  return [draft.partyOneParents, draft.partyTwoParents]
    .map((value) => (value ?? "").trim())
    .filter((value) => value.length > 0);
}

/**
 * The whole message, ready for a WhatsApp text box.
 *
 * `inviteUrl` is the card's link with no language on it; the message carries
 * the one it is written in, so the guest opens the card they were told about.
 */
export function buildShareMessage(
  storedDraft: EventDraft,
  storedConfig: CardConfig,
  inviteUrl: string,
  language: CardLanguage,
): string {
  const { draft, config } = cardInLanguage(storedDraft, storedConfig, language);
  const copy = cardCopy(language);
  const words = copy.whatsapp;
  const blocks: string[][] = [];

  blocks.push([words.greeting[greetingFor(config.traditionId)]]);

  /* Who and what: the names as the card's cover resolves them. */
  const cover = resolveCoverNames(draft, config.occasionId, language);
  const coverNames =
    cover.kind === "pair"
      ? `${cover.first} ${words.namesJoiner} ${cover.second}`
      : cover.isPlaceholder
        ? null
        : cover.text;
  const title = draft.eventTitle.trim();
  /* "Anaya's First Birthday" has already said Anaya. */
  const names =
    coverNames !== null &&
    title.toLowerCase().includes(coverNames.toLowerCase())
      ? null
      : coverNames;

  blocks.push([
    ...words.invite(
      title.length > 0 ? title : null,
      names,
      pairsNames(config.occasionId),
    ),
  ]);

  /* When and where, with whatever the scratch panel is keeping back left back. */
  const details: string[] = [];

  if (config.scratchTarget === "date") {
    details.push(words.dateHidden);
  } else {
    const date = formatWhen(draft.eventDate, "", language);
    const time = calendarPageText(draft.eventDate, draft.eventTime, language)?.time;

    if (date !== null) {
      details.push(`${words.date} ${date}`);
    }

    if (time !== null && time !== undefined) {
      details.push(`${words.time} ${time}`);
    }
  }

  if (config.scratchTarget === "venue") {
    details.push(words.venueHidden);
  } else {
    const venue = venueLine(draft.venueName, draft.venueAddress);

    if (venue !== null) {
      details.push(`${words.venue} ${venue}`);
    }
  }

  if (details.length > 0) {
    blocks.push(details);
  }

  /*
    The other functions, earliest first, as the card's timeline orders them.
    The card keeps their dates on show when the main date is scratched, and so
    does this: only the main event's date is the surprise.
  */
  const functions = timelineEntries(draft, language)
    .filter((entry) => entry.id !== "primary" && entry.label.trim().length > 0)
    .map((entry) => {
      const when = functionWhen(entry.date, entry.time, language);
      const label = entry.label.trim();

      return when === null ? label : `${label}: ${when}`;
    });

  if (functions.length > 0) {
    blocks.push([
      words.celebrations,
      ...functions.slice(0, MAX_CELEBRATIONS),
      ...(functions.length > MAX_CELEBRATIONS ? [words.moreCelebrations] : []),
    ]);
  }

  blocks.push([words.closing]);
  blocks.push([inviteLinkIn(inviteUrl, language)]);

  /* Signed only when there is someone to sign it; otherwise it ends on the link. */
  const signers = signOffNames(draft);

  if (signers.length > 0) {
    blocks.push([words.signOff, ...signers]);
  }

  return blocks.map((lines) => lines.join("\n")).join("\n\n");
}

/** WhatsApp with the message typed in and the contact left to the host. */
export function whatsappShareUrl(message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
