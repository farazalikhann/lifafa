import type { Metadata } from "next";
import type { ReactElement } from "react";
import LegalPage, { List, P, Section, TextLink } from "@/components/legal/LegalPage";
import { OPERATOR, POLICY_LINKS } from "@/lib/legal";
import { HELP_EMAIL, HELP_MAILTO, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";
import { marketingShare } from "@/lib/shareImage";

const TITLE = "Contact Us · Lifafa";
const DESCRIPTION =
  "How to reach Lifafa for help with an invitation, a payment, a refund or your data. We reply within 2 working days.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/contact" },
  ...marketingShare(TITLE, DESCRIPTION, "/contact"),
};

const MAIL = HELP_MAILTO;
const INSTAGRAM_LABEL = `Lifafa on Instagram, ${INSTAGRAM_HANDLE} (opens in a new tab)`;

export default function ContactPage(): ReactElement {
  return (
    <LegalPage
      title="Contact Us"
      updated="28 October 2026"
      summary={[
        <>
          Email <TextLink href={MAIL}>{HELP_EMAIL}</TextLink> for anything
          about Lifafa.
        </>,
        "We reply within 2 working days.",
        "For a payment or a refund, include your invitation link and the payment ID.",
        <>
          New designs and real invitations are on Instagram at{" "}
          <TextLink href={INSTAGRAM_URL} newTab label={INSTAGRAM_LABEL}>
            {INSTAGRAM_HANDLE}
          </TextLink>
          .
        </>,
      ]}
    >
      <Section title="Write to us">
        <P>
          <TextLink href={MAIL}>{HELP_EMAIL}</TextLink>
        </P>
        <P>
          This is the address for help with an invitation, payments, refunds,
          your data, and complaints. We reply within 2 working days. A request
          about your personal data is answered within 7 days.
        </P>
        <P>
          It helps us to have the link to your invitation, and for a payment,
          the payment ID from Razorpay.
        </P>
      </Section>

      <Section title="Instagram">
        <P>
          <TextLink href={INSTAGRAM_URL} newTab label={INSTAGRAM_LABEL}>
            {INSTAGRAM_HANDLE}
          </TextLink>
        </P>
        <P>
          Follow us for new designs and real invitations.
        </P>
      </Section>

      <Section title="Who runs Lifafa">
        <P>
          Lifafa is run by {OPERATOR.name}, an individual, in {OPERATOR.city}.
          {" "}{OPERATOR.name} is also the grievance officer for data protection
          questions.
        </P>
      </Section>

      <Section title="Our policies">
        <List
          items={POLICY_LINKS.filter((link) => link.href !== "/contact").map(
            (link) => (
              <TextLink key={link.href} href={link.href}>
                {link.label}
              </TextLink>
            ),
          )}
        />
      </Section>
    </LegalPage>
  );
}
