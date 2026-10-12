import { DEMO_CHECKIN_TOKEN, DEMO_NIKAH } from "@/lib/demoCards";
import { DEMO_NIKAH_PATH } from "@/lib/demoSlides";
import { withContactBlock } from "@/lib/contacts";
import { EMPTY_SNAPSHOT } from "@/lib/newCard";
import { findTemplate } from "@/templates/registry";
import { switchTemplate } from "@/templates/switch";
import type { TemplateConfig } from "@/templates/types";
import type { StoredEvent } from "@/types/database";
import type { EventDraft } from "@/types/event";
import type { OccasionId, TraditionId } from "@/types/occasion";

/**
 * The sample invitation behind each template's "Live demo", and behind its
 * preview image in the gallery.
 *
 * NOT ROWS IN THE DATABASE. Each is built here, from a sample event for the
 * template's tradition laid onto the template by the same switchTemplate the
 * wizard uses, so a demo is exactly the card a host gets by choosing that
 * template and typing these details. Invented people and places throughout.
 *
 * One sample per tradition rather than per template: two templates of the
 * same tradition then show the same wedding in two looks, which is the
 * comparison a host choosing between them is making.
 */

export { DEMO_CHECKIN_TOKEN };

interface Sample {
  occasionId: OccasionId;
  draft: EventDraft;
}

const wedding = (
  draft: Omit<EventDraft, "hostNames" | "themeId" | "eventDate">,
): Sample => ({
  occasionId: "wedding",
  draft: {
    ...draft,
    hostNames: "",
    eventDate: "2026-12-12",
    themeId: "marigold",
  },
});

const SAMPLES: Readonly<Record<TraditionId, Sample>> = {
  hindu: wedding({
    partyOneName: "Aarav Sharma",
    partyTwoName: "Meera Iyer",
    joinerWord: "weds",
    eventTitle: "Wedding Ceremony",
    eventTime: "19:30",
    venueName: "The Lotus Court",
    venueAddress: "Civil Lines, Jaipur 302006",
    message:
      "With the blessings of our elders, we invite you to join us as our children begin their life together. Your presence will make the day complete.",
    subEvents: [
      {
        id: "demo-haldi",
        label: "Haldi",
        date: "2026-12-11",
        time: "10:00",
        venueName: "Sharma Residence",
        venueAddress: "C-Scheme, Jaipur 302001",
      },
      {
        id: "demo-sangeet",
        label: "Sangeet",
        date: "2026-12-11",
        time: "19:00",
        venueName: "The Lotus Court",
        venueAddress: "Civil Lines, Jaipur 302006",
      },
      {
        id: "demo-reception",
        label: "Reception",
        date: "2026-12-13",
        time: "20:00",
        venueName: "The Lotus Court",
        venueAddress: "Civil Lines, Jaipur 302006",
      },
    ],
    partyOneParents: "Mr. Rajesh Sharma and Mrs. Sunita Sharma",
    partyOneCity: "Jaipur",
    partyTwoParents: "Mr. Venkat Iyer and Mrs. Lakshmi Iyer",
    partyTwoCity: "Chennai",
    contacts: [
      { id: "demo-contact-1", label: "Rohit (groom's brother)", phone: "98765 43210" },
    ],
    /*
      The same wedding in Hindi, so these demos carry the language switch a
      real two-language card has, and each template can be seen in Devanagari.
    */
    translations: {
      hi: {
        partyOneName: "आरव शर्मा",
        partyTwoName: "मीरा अय्यर",
        joinerWord: "संग",
        eventTitle: "विवाह समारोह",
        venueName: "द लोटस कोर्ट",
        venueAddress: "सिविल लाइन्स, जयपुर 302006",
        message:
          "बड़ों के आशीर्वाद से, हम आपको अपने बच्चों के नए जीवन की शुरुआत में शामिल होने के लिए सादर आमंत्रित करते हैं। आपकी उपस्थिति से यह दिन पूरा होगा।",
        partyOneParents: "श्री राजेश शर्मा एवं श्रीमती सुनीता शर्मा",
        partyOneCity: "जयपुर",
        partyTwoParents: "श्री वेंकट अय्यर एवं श्रीमती लक्ष्मी अय्यर",
        partyTwoCity: "चेन्नई",
      },
    },
  }),
  muslim: {
    occasionId: "wedding",
    draft: {
      ...DEMO_NIKAH.draft,
      contacts: [
        { id: "demo-contact-1", label: "Imran Siddiqui", phone: "98765 43210" },
      ],
    },
  },
  sikh: wedding({
    partyOneName: "Harpreet Singh",
    partyTwoName: "Simran Kaur",
    joinerWord: "weds",
    eventTitle: "Anand Karaj",
    eventTime: "10:00",
    venueName: "Gurdwara Sahib, Model Town",
    venueAddress: "Model Town, Ludhiana 141002",
    message:
      "With the blessings of Waheguru, we invite you to the Anand Karaj of our children, and to Guru ka Langar after the ceremony.",
    subEvents: [
      {
        id: "demo-jaggo",
        label: "Jaggo",
        date: "2026-12-11",
        time: "19:00",
        venueName: "Singh Residence",
        venueAddress: "Sarabha Nagar, Ludhiana 141001",
      },
      {
        id: "demo-reception",
        label: "Reception",
        date: "2026-12-12",
        time: "19:30",
        venueName: "The Grand Pavilion",
        venueAddress: "Ferozepur Road, Ludhiana 141012",
      },
    ],
    partyOneParents: "S. Gurdeep Singh and Sdn. Manjit Kaur",
    partyOneCity: "Ludhiana",
    partyTwoParents: "S. Balwinder Singh and Sdn. Jasleen Kaur",
    partyTwoCity: "Amritsar",
    contacts: [
      { id: "demo-contact-1", label: "Gurdeep Singh", phone: "98765 43210" },
    ],
  }),
  jain: wedding({
    partyOneName: "Rishabh Jain",
    partyTwoName: "Anjali Shah",
    joinerWord: "weds",
    eventTitle: "Wedding Ceremony",
    eventTime: "11:00",
    venueName: "Shantinath Bhavan",
    venueAddress: "Paldi, Ahmedabad 380007",
    message:
      "Jai Jinendra. We invite you to bless our children as they begin their life together, and to join us for the meal that follows before sunset.",
    subEvents: [
      {
        id: "demo-mehndi",
        label: "Mehndi",
        date: "2026-12-11",
        time: "15:00",
        venueName: "Shah Residence",
        venueAddress: "Navrangpura, Ahmedabad 380009",
      },
      {
        id: "demo-reception",
        label: "Reception",
        date: "2026-12-13",
        time: "17:00",
        venueName: "Shantinath Bhavan",
        venueAddress: "Paldi, Ahmedabad 380007",
      },
    ],
    partyOneParents: "Mr. Mahendra Jain and Mrs. Kiran Jain",
    partyOneCity: "Ahmedabad",
    partyTwoParents: "Mr. Paresh Shah and Mrs. Hetal Shah",
    partyTwoCity: "Surat",
    contacts: [
      { id: "demo-contact-1", label: "Mahendra Jain", phone: "98765 43210" },
    ],
  }),
  buddhist: wedding({
    partyOneName: "Siddharth Kamble",
    partyTwoName: "Pema Lhamo",
    joinerWord: "&",
    eventTitle: "Wedding Ceremony",
    eventTime: "10:30",
    venueName: "Bodhi Vihara Hall",
    venueAddress: "Dhantoli, Nagpur 440012",
    message:
      "With the blessings of the Triple Gem, we invite you to witness our children take their vows, and to share a meal with us afterwards.",
    subEvents: [
      {
        id: "demo-blessing",
        label: "Blessing ceremony",
        date: "2026-12-11",
        time: "17:00",
        venueName: "Bodhi Vihara Hall",
        venueAddress: "Dhantoli, Nagpur 440012",
      },
      {
        id: "demo-reception",
        label: "Reception",
        date: "2026-12-12",
        time: "19:00",
        venueName: "The Orange Grove",
        venueAddress: "Civil Lines, Nagpur 440001",
      },
    ],
    partyOneParents: "Mr. Anand Kamble and Mrs. Sujata Kamble",
    partyOneCity: "Nagpur",
    partyTwoParents: "Mr. Tashi Lhamo and Mrs. Dolma Lhamo",
    partyTwoCity: "Gangtok",
    contacts: [
      { id: "demo-contact-1", label: "Anand Kamble", phone: "98765 43210" },
    ],
  }),
  /* No Christian template yet; the sample is here so the record is whole. */
  christian: wedding({
    partyOneName: "Joel Fernandes",
    partyTwoName: "Maria D'Souza",
    joinerWord: "&",
    eventTitle: "Holy Matrimony",
    eventTime: "16:00",
    venueName: "St. Thomas Church",
    venueAddress: "Bandra West, Mumbai 400050",
    message:
      "Together with our families, we invite you to celebrate our wedding and the reception that follows.",
    subEvents: [],
    partyOneParents: "Mr. Peter Fernandes and Mrs. Rita Fernandes",
    partyOneCity: "Mumbai",
    partyTwoParents: "Mr. John D'Souza and Mrs. Anne D'Souza",
    partyTwoCity: "Goa",
  }),
  /* Any occasion: a birthday, so the gallery shows a card that is not a wedding. */
  none: {
    occasionId: "birthday",
    draft: {
      partyOneName: "",
      partyTwoName: "",
      joinerWord: "&",
      hostNames: "Kabir turns 30",
      eventTitle: "Birthday Dinner",
      eventDate: "2026-12-12",
      eventTime: "20:00",
      venueName: "The Terrace Kitchen",
      venueAddress: "Koregaon Park, Pune 411001",
      message:
        "Thirty years, one long table and all of my favourite people. Come hungry.",
      themeId: "marigold",
      subEvents: [],
      contacts: [
        { id: "demo-contact-1", label: "Ananya", phone: "98765 43210" },
      ],
    },
  },
};

const DEMO_CODE_PREFIX = "demo-";

export function templateDemoPath(templateId: string): string {
  return `/demo/${templateId}`;
}

/** The template's sample invitation, as a stored event a guest's page can draw. */
export function templateDemoEvent(template: TemplateConfig): StoredEvent {
  const sample = SAMPLES[template.category];
  const card = switchTemplate(
    {
      ...EMPTY_SNAPSHOT,
      draft: sample.draft,
      config: {
        ...EMPTY_SNAPSHOT.config,
        occasionId: sample.occasionId,
        blocks: withContactBlock(EMPTY_SNAPSHOT.config.blocks, sample.draft),
        isPaid: true,
      },
    },
    template,
  );
  const code = `${DEMO_CODE_PREFIX}${template.id}`;

  return {
    id: code,
    inviteCode: code,
    config: card.config,
    draft: card.draft,
    isPaid: true,
    coverAnimation: card.coverAnimation,
    showWeather: false,
    coordinates: null,
    weatherTheme: null,
    /* On, so a yes in the demo shows the pass a guest would get. */
    qrCheckinEnabled: true,
    changes: {
      originalEndDate: null,
      dateChangeCount: 0,
      nameChangeCount: 0,
      editUnlockedUntil: null,
    },
  };
}

/**
 * The sample invitation an invite code names, and the page it lives on, or
 * null for a code that is a real invitation's.
 *
 * For the two routes under /i/[inviteCode] a sample's own buttons point at,
 * the calendar file and the printed copy: neither sample is in the database,
 * so both are answered from here. The Nikah sample on the home page keeps its
 * own card (lib/demoCards.ts); every other one is a template's, in the gallery
 * yet or not.
 */
export function sampleEvent(
  inviteCode: string,
): { event: StoredEvent; path: string } | null {
  if (inviteCode === DEMO_NIKAH.inviteCode) {
    return { event: DEMO_NIKAH, path: DEMO_NIKAH_PATH };
  }

  if (!inviteCode.startsWith(DEMO_CODE_PREFIX)) {
    return null;
  }

  const template = findTemplate(inviteCode.slice(DEMO_CODE_PREFIX.length));

  return template === null
    ? null
    : { event: templateDemoEvent(template), path: templateDemoPath(template.id) };
}
