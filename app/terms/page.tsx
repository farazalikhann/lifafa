import type { Metadata } from "next";
import type { ReactElement } from "react";
import LegalPage, { List, P, Section, TextLink } from "@/components/legal/LegalPage";
import { OPERATOR, SUPPORT_EMAIL } from "@/lib/legal";
import {
  PREMIUM_PRICE_PAISE,
  TRADITIONS_PRICE_PAISE,
  formatPriceRs,
} from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Terms and Conditions · Lifafa",
  description:
    "The terms for using Lifafa: accounts, prices, what one payment covers, editing after payment, AI translate, and your responsibilities as a host.",
  alternates: { canonical: "/terms" },
};

const MAIL = `mailto:${SUPPORT_EMAIL}`;
const TRADITIONS = formatPriceRs(TRADITIONS_PRICE_PAISE);
const PREMIUM = formatPriceRs(PREMIUM_PRICE_PAISE);

export default function TermsPage(): ReactElement {
  return (
    <LegalPage
      title="Terms and Conditions"
      updated="20 October 2026"
      summary={[
        `An invitation costs ${TRADITIONS} in the Traditions Collection or ${PREMIUM} in the Premium Collection. One payment covers one event.`,
        "Until it is paid for, an invitation's link does not open for guests. Once paid, it opens for them straight away.",
        "After payment you can keep editing until the day after your last event, within a few limits on changing the date and the names.",
        "You are responsible for what you put on your invitation, and for having permission to add other people's details.",
        "These terms are governed by the law of India, with the courts at Lucknow.",
      ]}
    >
      <Section title="About these terms">
        <P>
          Lifafa (getlifafa.co.in) is run by {OPERATOR.name}, an individual
          based in {OPERATOR.city}. By using Lifafa, you agree to these terms
          and to our <TextLink href="/privacy">Privacy Policy</TextLink>. If
          you do not agree, please do not use Lifafa.
        </P>
        <P>If you are under 18, please use Lifafa with a parent or guardian.</P>
      </Section>

      <Section title="What Lifafa does">
        <P>
          Lifafa lets you make a digital invitation for a wedding or another
          event, share it as one link, collect your guests&apos; replies, see
          your guest list and headcount, and check guests in at the venue with
          a QR code. Guests do not need an account.
        </P>
      </Section>

      <Section title="Your account">
        <P>
          You sign in with a link sent to your email, or with your Google
          account. Keep access to that email or Google account safe: anyone
          who can sign in as you can see and change your invitations and
          guest lists.
        </P>
        <P>
          You can start an invitation without signing in. You are asked to
          sign in when you save it.
        </P>
      </Section>

      <Section title="Prices and payment">
        <List
          items={[
            `An invitation in the Traditions Collection costs ${TRADITIONS}. An invitation in the Premium Collection costs ${PREMIUM}. Prices are in Indian rupees, and the price of your invitation is shown before you pay.`,
            "One payment covers one event. It cannot be moved to, or reused for, a different event.",
            "An invitation needs at least one event date before it can be paid for.",
            "Payments are taken by Razorpay. We never see your card, UPI or bank details.",
            "A coupon code lowers the price as shown at checkout. A code that covers the whole price activates the invitation without a payment.",
            "If you move a paid invitation to a template that costs more than the one you paid for, contact us to upgrade.",
          ]}
        />
        <P>
          Refunds are covered by our{" "}
          <TextLink href="/refunds">Cancellation and Refund Policy</TextLink>.
        </P>
      </Section>

      <Section title="Before and after payment">
        <P>Until an invitation is paid for:</P>
        <List
          items={[
            "Its link does not open for guests. They see \"This invitation is not active yet\".",
            "Only you, signed in, can preview it, with a watermark and a button to pay.",
            "Replies, check-in and guest passes do not work.",
            "A preview of the link in a chat app shows no event details.",
          ]}
        />
        <P>
          Once the payment is confirmed, the link opens for guests straight
          away, usually within a minute.
        </P>
      </Section>

      <Section title="Editing after payment">
        <List
          items={[
            "You can keep editing a paid invitation until 00:00 India time on the day after its last event date. The last event date is the latest of the main date and the dates of all the functions on the invitation.",
            "The event date can be changed at most 2 times, and to no more than 6 months after the original date.",
            "The main names on the invitation can be changed at most 3 times, for spelling fixes.",
            "If you need a change beyond these limits, contact us.",
          ]}
        />
        <P>
          These limits exist because one payment covers one event: a paid
          invitation cannot become the invitation for a different event.
        </P>
      </Section>

      <Section title="After the event">
        <P>
          After the event, the guest link stays open as a keepsake until the
          invitation is deleted, as described in the{" "}
          <TextLink href="/privacy">Privacy Policy</TextLink>. Replies and
          check-in close, and your guest list and replies stay available on
          your dashboard.
        </P>
      </Section>

      <Section title="AI translate">
        <List
          items={[
            "AI translate turns your invitation's English text into Hindi, or Hindi into English. You need to be signed in to use it.",
            "It can be used once per invitation. After that, you edit the other language yourself.",
            "Names, venues and addresses are written in the other script rather than translated. The rest of the text is translated.",
            "While one of your unpaid invitations has used AI translate, another invitation cannot use it until that one is paid for.",
            "If a translation fails, it does not use up your chance.",
            "The text of your invitation is sent to Sarvam AI to be translated.",
            "Machine translation can be wrong. Check the result before you share the invitation.",
          ]}
        />
      </Section>

      <Section title="Your content and your guests">
        <P>
          You are responsible for everything you put on your invitations, and
          for having permission to add the details of the guests, family
          members and contacts you include. You keep any rights you have in
          your content. You allow us to store it and show it to the people you
          share your invitation with, which is what it takes to run the
          service.
        </P>
        <P>Please do not use Lifafa to:</P>
        <List
          items={[
            "Put anything unlawful, hateful or misleading on an invitation.",
            "Add someone's personal details without their permission.",
            "Send invitations to people who have not asked to hear from you, or to harass anyone.",
            "Try to reach other people's invitations or guest lists, or disrupt the service.",
          ]}
        />
        <P>
          We may take down an invitation that breaks these terms. If we do,
          we will tell you why.
        </P>
      </Section>

      <Section title="Our designs">
        <P>
          The templates, illustrations, music and the rest of Lifafa belong to
          us or to those who license them to us. You may use them in your
          invitations on Lifafa, and share those invitations, but not copy them
          for use elsewhere.
        </P>
      </Section>

      <Section title="Availability and liability">
        <P>
          We work to keep Lifafa running and your invitations available, but
          we cannot promise it will never be interrupted. If something on our
          side stops your invitation from working, contact us and we will fix
          it or refund you as set out in the{" "}
          <TextLink href="/refunds">Cancellation and Refund Policy</TextLink>.
        </P>
        <P>
          As far as the law allows, our total liability to you for any
          invitation is limited to the amount you paid for it.
        </P>
      </Section>

      <Section title="Changes to these terms">
        <P>
          If we change these terms, we will update them here and change the
          date at the top. The terms in place when you paid apply to that
          payment.
        </P>
      </Section>

      <Section title="Law and disputes">
        <P>
          These terms are governed by the law of India. Any dispute is subject
          to the courts at Lucknow, Uttar Pradesh. Before going to court,
          please write to us at{" "}
          <TextLink href={MAIL}>{SUPPORT_EMAIL}</TextLink>, and we will try
          to settle it with you.
        </P>
      </Section>
    </LegalPage>
  );
}
