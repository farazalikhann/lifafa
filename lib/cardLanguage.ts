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
    scrollCue: string;
  };
  details: {
    dayPlaceholder: string;
    dateTimePlaceholder: string;
  };
  countdown: {
    heading: string;
    days: string;
    hours: string;
    minutes: string;
    seconds: string;
    today: string;
    passed: string;
  };
  venue: {
    namePlaceholder: string;
    addressPlaceholder: string;
    openInMaps: string;
  };
  timeline: {
    heading: string;
    mapLink: string;
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
  };
  calendar: {
    addToGoogle: string;
    downloadIcs: string;
    hint: string;
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
  invite: {
    /** The page's heading when the card names neither an event nor anyone in it. */
    headingFallback: string;
    /** The share preview's title in the same case. */
    shareTitleFallback: string;
    shareDescription: (repliesOpen: boolean) => string;
    replyFailed: string;
    repliesClosed: string;
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
  /** The line a host's WhatsApp share opens with, ahead of the link. */
  shareMessage: string;
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
    scrollCue: "Scroll",
  },
  details: {
    dayPlaceholder: "The day",
    dateTimePlaceholder: "Date and time",
  },
  countdown: {
    heading: "The countdown",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
    today: "Today.",
    passed: "This celebration has taken place.",
  },
  venue: {
    namePlaceholder: "Venue name",
    addressPlaceholder: "Venue address",
    openInMaps: "Open in Maps",
  },
  timeline: {
    heading: "The celebrations",
    mapLink: "Map",
    primaryFallback: "Main function",
  },
  scratch: {
    date: "Scratch to see the date",
    venue: "Scratch to see the venue",
    countdown: "Scratch to see the countdown",
    short: "Scratch",
    reveal: "Reveal without scratching",
    revealed: "Revealed.",
  },
  calendar: {
    addToGoogle: "Add to Google Calendar",
    downloadIcs: "Download for Apple or Outlook",
    hint: "Save the date to your calendar.",
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
  invite: {
    headingFallback: "Invitation",
    shareTitleFallback: "Invitation — Lifafa",
    shareDescription: (repliesOpen) =>
      repliesOpen
        ? "You are invited. Tap to see the invitation and send your reply."
        : "You are invited. Tap to see the invitation.",
    replyFailed: "Could not send your reply, please try again.",
    repliesClosed: "The hosts are no longer taking replies.",
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
    shareTitle: (eventName) => `${eventName} — pass`,
  },
  shareMessage: "You are invited! Here are the details:",
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
    scrollCue: "नीचे देखें",
  },
  details: {
    dayPlaceholder: "दिन",
    dateTimePlaceholder: "तारीख़ और समय",
  },
  countdown: {
    heading: "उलटी गिनती",
    days: "दिन",
    hours: "घंटे",
    minutes: "मिनट",
    seconds: "सेकंड",
    today: "आज ही है।",
    passed: "यह समारोह संपन्न हो चुका है।",
  },
  venue: {
    namePlaceholder: "स्थान का नाम",
    addressPlaceholder: "स्थान का पता",
    openInMaps: "मैप में खोलें",
  },
  timeline: {
    heading: "सभी कार्यक्रम",
    mapLink: "मैप",
    primaryFallback: "मुख्य कार्यक्रम",
  },
  scratch: {
    date: "तारीख़ देखने के लिए खुरचें",
    venue: "स्थान देखने के लिए खुरचें",
    countdown: "उलटी गिनती देखने के लिए खुरचें",
    short: "खुरचें",
    reveal: "बिना खुरचे देखें",
    revealed: "दिख गया।",
  },
  calendar: {
    addToGoogle: "Google Calendar में जोड़ें",
    downloadIcs: "Apple या Outlook के लिए डाउनलोड करें",
    hint: "यह तारीख़ अपने कैलेंडर में सहेज लें।",
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
  invite: {
    headingFallback: "निमंत्रण",
    shareTitleFallback: "निमंत्रण — Lifafa",
    shareDescription: (repliesOpen) =>
      repliesOpen
        ? "आप सादर आमंत्रित हैं। निमंत्रण देखने और अपना जवाब भेजने के लिए टैप करें।"
        : "आप सादर आमंत्रित हैं। निमंत्रण देखने के लिए टैप करें।",
    replyFailed: "आपका जवाब नहीं भेजा जा सका, कृपया फिर से कोशिश करें।",
    repliesClosed: "मेज़बान अब जवाब नहीं ले रहे हैं।",
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
    shareTitle: (eventName) => `${eventName} — प्रवेश पास`,
  },
  shareMessage: "आप सादर आमंत्रित हैं! पूरी जानकारी यहाँ देखें:",
};

const COPY: Readonly<Record<CardLanguage, CardCopy>> = {
  en: ENGLISH,
  hi: HINDI,
};

/** Always resolves — the type admits no language without a table. */
export function cardCopy(language: CardLanguage): CardCopy {
  return COPY[language];
}
