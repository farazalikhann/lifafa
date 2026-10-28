import type { Metadata } from "next";
import type { ReactElement } from "react";
import LegalPage, { List, P, Section, TextLink } from "@/components/legal/LegalPage";
import { HELP_EMAIL, HELP_MAILTO } from "@/lib/site";
import {
  PREMIUM_PRICE_PAISE,
  TRADITIONS_PRICE_PAISE,
  formatPriceRs,
} from "@/lib/pricing";
import { marketingShare } from "@/lib/shareImage";

const TITLE = "Cancellation and Refund Policy · Lifafa";
const DESCRIPTION =
  "When Lifafa refunds a payment, what happens to a refunded invitation, how long a refund takes, and how to ask for one.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/refunds" },
  ...marketingShare(TITLE, DESCRIPTION, "/refunds"),
};

const MAIL = HELP_MAILTO;

export default function RefundsPage(): ReactElement {
  return (
    <LegalPage
      title="Cancellation and Refund Policy"
      updated="28 October 2026"
      summary={[
        "Changed your mind? You get a full refund if you ask within 48 hours of paying and no guest has opened the invitation link yet.",
        "After that, we refund only if something on our side fails and we cannot fix it, such as a double charge.",
        "Refunds are always in full, and go back to the way you paid, usually within 5 to 7 working days.",
        "A refunded invitation is switched off for guests. You can pay again to switch it back on.",
        `To ask, email ${HELP_EMAIL} with the invitation link and the payment ID.`,
      ]}
    >
      <Section title="What you pay for">
        <P>
          An invitation costs {formatPriceRs(TRADITIONS_PRICE_PAISE)} in the
          Traditions Collection or {formatPriceRs(PREMIUM_PRICE_PAISE)} in the
          Premium Collection. One payment covers one event. The full terms are
          in our <TextLink href="/terms">Terms and Conditions</TextLink>.
        </P>
      </Section>

      <Section title="Cancelling within 48 hours">
        <P>
          You get a full refund if you ask within 48 hours of paying, as long
          as no guest has opened the invitation link yet. You do not need to
          give a reason.
        </P>
      </Section>

      <Section title="After 48 hours, or once a guest has opened it">
        <P>
          We refund only when something fails on our side and we cannot fix
          it. For example:
        </P>
        <List
          items={[
            "You were charged twice for the same invitation.",
            "The invitation does not work for your guests, and we cannot make it work.",
          ]}
        />
        <P>
          If something is wrong, write to us first: most problems can be put
          right quickly, and the invitation keeps working while we look.
        </P>
      </Section>

      <Section title="How refunds work">
        <List
          items={[
            "Refunds are always for the full amount you paid. We do not give partial refunds.",
            "The money goes back to the card, UPI account or bank account you paid with.",
            "It usually arrives within 5 to 7 working days after we start the refund. Your bank may take longer to show it.",
            "An invitation activated with a free code was not paid for, so there is nothing to refund.",
          ]}
        />
      </Section>

      <Section title="What happens to a refunded invitation">
        <P>
          A refunded invitation is deactivated. Guests can no longer open it,
          and replies and check-in stop. Your invitation and its guest list
          stay in your account, and you can pay again to reactivate it.
        </P>
      </Section>

      <Section title="How to ask for a refund">
        <P>
          Email <TextLink href={MAIL}>{HELP_EMAIL}</TextLink> with:
        </P>
        <List
          items={[
            "The invitation link.",
            "The payment ID, which is in the payment confirmation from Razorpay.",
          ]}
        />
        <P>We reply within 2 working days.</P>
      </Section>
    </LegalPage>
  );
}
