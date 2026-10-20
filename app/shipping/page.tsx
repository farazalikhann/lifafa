import type { Metadata } from "next";
import type { ReactElement } from "react";
import LegalPage, { P, Section, TextLink } from "@/components/legal/LegalPage";
import { SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Shipping and Delivery Policy · Lifafa",
  description:
    "Lifafa invitations are digital: nothing is shipped, and your invitation link works as soon as your payment is confirmed.",
  alternates: { canonical: "/shipping" },
};

const MAIL = `mailto:${SUPPORT_EMAIL}`;

export default function ShippingPage(): ReactElement {
  return (
    <LegalPage
      title="Shipping and Delivery Policy"
      updated="20 October 2026"
      summary={[
        "Lifafa invitations are digital. Nothing is printed or shipped.",
        "Your invitation link works for guests as soon as your payment is confirmed, usually within a minute.",
        "If it does not, contact us and we will sort it out.",
      ]}
    >
      <Section title="What is delivered">
        <P>
          A Lifafa invitation is a web page your guests open from one link.
          There is no physical product, so nothing is shipped and there are no
          delivery charges.
        </P>
      </Section>

      <Section title="When it is delivered">
        <P>
          The link to your invitation is in your dashboard from the moment you
          save it. It opens for your guests as soon as your payment is
          confirmed, usually within a minute. You share it yourself, on
          WhatsApp or wherever you like.
        </P>
      </Section>

      <Section title="If something goes wrong">
        <P>
          If you have paid and the link still does not open for guests after a
          few minutes, email <TextLink href={MAIL}>{SUPPORT_EMAIL}</TextLink>{" "}
          with the invitation link and the payment ID. If we cannot make it
          work, our{" "}
          <TextLink href="/refunds">Cancellation and Refund Policy</TextLink>{" "}
          applies.
        </P>
      </Section>
    </LegalPage>
  );
}
