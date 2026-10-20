import type { ReactElement } from "react";
import { EYEBROW, SECTION_HEADING } from "@/components/landing/styles";
import { DATE_CHANGE_LIMIT, NAME_CHANGE_LIMIT } from "@/lib/eventLock";
import {
  PREMIUM_PRICE_PAISE,
  TRADITIONS_PRICE_PAISE,
  formatPriceRs,
} from "@/lib/pricing";

interface Question {
  question: string;
  answer: string;
}

const TIMES = ["", "once", "twice", "three times", "four times", "five times"];

const QUESTIONS: readonly Question[] = [
  {
    question: "Do my guests need an app or an account?",
    answer:
      "No. Guests open the link in their phone's browser, read the invitation and reply. There is nothing to install and nothing to sign up for.",
  },
  {
    question: "How do I share my invitation?",
    answer:
      "Your invitation has one link. Your dashboard has a Share on WhatsApp button with a message already written, or you can copy the link and send it any way you like.",
  },
  {
    question: "Can I edit it after sharing?",
    answer: `Yes. The link stays the same, so every guest sees the latest version. After payment, the date can be changed ${TIMES[DATE_CHANGE_LIMIT]} and the names ${TIMES[NAME_CHANGE_LIMIT]}, to correct spelling. Editing closes once the event is over.`,
  },
  {
    question: "Which languages can I use?",
    answer:
      "English and Hindi. Write your invitation in one and add the other, and your guests can switch between them with one tap.",
  },
  {
    question: "How long does the link stay live?",
    answer:
      "Your invitation, replies and guest list stay available until a few days after your event. After that, the event's data is removed.",
  },
  {
    question: "How does payment work?",
    answer: `You make and preview your invitation for free. When you are ready to share it, you pay once for that event: ${formatPriceRs(TRADITIONS_PRICE_PAISE)} for a Traditions design or ${formatPriceRs(PREMIUM_PRICE_PAISE)} for a Premium design, securely through Razorpay with UPI, a card or net banking. Guests can open the link as soon as the payment is complete.`,
  },
];

/**
 * The questions a host asks before paying, answered in place.
 *
 * NATIVE `details` AND `summary`, AND NOTHING ELSE. Opening, closing, keyboard
 * support and the expanded state a screen reader announces all come from the
 * browser, with no script. The marker is a plus drawn in CSS that turns into a
 * cross when the item is open; the browser's own triangle is switched off.
 */
export default function Faq(): ReactElement {
  return (
    <section aria-labelledby="faq-heading" className="px-5 py-16 sm:px-8 sm:py-24">
      <div className="text-center">
        <p className={EYEBROW}>Questions</p>
        <h2 id="faq-heading" className={`mt-3 ${SECTION_HEADING}`}>
          Questions hosts ask
        </h2>
      </div>

      <div className="mx-auto mt-10 max-w-2xl border-y border-[var(--lifafa-hairline)] sm:mt-12">
        {QUESTIONS.map((item) => (
          <details
            key={item.question}
            className="group border-b border-[var(--lifafa-hairline)] last:border-b-0"
          >
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-6 rounded-sm py-4 text-left text-base leading-snug font-medium text-[var(--lifafa-cream)] transition-colors duration-200 hover:text-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)] sm:text-lg [&::-webkit-details-marker]:hidden">
              <span>{item.question}</span>
              <span
                aria-hidden="true"
                className="relative h-3.5 w-3.5 shrink-0 text-[var(--lifafa-marigold)] transition-transform duration-200 ease-out group-open:rotate-45 motion-reduce:transition-none before:absolute before:top-1/2 before:left-0 before:h-[1.5px] before:w-full before:-translate-y-1/2 before:rounded-full before:bg-current before:content-[''] after:absolute after:top-0 after:left-1/2 after:h-full after:w-[1.5px] after:-translate-x-1/2 after:rounded-full after:bg-current after:content-['']"
              />
            </summary>
            <p className="max-w-[60ch] pr-8 pb-5 text-[0.9375rem] leading-relaxed text-[var(--lifafa-muted)] sm:text-base">
              {item.answer}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
