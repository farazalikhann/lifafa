import { PREMIUM_PRICE_PAISE, TRADITIONS_PRICE_PAISE, formatPrice } from "@/lib/pricing";
import { HELP_EMAIL } from "@/lib/site";

/**
 * The Help bot's questions and answers, in the order they are shown.
 *
 * Edit freely: the widget (components/help/HelpPanel.tsx) reads this list and
 * nothing else. Keep answers short, plain English, no emojis or em dashes.
 *
 * Prices come from lib/pricing.ts (DESIGN.md: never type a price into copy),
 * so they stay right if the price changes. Today they read ₹699 and ₹999.
 * The email is HELP_EMAIL from lib/site.ts, the same address as the footer.
 */

export interface HelpFaq {
  question: string;
  answer: string;
}

export const HELP_FAQ: readonly HelpFaq[] = [
  {
    question: "How do I create my invitation?",
    answer:
      'Tap "Create your invitation", choose a design, fill in the names, dates and venue, and see the live preview. You pay only when you are happy with the card.',
  },
  {
    question: "How much does it cost?",
    answer: `Traditions Collection designs are ${formatPrice(TRADITIONS_PRICE_PAISE)} and Premium Collection designs are ${formatPrice(PREMIUM_PRICE_PAISE)}. It is a one-time payment, and one payment covers one event.`,
  },
  {
    question: "How do I share my invitation with guests?",
    answer:
      'After payment, open your dashboard and tap "Share on WhatsApp" or "Copy link". Guests open the link on their phone. They do not need an account or an app.',
  },
  {
    question: "Can I edit my card after payment?",
    answer:
      "Yes, you can edit until the day after your last event date. For spelling fixes, the main names can be changed up to 3 times and the event date up to 2 times. For anything more, message us.",
  },
  {
    question: "I want to cancel. What is the refund policy?",
    answer: `You get a full refund if you ask within 48 hours of payment and no guest has opened your invitation yet. After that, refunds are given only for a technical problem on our side that we cannot fix. A refunded invitation stops working for guests. Refunds reach your original payment method in about 5 to 7 working days. To ask for a refund, tap "Message Lifafa" or write to ${HELP_EMAIL}.`,
  },
  {
    question: "My payment failed or money was deducted. What should I do?",
    answer:
      'If money was deducted but your invitation is not active, do not pay again. Tap "Message Lifafa" and share your registered email and the payment time. We will check it and fix it. Failed payments are usually returned by your bank automatically.',
  },
  {
    question: "How do RSVP and guest check-in work?",
    answer:
      "Both are optional. With RSVP on, guests reply Accept, Reject or Doubtful and tell you how many people are coming, and you see the live headcount on your dashboard. QR check-in is off by default. Turn it on if you want to scan guests in at the entrance, which suits formal events with a fixed guest list.",
  },
  {
    question: "How do I contact Lifafa?",
    answer: `Write to ${HELP_EMAIL}, or tap "Message Lifafa" below and we will reply on email or WhatsApp.`,
  },
];
