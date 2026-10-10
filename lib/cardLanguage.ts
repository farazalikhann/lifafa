import type { CardLanguage, ScratchTarget } from "@/types/card";
import type { EventWeather } from "@/types/weather";

/**
 * Every word a card writes for itself, in each language a card can be made in.
 *
 * ONE TABLE, AND EVERY GUEST-FACING STRING IS IN IT. The card, the cover, the
 * reply form, the pass, the calendar file and the share text all read from
 * here, so a language is added by filling in one more entry rather than by
 * finding the sentences scattered across twenty components — and TypeScript
 * refuses a language that is missing any of them.
 *
 * WHAT IS NOT HERE: anything the host types, and anything only the host reads.
 * The editor, the dashboard and the note under a scratch panel in the preview
 * stay in English whatever the card is in; a host choosing Hindi is choosing
 * the language their guests read, not the one Lifafa talks to them in.
 *
 * Pure data and pure functions. Imported from server components, client
 * components and the share image alike, so nothing here may touch the DOM.
 */

export interface CardLanguageOption {
  id: CardLanguage;
  /** The language's name in its own script, which is what its readers look for. */
  nativeLabel: string;
  /** The same name in English, for a host scanning the editor in English. */
  englishLabel: string;
}

export const CARD_LANGUAGES: readonly CardLanguageOption[] = [
  { id: "en", nativeLabel: "English", englishLabel: "English" },
  { id: "hi", nativeLabel: "हिन्दी", englishLabel: "Hindi" },
];

/** What a new card is written in, and what every card saved before Hindi was. */
export const DEFAULT_CARD_LANGUAGE: CardLanguage = "en";

/**
 * A stored value as a language the card can actually be written in.
 *
 * card_config is a jsonb snapshot, so what comes back out of it is whatever was
 * written: no key at all on a card saved before languages existed, and in
 * principle anything on a row edited by hand. All of those are English.
 */
export function cardLanguage(value: unknown): CardLanguage {
  return CARD_LANGUAGES.some((option) => option.id === value)
    ? (value as CardLanguage)
    : DEFAULT_CARD_LANGUAGE;
}

/* ---------------------------------------------------------------------------
   The joining word.

   The one word the host types that the editor also offers, so it is the one
   place the host's text and the card's language meet. "weds" between two names
   written in Devanagari reads as a mistake on the card.
   --------------------------------------------------------------------------- */

/**
 * The joining words offered as one tap, per language.
 *
 * Index for index, the same word: switching a card's language swaps a preset
 * for the preset in the same position, and leaves anything the host typed
 * themselves alone. "&" is in both because it is in both.
 */
export const JOINER_PRESETS: Readonly<Record<CardLanguage, readonly string[]>> = {
  en: ["weds", "&", "and"],
  hi: ["संग", "&", "और"],
};

/**
 * The joining word to keep when the card moves from one language to another.
 *
 * Only a preset is translated. A word the host wrote for themselves is a
 * choice, and a language switch has no business rewriting it.
 */
export function swapJoinerWord(
  word: string,
  from: CardLanguage,
  to: CardLanguage,
): string {
  const index = JOINER_PRESETS[from].indexOf(word);

  return index === -1 ? word : (JOINER_PRESETS[to][index] ?? word);
}

/* ---------------------------------------------------------------------------
   The copy.
   --------------------------------------------------------------------------- */

export interface CardCopy {
  /**
   * The BCP 47 tag for the `lang` attribute of anything set in this copy.
   *
   * On the element holding the text, not only on <html>: the font matcher, the
   * line breaker, a screen reader's voice and the letter-spacing rule in
   * globals.css all key off the nearest one.
   */
  lang: string;
  /**
   * Which kind of script the copy is set in.
   *
   * Devanagari hangs its matras above a headline that Latin has nothing like,
   * so a leading that is generous for a Latin name stacks two lines of a Hindi
   * one into each other. The few places on the card set tighter than that ask
   * this rather than the language, so a second Devanagari language would not
   * have to find them again.
   */
  script: "latin" | "devanagari";

  cover: {
    namesPlaceholder: string;
    titlePlaceholder: string;
  };
  details: {
    dayPlaceholder: string;
    dateTimePlaceholder: string;
  };
  /** "Meet the Couple": the section's heading, and whose child each of the two is. */
  family: {
    heading: string;
    sonOf: string;
    daughterOf: string;
  };
  countdown: {
    heading: string;
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    /** Instead of the clock, from the moment it starts to the end of that day. */
    begun: string;
    /** Instead of the clock, from the day after. */
    passed: string;
    /** The four units again, short, for a tile too narrow for the word. */
    short: { days: string; hours: string; minutes: string; seconds: string };
    /** Under the clock on a card for two people: what it is counting down to. */
    untilVows: string;
    /** The same line on any other card. */
    until: string;
    /** On a function's chip under the clock: how far off its day is. */
    today: string;
    tomorrow: string;
    inDays: (days: number) => string;
  };
  venue: {
    namePlaceholder: string;
    addressPlaceholder: string;
    /** The location card's primary button, and what the map itself does. */
    getDirections: string;
    copyAddress: string;
    /** Shown for two seconds after the address is copied. */
    addressCopied: string;
    /** Under the disabled buttons while the venue is behind a scratch panel. */
    revealFirst: string;
  };
  timeline: {
    heading: string;
    /** The directions link under a function with a venue of its own. */
    directions: string;
    /** The calendar action on each function's card. */
    addToCalendar: string;
    /** On the next function still to come. */
    upNext: string;
    /** On a function that has already taken place. */
    celebrated: string;
    /** What the main event is called in the list when the host has not titled it. */
    primaryFallback: string;
  };
  scratch: Record<Exclude<ScratchTarget, "none">, string> & {
    /** What the label shrinks to on a patch too narrow for the sentence. */
    short: string;
    /** The button under the patch for a guest who cannot scratch. */
    reveal: string;
    /** Announced to a screen reader once the patch is gone. */
    revealed: string;
    /** The hint on or under a patch that covers a whole block. */
    hint: string;
    /** On a patch for a guest who asked for less motion: it opens on a tap. */
    tap: string;
  };
  /** The royal scroll, rolled up and waiting for a tap. See components/card/RoyalScroll.tsx. */
  scroll: {
    /** The words under the closed scroll. */
    hint: string;
    /** What the closed scroll is called as a button, for a screen reader. */
    open: string;
  };
  calendar: {
    /** The "Save the date" block under the countdown. */
    heading: string;
    subline: string;
    add: string;
    /** The button once the guest has chosen a calendar, for the rest of the visit. */
    added: string;
    /** Read out for the tear-off page, which is drawn rather than written. */
    pageLabel: (weekday: string, day: string, month: string, year: string) => string;
    /** The sheet of calendar choices. */
    sheetTitle: string;
    close: string;
    /** Marks the choice that suits the guest's device. */
    recommended: string;
    google: string;
    /** Under "Google Calendar" on an Android phone, where it opens the app. */
    googleNoteApp: string;
    /** Under "Google Calendar" everywhere else, where it opens a new tab. */
    googleNoteWeb: string;
    apple: string;
    appleNote: string;
    other: string;
    otherNote: string;
    /** Shown when an Android calendar app did not open after a tap. */
    notOpened: string;
    /** Shown up front inside WhatsApp, Instagram and other in-app browsers. */
    inAppBrowser: string;
    /** The entry's title when the host gave the event none. */
    titleFallback: string;
    hostedBy: (hosts: string) => string;
    invitationLink: (url: string) => string;
  };
  music: {
    play: string;
    pause: string;
  };
  weather: {
    forecastHeading: string;
    seasonalHeading: string;
    range: (highC: number, lowC: number) => string;
    seasonalNote: (years: number) => string;
    forecastSentence: (range: string, condition: string) => string;
    seasonalSentence: (range: string, condition: string) => string;
    /** The condition in this language, from the reading lib/weather.ts resolved. */
    condition: (weather: EventWeather) => string;
  };
  watermark: string;
  coverSkip: string;
  /**
   * The small heading over the card's first screen, above whatever opens it.
   * Not the closed cover's own heading (`coverInvite`), which is said before
   * the card is open and in a larger hand. See InvitedHeading.
   */
  invitedHeading: string;
  /** Under the loader while the card arrives, before the cover appears. */
  coverPreparing: string;
  /**
   * The cue pinned to the foot of the first screen, telling the guest the
   * card goes on below: the one word shown over its arrow, and the sentence a
   * screen reader is given in its place. See InvitedCue.
   */
  scrollCue: {
    word: string;
    label: string;
  };
  /**
   * What the closed cover says above its artwork, before the guest taps in:
   * the heading in a larger hand, and the line under it. See CoverShell.
   */
  coverInvite: {
    heading: string;
    line: string;
  };
  /**
   * The note under the reply form. `eventName` is what the card calls the
   * occasion, or null on a card that names nothing. With `couple` it is the
   * two names of a wedding, and the note says "the wedding of" them. See
   * ThankYouNote.
   */
  thankYou: (eventName: string | null, couple: boolean) => string;
  /**
   * The last thing on the page, under the note: the way to keep the card as
   * a PDF. See components/invite/KeepsakeSection.tsx and lib/pdfDownload.ts.
   */
  keepsake: {
    heading: string;
    button: string;
    /** While the printable copy is being laid out. */
    preparing: string;
    /** After the first tap: what to choose in the browser's own sheet. */
    hint: string;
    /** The same, on an iPhone, whose sheet has no such button. */
    hintIos: string;
    /** Beside the QR code on the printed copy. */
    scan: string;
    /** The printable copy's own button, for a visitor who opened it directly. */
    print: string;
    /** The way back to the card from the printable copy. */
    back: string;
    /** The saved file's name where the card names nobody. */
    fileFallback: string;
  };
  invite: {
    /** The page's heading when the card names neither an event nor anyone in it. */
    headingFallback: string;
    /** The share preview's title in the same case. */
    shareTitleFallback: string;
    shareDescription: (repliesOpen: boolean) => string;
    replyFailed: string;
    repliesClosed: string;
    /** A reply to an invitation that is not paid for yet. */
    notActive: string;
    /** Where the reply form was, once the event is over. */
    eventEnded: string;
  };
  rsvp: {
    heading: string;
    accepted: string;
    maybe: string;
    declined: string;
    partyQuestion: string;
    fewer: string;
    more: string;
    partyHint: string;
    name: string;
    nameMissing: string;
    phone: string;
    optional: string;
    phoneLength: (digits: number) => string;
    phoneWhyRequired: string;
    phoneWhyOptional: string;
    message: string;
    send: string;
    sending: string;
    chooseReply: string;
    addName: string;
    enterPhone: (digits: number) => string;
    phoneAllOrNothing: (digits: number) => string;
  };
  confirmed: {
    accepted: (firstName: string) => string;
    declined: string;
    maybe: string;
    party: (partySize: number) => string;
    sent: string;
    change: string;
  };
  pass: {
    heading: string;
    hint: string;
    save: string;
    saveFailed: string;
    codeLabel: (guestName: string) => string;
    shareTitle: (eventName: string) => string;
  };
  /**
   * The message a host sends with the link on WhatsApp.
   *
   * lib/shareMessage.ts decides which lines are used and in what order; every
   * word of them is here. Plain text for a chat: short lines, no emojis and no
   * em dashes, because WhatsApp shows it exactly as written.
   */
  whatsapp: {
    greeting: Record<WhatsAppGreeting, string>;
    /**
     * The opening sentence, then the names on a line of their own when there
     * are any. `title` is the event's title or null; `pairs` is whether the
     * occasion is about a couple (a wedding) rather than one host's event.
     */
    invite: (
      title: string | null,
      names: string | null,
      pairs: boolean,
    ) => readonly string[];
    /** Between the two names of a couple: "Aarav and Meera". */
    namesJoiner: string;
    date: string;
    time: string;
    venue: string;
    /** In place of the date and time while the date is behind a scratch panel. */
    dateHidden: string;
    /** In place of the venue while it is behind a scratch panel. */
    venueHidden: string;
    celebrations: string;
    /** After the fifth function, when there are more. */
    moreCelebrations: string;
    closing: string;
    signOff: string;
  };
}

/** Which greeting opens a WhatsApp message, from the card's tradition. */
export type WhatsAppGreeting = "muslim" | "hindu" | "sikh" | "other";

/** "the Wedding", but not "the The Wedding". */
function withThe(title: string): string {
  return /^the\s/i.test(title) ? title : `the ${title}`;
}

/**
 * WMO weather codes in Hindi, keyed exactly as CONDITIONS in lib/weather.ts.
 *
 * Keyed by the code and never by the English sentence, so the English can be
 * reworded without silently dropping a translation.
 */
const HINDI_CONDITIONS: Readonly<Record<number, string>> = {
  0: "साफ़ आसमान",
  1: "ज़्यादातर साफ़",
  2: "हल्के बादल",
  3: "घने बादल",
  45: "कोहरा",
  48: "जमा देने वाला कोहरा",
  51: "हल्की बूँदाबाँदी",
  53: "बूँदाबाँदी",
  55: "तेज़ बूँदाबाँदी",
  56: "जमा देने वाली बूँदाबाँदी",
  57: "तेज़, जमा देने वाली बूँदाबाँदी",
  61: "हल्की बारिश",
  63: "बारिश",
  65: "तेज़ बारिश",
  66: "जमा देने वाली बारिश",
  67: "तेज़, जमा देने वाली बारिश",
  71: "हल्की बर्फ़बारी",
  73: "बर्फ़बारी",
  75: "भारी बर्फ़बारी",
  77: "बर्फ़ के कण",
  80: "हल्की बौछारें",
  81: "बौछारें",
  82: "तेज़ बौछारें",
  85: "हल्की बर्फ़ीली बौछारें",
  86: "बर्फ़ीली बौछारें",
  95: "गरज के साथ तूफ़ान",
  96: "ओलों के साथ तूफ़ान",
  99: "भारी ओलों के साथ तूफ़ान",
};

const HINDI_UNKNOWN_CONDITION = "मिला-जुला मौसम";

/**
 * English, word for word what the card said before it had a language.
 *
 * Nothing on an English card may change because this table exists, so every
 * string here was lifted from the component that used to hold it.
 */
const ENGLISH: CardCopy = {
  lang: "en-IN",
  script: "latin",
  cover: {
    namesPlaceholder: "Your names",
    titlePlaceholder: "Event title",
  },
  details: {
    dayPlaceholder: "The day",
    dateTimePlaceholder: "Date and time",
  },
  family: {
    heading: "Meet the Couple",
    sonOf: "Son of",
    daughterOf: "Daughter of",
  },
  countdown: {
    heading: "Counting the Days",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
    begun: "Today is the day",
    passed: "Thank you for celebrating with us",
    short: { days: "Days", hours: "Hrs", minutes: "Min", seconds: "Sec" },
    untilVows: "until we say I do",
    until: "until we celebrate",
    today: "Today",
    tomorrow: "Tomorrow",
    inDays: (days) => `in ${days} days`,
  },
  venue: {
    namePlaceholder: "Venue name",
    addressPlaceholder: "Venue address",
    getDirections: "Get directions",
    copyAddress: "Copy address",
    addressCopied: "Address copied",
    revealFirst: "Reveal the venue first",
  },
  timeline: {
    heading: "The celebrations",
    directions: "Get directions",
    addToCalendar: "Add to calendar",
    upNext: "Up next",
    celebrated: "Celebrated",
    primaryFallback: "Main function",
  },
  scratch: {
    date: "Scratch to see the date",
    venue: "Scratch to see the venue",
    countdown: "Scratch to see the countdown",
    short: "Scratch",
    reveal: "Reveal without scratching",
    revealed: "Revealed.",
    hint: "Scratch to reveal",
    tap: "Tap to reveal",
  },
  scroll: {
    hint: "Tap to open",
    open: "Open to see the date",
  },
  calendar: {
    heading: "Save the Date",
    subline: "Mark your calendar. We cannot wait to celebrate with you.",
    add: "Add to my calendar",
    added: "Added to calendar",
    pageLabel: (weekday, day, month, year) =>
      `${weekday}, ${day} ${month} ${year}`,
    sheetTitle: "Add to your calendar",
    close: "Close",
    recommended: "Best for this device",
    google: "Google Calendar",
    googleNoteApp: "Opens the calendar app on this phone",
    googleNoteWeb: "Opens in a new tab",
    apple: "Apple Calendar",
    appleNote: "iPhone, iPad and Mac",
    other: "Other calendar (.ics file)",
    otherNote: "Outlook, Samsung Calendar and others",
    notOpened:
      "Nothing opened? Choose the .ics file below, or open this page in Chrome and try again.",
    inAppBrowser:
      "Viewing this inside WhatsApp or Instagram? If nothing opens, use the menu to open this page in your browser.",
    titleFallback: "Celebration",
    hostedBy: (hosts) => `Hosted by ${hosts}.`,
    invitationLink: (url) => `Invitation: ${url}`,
  },
  music: {
    play: "Play background music",
    pause: "Pause background music",
  },
  weather: {
    forecastHeading: "Forecast for the day",
    seasonalHeading: "Typical for this time of year",
    range: (highC, lowC) => `${highC}°C high, ${lowC}°C low`,
    seasonalNote: (years) =>
      `Averaged from the last ${years} years. This is not a forecast.`,
    forecastSentence: (range, condition) =>
      `Forecast for the day: ${range}, ${condition.toLowerCase()}.`,
    seasonalSentence: (range, condition) =>
      `Typically ${range} at this time of year, usually ${condition.toLowerCase()}. Not a forecast.`,
    condition: (weather) => weather.condition,
  },
  watermark: "Preview. Pay to remove this watermark.",
  coverSkip: "Skip",
  invitedHeading: "You are invited",
  coverPreparing: "Preparing your invitation",
  scrollCue: {
    word: "Scroll",
    label: "Scroll down to see the details",
  },
  coverInvite: {
    heading: "You are invited",
    line: "With joy in our hearts, we would love for you to celebrate with us",
  },
  keepsake: {
    heading: "Keep this invitation",
    button: "Save as PDF",
    preparing: "Preparing your copy",
    hint: "In the next screen, choose Save as PDF.",
    hintIos: "Tap Share, then Save to Files.",
    scan: "Scan to open the live invitation",
    print: "Save as PDF",
    back: "Back to the invitation",
    fileFallback: "Invitation",
  },
  thankYou: (eventName, couple) =>
    `Thank you for being part of our special day. We would be truly honoured by your presence at ${
      eventName === null
        ? "our celebration"
        : couple
          ? `the wedding of ${eventName}`
          : eventName
    }. Please do come and bless us with your love.`,
  invite: {
    headingFallback: "Invitation",
    shareTitleFallback: "Invitation · Lifafa",
    shareDescription: (repliesOpen) =>
      repliesOpen
        ? "You are invited. Tap to see the invitation and send your reply."
        : "You are invited. Tap to see the invitation.",
    replyFailed: "Could not send your reply, please try again.",
    repliesClosed: "The hosts are no longer taking replies.",
    notActive: "This invitation is not active yet, so it cannot take replies.",
    eventEnded: "This event has ended. Thank you for being part of it.",
  },
  rsvp: {
    heading: "Will you join us?",
    accepted: "Yes, I'll be there",
    maybe: "Maybe",
    declined: "Sorry, can't make it",
    partyQuestion: "How many people are coming, including you?",
    fewer: "One fewer person",
    more: "One more person",
    partyHint: "This helps the hosts plan the catering.",
    name: "Your name",
    nameMissing: "Please enter your name.",
    phone: "Phone number",
    optional: "(optional)",
    phoneLength: (digits) => `Phone number must be ${digits} digits.`,
    phoneWhyRequired:
      "So the hosts can count you in, and so you can change your reply later.",
    phoneWhyOptional: "Leave it empty if you would rather not.",
    message: "A message for the hosts",
    send: "Send my reply",
    sending: "Sending…",
    chooseReply: "Choose your reply to continue",
    addName: "Add your name to continue",
    enterPhone: (digits) => `Enter a ${digits} digit phone number`,
    phoneAllOrNothing: (digits) =>
      `A phone number needs all ${digits} digits, or leave it empty`,
  },
  confirmed: {
    accepted: (firstName) =>
      firstName.length > 0 ? `See you there, ${firstName}.` : "See you there.",
    declined: "Thank you for letting us know.",
    maybe: "We have noted your reply.",
    party: (partySize) =>
      partySize === 1
        ? "Just you"
        : `You and ${partySize - 1} ${partySize === 2 ? "other" : "others"}`,
    sent: "Your reply has been sent to the hosts.",
    change: "Change my reply",
  },
  pass: {
    heading: "Your entry pass",
    hint: "Show this code at the entrance on the day.",
    save: "Save my pass",
    saveFailed:
      "Could not save your pass. A screenshot of this code works just as well.",
    codeLabel: (guestName) => `Check-in code for ${guestName}`,
    shareTitle: (eventName) => `${eventName} · pass`,
  },
  whatsapp: {
    greeting: {
      muslim: "Assalamu Alaikum,",
      hindu: "Namaste,",
      sikh: "Sat Sri Akal,",
      other: "Dear friends and family,",
    },
    invite: (title, names, pairs) => {
      if (names === null) {
        if (title === null) {
          return ["With great joy, we invite you to our celebration."];
        }

        return pairs
          ? [`With great joy, we invite you to ${withThe(title)}.`]
          : [`With great joy, we invite you to celebrate ${title}.`];
      }

      if (pairs) {
        return [
          `With great joy, we invite you to ${withThe(title ?? "celebration")} of`,
          `${names}.`,
        ];
      }

      return [
        title === null
          ? "With great joy, we invite you to celebrate with"
          : `With great joy, we invite you to celebrate ${title} with`,
        `${names}.`,
      ];
    },
    namesJoiner: "and",
    date: "Date:",
    time: "Time:",
    venue: "Venue:",
    dateHidden: "Open the invitation to reveal the date",
    venueHidden: "Open the invitation to reveal the venue",
    celebrations: "Celebrations:",
    moreCelebrations: "And more in the invitation",
    closing:
      "Your presence would make our celebration truly special. Please open the invitation to see all the details and let us know if you can join us.",
    signOff: "With love,",
  },
};

/**
 * Hindi.
 *
 * WRITTEN NOT TO GUESS ANYONE'S GENDER. Hindi verbs agree with the person
 * doing them, so "I'll be there" has no neutral translation — आऊँगा and आऊँगी
 * each tell a guest which one the card assumed they were. The same rule
 * FamilySection keeps about S/O and D/O applies here: every line that would
 * have needed that guess is phrased around the event instead ("क्या आपका आना
 * होगा?" agrees with the coming, not with the guest), or around a noun.
 *
 * Plain, warm, everyday Hindi rather than the Sanskritised register of a
 * printed wedding card, because most of this is a form a guest fills in on a
 * phone.
 */
const HINDI: CardCopy = {
  lang: "hi-IN",
  script: "devanagari",
  cover: {
    namesPlaceholder: "आपके नाम",
    titlePlaceholder: "समारोह का नाम",
  },
  details: {
    dayPlaceholder: "दिन",
    dateTimePlaceholder: "तारीख़ और समय",
  },
  family: {
    heading: "वर-वधू",
    /* TODO(Faraz): verify these two Hindi labels with a native reader before launch. */
    sonOf: "सुपुत्र",
    daughterOf: "सुपुत्री",
  },
  countdown: {
    /* TODO(Faraz): verify this Hindi heading ("Counting the Days") with a native reader. */
    heading: "दिन गिन रहे हैं",
    days: "दिन",
    hours: "घंटे",
    minutes: "मिनट",
    seconds: "सेकंड",
    /* TODO(Faraz): verify this Hindi line ("Today is the day") with a native reader. */
    begun: "आज ही वह शुभ दिन है",
    passed: "हमारी ख़ुशी में शामिल होने के लिए शुक्रिया",
    short: { days: "दिन", hours: "घंटे", minutes: "मिनट", seconds: "सेकंड" },
    untilVows: "शुभ घड़ी तक",
    until: "शुभ घड़ी तक",
    /* TODO(Faraz): verify the three chip labels below with a native reader. */
    today: "आज",
    tomorrow: "कल",
    inDays: (days) => `${days} दिन बाद`,
  },
  venue: {
    namePlaceholder: "स्थान का नाम",
    addressPlaceholder: "स्थान का पता",
    getDirections: "रास्ता देखें",
    copyAddress: "पता कॉपी करें",
    addressCopied: "पता कॉपी हो गया",
    revealFirst: "पहले स्थान देख लीजिए",
  },
  timeline: {
    heading: "सभी कार्यक्रम",
    directions: "रास्ता देखें",
    addToCalendar: "कैलेंडर में जोड़ें",
    upNext: "अगला",
    celebrated: "संपन्न",
    primaryFallback: "मुख्य कार्यक्रम",
  },
  scratch: {
    date: "तारीख़ देखने के लिए खुरचें",
    venue: "स्थान देखने के लिए खुरचें",
    countdown: "उलटी गिनती देखने के लिए खुरचें",
    short: "खुरचें",
    reveal: "बिना खुरचे देखें",
    revealed: "दिख गया।",
    hint: "देखने के लिए खुरचें",
    tap: "देखने के लिए टैप करें",
  },
  /* TODO(Faraz): verify both Hindi lines. */
  scroll: {
    hint: "खोलने के लिए टैप करें",
    open: "तारीख़ देखने के लिए खोलें",
  },
  calendar: {
    heading: "तारीख़ याद रखिए",
    subline: "अपने कैलेंडर में जोड़ लीजिए, हमें आपका इंतज़ार रहेगा।",
    add: "मेरे कैलेंडर में जोड़ें",
    added: "कैलेंडर में जुड़ गया",
    pageLabel: (weekday, day, month, year) =>
      `${weekday}, ${day} ${month} ${year}`,
    sheetTitle: "अपना कैलेंडर चुनिए",
    close: "बंद करें",
    recommended: "इस डिवाइस के लिए सबसे अच्छा",
    google: "Google Calendar",
    googleNoteApp: "इस फ़ोन का कैलेंडर ऐप खुलेगा",
    googleNoteWeb: "नए टैब में खुलेगा",
    apple: "Apple Calendar",
    appleNote: "iPhone, iPad और Mac",
    other: "दूसरा कैलेंडर (.ics फ़ाइल)",
    otherNote: "Outlook, Samsung Calendar और दूसरे",
    notOpened:
      "कुछ नहीं खुला? नीचे .ics फ़ाइल चुनिए, या यह पेज Chrome में खोलकर फिर कोशिश कीजिए।",
    inAppBrowser:
      "WhatsApp या Instagram के अंदर देख रहे हैं? अगर कुछ न खुले, तो मेनू से यह पेज अपने ब्राउज़र में खोलिए।",
    titleFallback: "समारोह",
    hostedBy: (hosts) => `आयोजक: ${hosts}`,
    invitationLink: (url) => `निमंत्रण: ${url}`,
  },
  music: {
    play: "पृष्ठभूमि संगीत चलाएँ",
    pause: "पृष्ठभूमि संगीत रोकें",
  },
  weather: {
    forecastHeading: "उस दिन का मौसम पूर्वानुमान",
    seasonalHeading: "साल के इस समय का आम मौसम",
    range: (highC, lowC) => `अधिकतम ${highC}°C, न्यूनतम ${lowC}°C`,
    seasonalNote: (years) =>
      `पिछले ${years} वर्षों का औसत। यह पूर्वानुमान नहीं है।`,
    forecastSentence: (range, condition) =>
      `उस दिन का पूर्वानुमान: ${range}, ${condition}।`,
    seasonalSentence: (range, condition) =>
      `साल के इस समय आम तौर पर ${range}, ज़्यादातर ${condition}। यह पूर्वानुमान नहीं है।`,
    condition: (weather) =>
      weather.conditionCode === null
        ? HINDI_UNKNOWN_CONDITION
        : (HINDI_CONDITIONS[weather.conditionCode] ?? HINDI_UNKNOWN_CONDITION),
  },
  watermark: "पूर्वावलोकन। वॉटरमार्क हटाने के लिए भुगतान करें।",
  coverSkip: "छोड़ें",
  invitedHeading: "आप आमंत्रित हैं",
  coverPreparing: "आपका निमंत्रण तैयार हो रहा है",
  scrollCue: {
    word: "स्क्रॉल करें",
    /* TODO(Faraz): verify this Hindi line with a native reader before launch. */
    label: "विवरण देखने के लिए नीचे स्क्रॉल करें",
  },
  coverInvite: {
    heading: "आप सादर आमंत्रित हैं",
    /* TODO(Faraz): verify this Hindi line with a native reader before launch. */
    line: "हृदय की प्रसन्नता के साथ, हम चाहते हैं कि आप हमारी ख़ुशियों में शामिल हों",
  },
  /* TODO(Faraz): verify this Hindi note, and "के विवाह", with a native reader before launch. */
  /* TODO(Faraz): verify these Hindi lines. The button names are the browser's own, left in English. */
  keepsake: {
    heading: "इस निमंत्रण को संभाल कर रखें",
    button: "PDF सेव करें",
    preparing: "आपकी प्रति तैयार हो रही है",
    hint: "अगली स्क्रीन में Save as PDF चुनें।",
    hintIos: "Share दबाएँ, फिर Save to Files चुनें।",
    scan: "लाइव निमंत्रण खोलने के लिए स्कैन करें",
    print: "PDF सेव करें",
    back: "निमंत्रण पर वापस जाएँ",
    fileFallback: "Invitation",
  },
  thankYou: (eventName, couple) =>
    `हमारे इस ख़ास दिन का हिस्सा बनने के लिए आपका धन्यवाद। ${
      eventName === null
        ? "हमारे समारोह"
        : couple
          ? `${eventName} के विवाह`
          : eventName
    } में आपकी उपस्थिति हमारे लिए बड़े सम्मान की बात होगी। कृपया अवश्य पधारें और अपने प्रेम व आशीर्वाद से हमें अनुगृहीत करें।`,
  invite: {
    headingFallback: "निमंत्रण",
    shareTitleFallback: "निमंत्रण · Lifafa",
    shareDescription: (repliesOpen) =>
      repliesOpen
        ? "आप सादर आमंत्रित हैं। निमंत्रण देखने और अपना जवाब भेजने के लिए टैप करें।"
        : "आप सादर आमंत्रित हैं। निमंत्रण देखने के लिए टैप करें।",
    replyFailed: "आपका जवाब नहीं भेजा जा सका, कृपया फिर से कोशिश करें।",
    repliesClosed: "मेज़बान अब जवाब नहीं ले रहे हैं।",
    notActive: "यह निमंत्रण अभी सक्रिय नहीं है, इसलिए इस पर जवाब नहीं भेजे जा सकते।",
    eventEnded: "यह कार्यक्रम संपन्न हो चुका है। इसका हिस्सा बनने के लिए धन्यवाद।",
  },
  rsvp: {
    heading: "क्या आपका आना होगा?",
    accepted: "हाँ, ज़रूर",
    maybe: "शायद",
    declined: "माफ़ कीजिए, नहीं हो पाएगा",
    partyQuestion: "आपको मिलाकर कुल कितने लोग आएँगे?",
    fewer: "एक व्यक्ति कम",
    more: "एक व्यक्ति और",
    partyHint: "इससे मेज़बानों को खाने-पीने का इंतज़ाम करने में मदद मिलेगी।",
    name: "आपका नाम",
    nameMissing: "कृपया अपना नाम लिखें।",
    phone: "फ़ोन नंबर",
    optional: "(वैकल्पिक)",
    phoneLength: (digits) => `फ़ोन नंबर ${digits} अंकों का होना चाहिए।`,
    phoneWhyRequired:
      "ताकि मेज़बान आपको गिनती में शामिल कर सकें, और आप बाद में अपना जवाब बदल सकें।",
    phoneWhyOptional: "न देना चाहें तो ख़ाली छोड़ दें।",
    message: "मेज़बानों के लिए संदेश",
    send: "जवाब भेजें",
    sending: "भेजा जा रहा है…",
    chooseReply: "आगे बढ़ने के लिए अपना जवाब चुनें",
    addName: "आगे बढ़ने के लिए अपना नाम लिखें",
    enterPhone: (digits) => `${digits} अंकों का फ़ोन नंबर लिखें`,
    phoneAllOrNothing: (digits) =>
      `फ़ोन नंबर के पूरे ${digits} अंक लिखें, या इसे ख़ाली छोड़ दें`,
  },
  confirmed: {
    accepted: (firstName) =>
      firstName.length > 0
        ? `${firstName}, आपका इंतज़ार रहेगा।`
        : "आपका इंतज़ार रहेगा।",
    declined: "बताने के लिए धन्यवाद।",
    maybe: "आपका जवाब दर्ज कर लिया गया है।",
    party: (partySize) =>
      partySize === 1 ? "सिर्फ़ आप" : `आप और ${partySize - 1} अन्य`,
    sent: "आपका जवाब मेज़बानों तक पहुँच गया है।",
    change: "जवाब बदलें",
  },
  pass: {
    heading: "आपका प्रवेश पास",
    hint: "समारोह के दिन प्रवेश द्वार पर यह कोड दिखाएँ।",
    save: "पास सहेजें",
    saveFailed:
      "पास सहेजा नहीं जा सका। इस कोड का स्क्रीनशॉट भी उतना ही काम करेगा।",
    codeLabel: (guestName) => `${guestName} का चेक-इन कोड`,
    shareTitle: (eventName) => `${eventName} · प्रवेश पास`,
  },
  whatsapp: {
    greeting: {
      muslim: "अस्सलामु अलैकुम,",
      hindu: "नमस्ते,",
      sikh: "सत श्री अकाल,",
      other: "प्रिय मित्रों और परिवारजनों,",
    },
    /*
      One sentence for every occasion, with the names under it as a caption,
      the way a printed card sets them under "शुभ विवाह". Joining them into the
      sentence ("आरव और मीरा के/की …") would need the gender of whatever title
      the host typed, which nothing here knows.
    */
    invite: (title, names) => [
      `बड़ी ख़ुशी के साथ हम आपको ${title ?? "समारोह"} में आमंत्रित करते हैं।`,
      ...(names === null ? [] : [names]),
    ],
    namesJoiner: "और",
    date: "तारीख़:",
    time: "समय:",
    venue: "स्थान:",
    dateHidden: "तारीख़ देखने के लिए निमंत्रण खोलें",
    venueHidden: "स्थान देखने के लिए निमंत्रण खोलें",
    celebrations: "कार्यक्रम:",
    moreCelebrations: "और भी कार्यक्रम निमंत्रण में देखें",
    closing:
      "आपकी उपस्थिति हमारी ख़ुशी को और ख़ास बना देगी। पूरी जानकारी के लिए निमंत्रण खोलें और हमें बताएं कि आप आ पाएंगे या नहीं।",
    signOff: "प्यार सहित,",
  },
};

const COPY: Readonly<Record<CardLanguage, CardCopy>> = {
  en: ENGLISH,
  hi: HINDI,
};

/** Always resolves — the type admits no language without a table. */
export function cardCopy(language: CardLanguage): CardCopy {
  return COPY[language];
}
