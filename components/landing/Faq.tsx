import type { ReactElement, ReactNode } from "react";
import Link from "next/link";
import {
  EYEBROW,
  SECTION_HEADING,
  SECTION_X,
  SECTION_Y,
} from "@/components/landing/styles";
import { DATE_CHANGE_LIMIT, NAME_CHANGE_LIMIT } from "@/lib/eventLock";
import {
  PREMIUM_PRICE_PAISE,
  TRADITIONS_PRICE_PAISE,
  formatPrice,
} from "@/lib/pricing";

interface Question {
  question: string;
  answer: ReactNode;
}

const TIMES = ["", "once", "twice", "three times", "four times", "five times"];

const LINK =
  "font-semibold text-[var(--paper-emerald)] underline decoration-[var(--paper-gold)] underline-offset-4 hover:decoration-[var(--paper-emerald)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-emerald)]";

/*
  Every answer is a rule already stated on the policy pages (app/terms and
  app/refunds) or enforced in lib/eventLock.ts. Change those first, then these.
*/
const QUESTIONS: readonly Question[] = [
  {
    question: "Do my guests need an app or an account?",
    answer:
      "No. Guests open the link in their phone's browser, read the invitation and reply. There is nothing to install and nothing to sign up for.",
  },
  {
    question: "When can guests open my link?",
    answer:
      "Once the invitation is paid for. Until then the link does not open for guests, and only you, signed in, can preview it, with a watermark and a button to pay.",
  },
  {
    question: "What does one payment cover?",
    answer: `One event. A Traditions design is ${formatPrice(TRADITIONS_PRICE_PAISE)} and a Premium design is ${formatPrice(PREMIUM_PRICE_PAISE)}, paid once. There is no subscription and no charge per guest.`,
  },
  {
    question: "Can I edit it after sharing?",
    answer: `Yes, and every guest sees the change on the same link. After payment you can edit until the day after your last event. The date can be changed ${TIMES[DATE_CHANGE_LIMIT]} and the names ${TIMES[NAME_CHANGE_LIMIT]}, for spelling fixes.`,
  },
  {
    question: "Can I get a refund?",
    answer: (
      <>
        Yes, in full, if you ask within 48 hours of paying and no guest has
        opened the link yet. After that we refund only if something fails on
        our side and we cannot fix it. The details are in our{" "}
        <Link href="/refunds" prefetch={false} className={LINK}>
          refund policy
        </Link>
        .
      </>
    ),
  },
  {
    question: "Which languages can I use?",
    answer:
      "English and Hindi. Write your invitation in one, add the other with built in translate (once per invitation) or by hand, and guests switch between them with one tap.",
  },
];

/**
 * Six questions a host asks before paying, each closed until it is opened.
 *
 * NATIVE `details` AND `summary`: opening, closing, keyboard support and the
 * expanded state a screen reader announces all come from the browser, with
 * no script. The marker is a plus drawn in CSS that turns into a cross.
 */
export default function Faq(): ReactElement {
  return (
    <section aria-labelledby="faq-heading" className={`${SECTION_X} ${SECTION_Y}`}>
      <div className="mx-auto max-w-[46rem]">
        <div className="text-center">
          <p className={EYEBROW}>Questions</p>
          <h2 id="faq-heading" className={`mt-3 ${SECTION_HEADING}`}>
            Questions hosts ask
          </h2>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-[var(--paper-hairline)] bg-[var(--paper-card)] lg:mt-14">
          {QUESTIONS.map((item) => (
            <details
              key={item.question}
              className="group border-b border-[var(--paper-hairline)] last:border-b-0"
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 px-5 py-4 text-left text-base leading-snug font-semibold text-[var(--paper-ink)] transition-colors duration-200 hover:text-[var(--paper-emerald)] focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--paper-emerald)] sm:px-7 sm:text-lg [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <span
                  aria-hidden="true"
                  className="relative h-3.5 w-3.5 shrink-0 text-[var(--paper-gold-ink)] transition-transform duration-200 ease-out group-open:rotate-45 motion-reduce:transition-none before:absolute before:top-1/2 before:left-0 before:h-[1.5px] before:w-full before:-translate-y-1/2 before:rounded-full before:bg-current before:content-[''] after:absolute after:top-0 after:left-1/2 after:h-full after:w-[1.5px] after:-translate-x-1/2 after:rounded-full after:bg-current after:content-['']"
                />
              </summary>
              <p className="max-w-[60ch] px-5 pb-5 text-base leading-[1.6] text-[var(--paper-muted)] sm:px-7">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
