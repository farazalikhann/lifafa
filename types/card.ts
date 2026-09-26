import type { CardBlock } from "@/types/customSection";
import type { ThemeId } from "@/types/event";
import type { OccasionId, TraditionId } from "@/types/occasion";
import type { OrnamentConfig } from "@/types/ornament";
import type { CardStyle } from "@/types/style";

export type CardSectionId =
  | "cover"
  | "family"
  | "details"
  | "countdown"
  | "venue"
  | "timeline"
  | "message";

/**
 * How the scattered motifs move.
 *
 * "roam" is the odd one out and costs the most: the other three travel a short
 * fixed path and repeat, while a roaming shape wanders through several offsets
 * across a large area over half a minute. DecorLayer caps how many of those it
 * will draw for exactly that reason.
 */
export type DecorMotion = "float" | "fall" | "drift" | "roam" | "none";

/** How much decoration the canvas scatters. */
export type DecorIntensity = "subtle" | "normal" | "lively";

/**
 * The decorative frame drawn around the card's edges.
 *
 * Independent of `traditionId` on purpose, and the only decor on the card that
 * is: an ornament pack says something about whose wedding this is, whereas a
 * border is a piece of stationery. Every style is offered on every card.
 *
 * "none" is the default and is a real member rather than a null, so the card
 * never has to distinguish "no border chosen" from "border turned off".
 *
 * The photographic styles are the odd ones out — see PhotoBorderStyle.
 */
export type CardBorderStyle =
  | "none"
  | "floralVine"
  | "cornerSprigs"
  | "geometricRule"
  | "scallopedFrame"
  | "hangingGarland"
  | PhotoBorderStyle;

/**
 * The borders that are photographs rather than line art.
 *
 * Named as their own union because almost everything downstream wants to ask
 * the question: they are placed as a nine-slice instead of being drawn from a
 * path table, they take no spec, tile or corner piece, and they are the only
 * borders the card's text has to stand clear of on both axes. Everything that
 * follows from being one — where each is cut, how far the names stand off it,
 * how it is scaled — lives in lib/flowerFrame.ts.
 *
 * "flowerBackground" is spelt for the whole family rather than for its own
 * colour because it shipped alone, before there was a family, and the id is
 * written into every card saved since.
 */
export type PhotoBorderStyle =
  | "flowerBackground"
  | "flowerGold"
  | "flowerPurple"
  | "flowerRed"
  | "flowerRuby"
  | "flowerCrimson"
  | "flowerBlue"
  | "flowerBlush"
  | "flowerIvory"
  | "flowerPearl"
  | "flowerNoir"
  | "flowerRosegold";

/**
 * The butterflies a host can put on their card.
 *
 * "none" is a real member rather than a null, the way it is for the border, so
 * the card never has to tell "no butterflies chosen" from "butterflies turned
 * off". "mixed" flies all three, cycled across the flight table.
 */
export type ButterflyStyle = "none" | "red" | "yellow" | "purple" | "mixed";

/** The three colours, without the two words that are not colours. */
export type ButterflyColour = Exclude<ButterflyStyle, "none" | "mixed">;

/**
 * Whether, and how, rose petals come down on the card.
 *
 * "open" is a single shower at the moment the card opens — as the cover hands
 * over, or as the page loads on a card without one — that falls away and is
 * gone within a few seconds. "fall" is a steady fall in the side margins for as
 * long as the card is open. "both" is the two together.
 */
export type PetalStyle = "none" | "open" | "fall" | "both";

/**
 * Which flower the petals are: the rose they always were, one of three more,
 * or a mixture. The mode above is when they come down; this is what does.
 */
export type PetalFlower = "rose" | "marigold" | "mogra" | "lotus" | "mixed";

/**
 * Which section, if any, a guest has to scratch open before they can read it.
 *
 * At most one. Two scratch panels on a single card turn an ornament into a
 * chore, and a guest who gives up on the second one never reaches the RSVP.
 */
export type ScratchTarget = "none" | "date" | "venue" | "countdown";

/**
 * The language the card writes its own words in.
 *
 * Only the words the card supplies: the headings, the placeholders, the date,
 * the countdown's units, the calendar buttons, the cover's prompt and the reply
 * form. What the host types — the names, the venue, the note — is theirs and is
 * shown exactly as typed, in whatever script they typed it in.
 *
 * A two letter code rather than a locale, because it is written into every card
 * saved from now on and a card has one language, not a region. Where a locale
 * is needed, lib/cardLanguage.ts derives it.
 */
export type CardLanguage = "en" | "hi";

/**
 * Who the card is being drawn for.
 *
 * The guest's card is the live one. The editor's inline preview repaints on
 * every keystroke, so anything a guest has to *do* — the scratch panel — is
 * rendered there already satisfied: the host is shown what exists rather than
 * asked to re-earn it each time they fix a typo. The full screen preview counts
 * as "guest", because its whole promise is that it behaves like the real thing.
 */
export type CardAudience = "guest" | "host-preview";

/**
 * How tall a section should be.
 *
 * "viewport" sizes against the guest's screen. "frame" sizes against the fixed
 * preview frame in the editor, so the host sees the same proportions a guest
 * would rather than sections that overflow the frame on a desktop monitor.
 */
export type CardSizing = "viewport" | "frame";

export interface CardConfig {
  themeId: ThemeId;
  /**
   * A link to an audio file the guest may choose to play, or null.
   *
   * A URL and not an upload. Hosting audio and clearing music rights are both
   * out of scope for this step: the first needs storage, a size cap and a
   * scanner, and the second is a question about somebody else's copyright that
   * a form field cannot answer. So the host brings their own link and the note
   * under the field says whose responsibility that is.
   *
   * Null on every card saved before this existed, and absent from those rows
   * entirely — CardCanvas reads it with `?? null` for that reason. Nothing ever
   * plays without a tap; see components/card/MusicToggle.tsx.
   */
  musicUrl: string | null;
  /** Ordered — the canvas renders blocks in exactly this sequence. */
  blocks: readonly CardBlock[];
  decorMotion: DecorMotion;
  decorIntensity: DecorIntensity;
  /**
   * Which butterflies, if any, fly in the card's margins.
   *
   * Their own field rather than another motif in the scatter, because they are
   * a photograph: the scatter is line art held under a contrast ceiling so text
   * can be read through it, and a full colour insect at that alpha is a smudge.
   * components/card/decor/ButterflyLayer.tsx is where that leads.
   *
   * Not a boolean, although it was one for an afternoon. A host picking
   * butterflies is picking a colour — the card already has a palette, and three
   * colours of insect arriving unasked is a decision made for them. "mixed" is
   * still there for the host who wants all three; it is one of the choices
   * rather than the only behaviour.
   *
   * Read through `butterflyStyle` in lib/butterflies.ts, never directly: cards
   * saved before this existed carry no key at all, and cards saved during that
   * afternoon carry `true` or `false`.
   */
  butterflies: ButterflyStyle;
  /**
   * Whether leaves drift in the margins.
   *
   * Rode the butterfly switch until hosts asked for one without the other.
   * Absent from every card saved before then, and on those cards the leaves
   * came with the butterflies — so read it through `leavesOn` in
   * lib/butterflies.ts, which gives such a card exactly what it had.
   */
  leaves: boolean;
  /**
   * Flower petals: a shower when the card opens, a steady fall in the margins,
   * both, or none. Absent from older cards; read through `petalStyle` in
   * lib/petals.ts, which turns a missing key into "none".
   */
  petals: PetalStyle;
  /**
   * Which flower `petals` brings. Absent from every card saved before there
   * was a choice, all of which had rose petals — so read it through
   * `petalFlowerType` in lib/petals.ts, which turns a missing key into "rose".
   */
  petalFlower: PetalFlower;
  occasionId: OccasionId;
  traditionId: TraditionId;
  /**
   * Which language the card writes its own words in.
   *
   * Absent from every card saved before Hindi existed, which is every one of
   * them so far. toStoredEvent and the editor both read it through
   * `cardLanguage` in lib/cardLanguage.ts, which turns a missing or unknown
   * value into English — exactly what those cards have always been.
   */
  language: CardLanguage;
  /**
   * Whether the reply form follows the card.
   *
   * The only way a host collects replies, and not every host wants to: a card
   * sent to share the date, or to people who will be counted some other way,
   * is better without a form asking them a question nobody is reading the
   * answers to.
   *
   * Absent from every card saved before the switch existed, and those cards
   * all had a form, so a missing key means on. Read through `rsvpEnabled` in
   * lib/cardSections.ts, never with a truthiness test.
   */
  rsvpEnabled: boolean;
  /** Which section sits behind a scratch panel, if any. */
  scratchTarget: ScratchTarget;
  /**
   * The decorative frame around the card's edges.
   *
   * Sits on the config beside the other decor decisions rather than inside
   * `style`, because it is a piece of the card's furniture the same way the
   * motif scatter is — and like the scatter, it is drawn by the canvas rather
   * than inherited by the sections.
   */
  borderStyle: CardBorderStyle;
  /** Host overrides for typography, colour and card length. */
  style: CardStyle;
  /**
   * The Muslim ornament pack's choices: which ornaments are on, and which
   * greeting and dua head the card.
   *
   * Always present, and always read through `traditionId` — the card acts on it
   * only when the tradition is "muslim", and the editor resets it to its
   * defaults the moment the host picks a different one. A card that is not a
   * Muslim card therefore cannot render a Muslim ornament even if a stale
   * config were somehow to reach it.
   */
  ornamentConfig: OrnamentConfig;
  /**
   * Whether this invitation has been paid for.
   *
   * Lives on the config rather than beside it because it is the one thing that
   * changes how the finished card is presented: an unpaid card is watermarked
   * wherever it is shown. Nothing charges anyone yet — a stored event is paid
   * by definition today, and the editor's own draft is not.
   */
  isPaid: boolean;
  /**
   * The host's own wording of the WhatsApp message, per language, kept from
   * the share sheet on the dashboard. Absent until a host edits one, and a
   * language with no entry sends the message built from the card.
   *
   * Written only by saveShareMessage, never by the editor: the editor builds
   * its config from its own controls, so updateEvent carries this across from
   * the stored row. Stripped from the guest's read, since it is the host's.
   */
  shareMessages?: Partial<Record<CardLanguage, SavedShareMessage>>;
}

/** A WhatsApp message the host rewrote. See CardConfig.shareMessages. */
export interface SavedShareMessage {
  text: string;
  /**
   * The message the card built when the host edited it. When the card
   * builds a different one now (the date or venue moved), the share sheet
   * says the host's version may be out of date.
   */
  basedOn: string;
}
