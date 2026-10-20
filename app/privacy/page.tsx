import type { Metadata } from "next";
import type { ReactElement } from "react";
import LegalPage, { List, P, Section, Subheading, TextLink } from "@/components/legal/LegalPage";
import { OPERATOR, SUPPORT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · Lifafa",
  description:
    "What Lifafa collects from hosts and guests, why, who processes it, how long it is kept, and how to see, correct or delete it.",
  alternates: { canonical: "/privacy" },
};

const MAIL = `mailto:${SUPPORT_EMAIL}`;

export default function PrivacyPage(): ReactElement {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="20 October 2026"
      summary={[
        "We collect what it takes to make an invitation and count replies: the host's email, what the host types into the card, and each guest's reply.",
        "Guests do not need an account. A guest gives a name, a phone number when they are coming, how many people, and an optional message.",
        "We do not sell your data. A few services process it for us, such as our database, hosting, payments and translation.",
        "Our ads are measured with the Meta Pixel on Lifafa's own pages only, never on a guest's invitation.",
        "Invitations are deleted after the event. You can ask for a copy of your data, or for it to be deleted sooner, at any time.",
      ]}
    >
      <Section title="Who we are">
        <P>
          Lifafa (getlifafa.co.in) makes digital wedding and event invitations
          with replies, a guest list and QR check-in. It is run by{" "}
          {OPERATOR.name}, an individual based in {OPERATOR.city}. In this
          policy, &quot;we&quot; means Lifafa and its operator, a
          &quot;host&quot; is someone who makes an invitation, and a
          &quot;guest&quot; is someone who opens one.
        </P>
        <P>
          This policy follows India&apos;s Digital Personal Data Protection
          Act, 2023. For any question about it, write to{" "}
          <TextLink href={MAIL}>{SUPPORT_EMAIL}</TextLink>.
        </P>
      </Section>

      <Section title="What we collect from hosts">
        <List
          items={[
            "Your email address, to sign you in. You sign in with a link sent to your email, or with your Google account, in which case Google tells us your email address and name.",
            "What you put on your invitations: the names of the couple and their families, dates, times, venues and addresses, contact names and phone numbers, your own wording, and your choices of design and music.",
            "Your payments: the amount, the date, any coupon code, and the payment reference from Razorpay. We never see your card, UPI or bank details.",
          ]}
        />
      </Section>

      <Section title="What we collect from guests">
        <P>
          Guests do not create an account. When a guest replies to an
          invitation, we store:
        </P>
        <List
          items={[
            "Their name.",
            "Their phone number. It is needed from a guest who is coming, so they can change their reply later and are not counted twice; a guest who is not coming, or is not sure, may leave it out.",
            "Whether they are coming, and how many people are coming with them.",
            "An optional message to the host.",
            "If the host uses QR check-in: a personal check-in pass with its QR code, and the time the guest was checked in at the venue.",
          ]}
        />
        <P>
          These details are shown to the host of that invitation, who can
          download them as a list. They are not shown to other guests.
        </P>
      </Section>

      <Section title="The host's responsibility">
        <P>
          A host adds other people&apos;s details to an invitation: family
          names and contact numbers. By doing so, the host
          confirms they have those people&apos;s permission. The host is
          responsible for the content of their invitations and for how they
          use their guest list.
        </P>
      </Section>

      <Section title="How we use it">
        <List
          items={[
            "To show the invitation to the guests the host sends it to, and to collect and count their replies.",
            "To sign hosts in, keep their invitations in their account and let them edit them.",
            "To take payment and publish an invitation once it is paid for.",
            "To translate an invitation between English and Hindi, when the host asks for it.",
            "To show the weather forecast for the venue, when the host turns it on.",
            "To answer questions and fix problems. We can see an invitation and its guest list when we need to, to help the host.",
            "To measure how well our ads work, on Lifafa's own pages only (see below).",
          ]}
        />
        <P>We do not sell personal data, and we do not use it for anything else.</P>
      </Section>

      <Section title="Who processes it for us">
        <P>
          These services handle data on our behalf, only to do the job named
          here:
        </P>
        <List
          items={[
            "Supabase: our database and sign-in. The database is hosted in Tokyo, Japan.",
            "Vercel: hosts the website.",
            "Razorpay: takes payments. Your card, UPI or bank details go to Razorpay directly and never reach us.",
            "Sarvam AI: translates invitation text between English and Hindi when the host presses Translate. The text of the invitation is sent to Sarvam AI for this.",
            "Resend: sends our service emails.",
            "Open-Meteo: when the host turns on the weather, the venue's name and address are sent to Open-Meteo to find the place and its forecast.",
            "Google: only if you choose to sign in with Google.",
            "Meta: measures our ads (see the next section).",
          ]}
        />
        <P>
          Some of these services store or process data outside India. We may
          also share data if the law requires it.
        </P>
      </Section>

      <Section title="The Meta Pixel">
        <P>
          We use the Meta Pixel to see whether our ads on Facebook and
          Instagram bring people to Lifafa. It runs only on Lifafa&apos;s own
          pages: the home page, the template gallery and the page where an
          invitation is made, sign-in, the host&apos;s dashboard, and these
          policy pages.
        </P>
        <P>
          It never runs on a guest&apos;s invitation, on a sample invitation,
          on check-in or on our admin pages.
        </P>
        <P>
          It tells Meta that a page was viewed, and these events: a template
          viewed, an account created, a payment started and a payment made,
          with the template and the amount. It sends no names, email
          addresses, phone numbers or invitation details, and where a
          page&apos;s address would identify an invitation, the address is
          sent without that part.
        </P>
        <P>
          Meta sets its own cookies to do this, and uses this information
          under its own privacy policy. To opt out, you can block or clear
          cookies in your browser, use an ad blocker, or change your ad
          preferences in your Facebook or Instagram settings.
        </P>
      </Section>

      <Section title="Cookies and storage in your browser">
        <List
          items={[
            "Sign-in cookies, which keep a host signed in. They are needed for the site to work.",
            "A one-time cookie set when a new account is created, so our ads can count the sign-up once. It holds no personal details and is removed within ten minutes.",
            "Meta Pixel cookies, on the pages listed above.",
            "Storage in your browser for small things: the language you chose for an invitation, what you have already revealed on a card, and whether AI translate was used on a card.",
            "If you start an invitation before signing in, it is kept in your browser for up to a day, so it is still there when you come back from signing in. It is removed once the invitation is saved.",
          ]}
        />
      </Section>

      <Section title="How long we keep it">
        <List
          items={[
            "A paid invitation, with its guest list and replies, is deleted 30 days after its last event date.",
            "An unpaid draft is deleted 7 days after its event date.",
            "Seven days before either, we email the host a warning, with a way to download the guest list.",
            "Payment records are kept for accounting and tax, with the personal details removed.",
          ]}
        />
        <P>
          You can ask us to delete your data earlier, or to send you a copy of
          it, by writing to <TextLink href={MAIL}>{SUPPORT_EMAIL}</TextLink>.
        </P>
      </Section>

      <Section title="Your rights">
        <P>Under the Digital Personal Data Protection Act, 2023, you can ask us to:</P>
        <List
          items={[
            "Tell you what personal data we hold about you, and give you a copy.",
            "Correct data that is wrong or out of date.",
            "Delete your data.",
            "Look into a complaint about how we have handled your data.",
          ]}
        />
        <P>
          A guest who wants their reply changed or removed can ask the host,
          or write to us. We reply to every request within 7 days.
        </P>
        <Subheading>Grievance officer</Subheading>
        <P>
          {OPERATOR.name}, {OPERATOR.city}.{" "}
          <TextLink href={MAIL}>{SUPPORT_EMAIL}</TextLink>
        </P>
      </Section>

      <Section title="Children">
        <P>If you are under 18, please use Lifafa with a parent or guardian.</P>
      </Section>

      <Section title="Security">
        <P>
          Data travels over an encrypted connection. Each host can see only
          their own invitations and guest lists, and an invitation can be
          opened only by someone who has its link. No system is perfectly
          secure, so please share your invitation link only with the people
          you mean to invite.
        </P>
      </Section>

      <Section title="Changes to this policy">
        <P>
          If we change this policy, we will update it here and change the date
          at the top.
        </P>
      </Section>
    </LegalPage>
  );
}
