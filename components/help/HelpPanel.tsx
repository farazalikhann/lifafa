"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type RefObject,
} from "react";
import { sendHelpMessage } from "@/lib/help/actions";
import { HELP_FAQ, HELP_SUPPORT_EMAIL } from "@/lib/help/faq";
import {
  HELP_CONTACT_MAX,
  HELP_MESSAGE_MAX,
  HELP_MESSAGE_MIN,
  HELP_NAME_MAX,
  isHelpContact,
  type HelpField,
} from "@/lib/help/form";
import type { HelpMessagePage } from "@/types/database";

/**
 * The Help panel: questions with canned answers, and a form that writes to us.
 *
 * Loaded lazily by components/help/HelpWidget.tsx. A bottom sheet at 80% of
 * the screen on phones (with a dimmed page behind it), a 360px panel above the
 * button from 640px. Escape closes it everywhere; a tap outside closes it on
 * desktop. Focus stays inside while it is open and returns to the button.
 * The rise animation is skipped under prefers-reduced-motion.
 */

type View = "chat" | "form" | "sent";

const DESKTOP = "(min-width: 640px)";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const SEND_FAILED = `Could not send your message. Please try again, or write to ${HELP_SUPPORT_EMAIL}.`;

const FOCUS_ON_EMERALD =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--paper-gold)]";
const FOCUS_ON_PAPER =
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[var(--paper-emerald)]";

const PILL = `inline-flex min-h-11 max-w-full items-center rounded-full border border-[var(--paper-gold)] bg-[var(--paper-card)] px-4 py-2 text-left text-[15px] leading-snug font-semibold text-[var(--paper-emerald)] transition-colors duration-200 hover:bg-[var(--paper-emerald)]/[0.06] ${FOCUS_ON_PAPER}`;
const PILL_PRIMARY = `inline-flex min-h-11 items-center rounded-full bg-[var(--paper-emerald)] px-5 py-2 text-[15px] font-semibold text-[var(--paper-washi)] transition-colors duration-200 hover:bg-[var(--paper-emerald-press)] ${FOCUS_ON_PAPER}`;
const BOT_BUBBLE =
  "max-w-[88%] self-start rounded-2xl rounded-bl-md border border-[var(--paper-hairline)] bg-[var(--paper-washi)] px-4 py-3 text-[15px] leading-relaxed text-[var(--paper-ink)]";
const HOST_BUBBLE =
  "max-w-[85%] self-end rounded-2xl rounded-br-md bg-[var(--paper-blush)] px-4 py-2.5 text-[15px] leading-snug font-medium text-[var(--paper-ink)]";
const FIELD =
  "mt-1.5 block w-full rounded-xl border border-[var(--paper-field)] bg-[var(--paper-washi)] px-3.5 text-base text-[var(--paper-ink)] placeholder:text-[var(--paper-muted)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--paper-emerald)] aria-[invalid=true]:border-[var(--paper-no)]";
const LABEL = "block text-sm font-semibold text-[var(--paper-ink)]";
const FIELD_ERROR = "mt-1.5 text-sm font-medium text-[var(--paper-no)]";

interface FormValues {
  name: string;
  contact: string;
  message: string;
}

type FieldErrors = Partial<Record<HelpField, string>>;

function checkForm(values: FormValues): FieldErrors {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  const contact = values.contact.trim();
  const message = values.message.trim();

  if (name.length === 0) {
    errors.name = "Please enter your name.";
  }

  if (contact.length === 0) {
    errors.contact = "Please enter your email or phone number.";
  } else if (!isHelpContact(contact.replace(/\s+/g, " "))) {
    errors.contact = "Please enter a valid email or phone number.";
  }

  if (message.length === 0) {
    errors.message = "Please write your message.";
  } else if (message.length < HELP_MESSAGE_MIN) {
    errors.message = `Please write at least ${HELP_MESSAGE_MIN} characters.`;
  }

  return errors;
}

export default function HelpPanel({
  open,
  onClose,
  launcherRef,
  page,
  eventId,
}: {
  open: boolean;
  onClose: () => void;
  launcherRef: RefObject<HTMLButtonElement | null>;
  page: HelpMessagePage;
  eventId: string | null;
}): ReactElement {
  const titleId = useId();
  const fieldId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const latestRef = useRef<HTMLDivElement>(null);
  const honeypotRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<View>("chat");
  /* The questions asked so far, as indexes into HELP_FAQ, in the order asked. */
  const [asked, setAsked] = useState<number[]>([]);
  const [values, setValues] = useState<FormValues>({ name: "", contact: "", message: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const prefilled = useRef(false);

  /* Focus into the panel on open; Escape closes; Tab stays inside. */
  useEffect(() => {
    if (!open) {
      return;
    }

    panelRef.current?.focus();

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab" || panelRef.current === null) {
        return;
      }

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = panelRef.current.contains(active);

      if (event.shiftKey && (active === first || active === panelRef.current || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    }

    /* Desktop only: a tap anywhere outside the panel and its button closes it. */
    function onPointerDown(event: PointerEvent): void {
      const target = event.target as Node | null;

      if (
        target === null ||
        !window.matchMedia(DESKTOP).matches ||
        panelRef.current?.contains(target) === true ||
        launcherRef.current?.contains(target) === true
      ) {
        return;
      }

      onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);

    /* The page behind a phone's sheet does not scroll. */
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    const locked = !window.matchMedia(DESKTOP).matches;

    if (locked) {
      root.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);

      if (locked) {
        root.style.overflow = previousOverflow;
      }
    };
  }, [open, onClose, launcherRef]);

  /* Bring the newest answer into view. */
  useEffect(() => {
    if (asked.length === 0) {
      return;
    }

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    latestRef.current?.scrollIntoView({ block: "start", behavior: reduced ? "auto" : "smooth" });
  }, [asked]);

  /* A signed-in host's name and email, filled in once if the fields are empty. */
  const prefill = useCallback(async () => {
    if (prefilled.current) {
      return;
    }

    prefilled.current = true;

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const { data } = await createClient().auth.getSession();
      const user = data.session?.user;

      if (user === undefined) {
        return;
      }

      const meta = user.user_metadata as Record<string, unknown> | undefined;
      const fullName = typeof meta?.full_name === "string" ? meta.full_name : typeof meta?.name === "string" ? meta.name : "";
      const email = user.email ?? "";

      setValues((current) => ({
        ...current,
        name: current.name.length > 0 ? current.name : fullName.slice(0, HELP_NAME_MAX),
        contact: current.contact.length > 0 ? current.contact : email.slice(0, HELP_CONTACT_MAX),
      }));
    } catch {
      /* Not signed in, or no Supabase on this build: the host types them. */
    }
  }, []);

  function openForm(): void {
    setView("form");
    setSendError(false);
    void prefill();
    bodyRef.current?.scrollTo({ top: 0 });
  }

  function backToQuestions(): void {
    setView("chat");
    setErrors({});
    setSendError(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (sending) {
      return;
    }

    const found = checkForm(values);
    setErrors(found);
    setSendError(false);

    const firstBad = (["name", "contact", "message"] as const).find((field) => found[field] !== undefined);

    if (firstBad !== undefined) {
      document.getElementById(`${fieldId}-${firstBad}`)?.focus();
      return;
    }

    setSending(true);

    try {
      const result = await sendHelpMessage({
        name: values.name,
        contact: values.contact,
        message: values.message,
        page,
        eventId,
        website: honeypotRef.current?.value ?? "",
      });

      if (result.ok) {
        setValues((current) => ({ ...current, message: "" }));
        setView("sent");
        bodyRef.current?.scrollTo({ top: 0 });
        return;
      }

      if (result.field !== undefined) {
        setErrors({ [result.field]: result.error });
        document.getElementById(`${fieldId}-${result.field}`)?.focus();
        return;
      }

      setSendError(true);
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  }

  const remaining = HELP_FAQ.map((_, index) => index).filter((index) => !asked.includes(index));

  function field(name: HelpField): {
    id: string;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
  } {
    return {
      id: `${fieldId}-${name}`,
      "aria-invalid": errors[name] !== undefined,
      "aria-describedby": errors[name] !== undefined ? `${fieldId}-${name}-error` : undefined,
    };
  }

  return (
    <div hidden={!open}>
      {/* The dimmed page behind a phone's sheet. Desktop has none. */}
      <div aria-hidden="true" className="fixed inset-0 z-[44] bg-[var(--paper-ink)]/40 sm:hidden" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed inset-x-0 bottom-0 z-[45] flex h-[80dvh] flex-col overflow-hidden rounded-t-3xl border border-b-0 border-[var(--paper-hairline)] bg-[var(--paper-card)] shadow-[0_-8px_30px_rgb(var(--paper-shadow-warm)/0.22)] outline-none motion-safe:animate-[lifafa-help-rise_220ms_ease-out] sm:inset-x-auto sm:right-5 sm:bottom-[calc(88px+env(safe-area-inset-bottom))] sm:h-[min(600px,calc(100dvh-112px))] sm:w-[360px] sm:rounded-3xl sm:border-b sm:shadow-[0_12px_40px_rgb(var(--paper-shadow-warm)/0.25)]"
      >
        <header className="flex min-h-16 shrink-0 items-center gap-1 bg-[var(--paper-emerald)] py-2 pr-2 pl-3 text-[var(--paper-washi)]">
          {view !== "chat" ? (
            <button
              type="button"
              aria-label="Back to questions"
              onClick={backToQuestions}
              className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10 ${FOCUS_ON_EMERALD}`}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
          ) : (
            <span aria-hidden="true" className="w-2" />
          )}
          <h2
            id={titleId}
            className="min-w-0 flex-1 font-[family-name:var(--paper-display)] text-lg font-semibold"
          >
            Lifafa help
          </h2>
          <button
            type="button"
            aria-label="Close help"
            onClick={onClose}
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full hover:bg-white/10 ${FOCUS_ON_EMERALD}`}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5">
          {view === "chat" ? (
            <div className="flex flex-col gap-3" aria-live="polite">
              <p className={BOT_BUBBLE}>Hi, how can we help you today?</p>

              {asked.map((index, position) => (
                <div
                  key={index}
                  ref={position === asked.length - 1 ? latestRef : undefined}
                  className="flex scroll-mt-4 flex-col gap-3"
                >
                  <p className={HOST_BUBBLE}>{HELP_FAQ[index].question}</p>
                  <p className={BOT_BUBBLE}>{HELP_FAQ[index].answer}</p>
                </div>
              ))}

              <ul className="mt-2 flex flex-col items-start gap-2" aria-label="Questions">
                {remaining.map((index) => (
                  <li key={index} className="max-w-full">
                    <button
                      type="button"
                      className={PILL}
                      onClick={() => setAsked((current) => [...current, index])}
                    >
                      {HELP_FAQ[index].question}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {view === "form" ? (
            <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
              <p className="text-[15px] leading-relaxed text-[var(--paper-muted)]">
                Write to us and we will reply on email or WhatsApp.
              </p>

              <div>
                <label htmlFor={`${fieldId}-name`} className={LABEL}>
                  Your name
                </label>
                <input
                  {...field("name")}
                  type="text"
                  autoComplete="name"
                  maxLength={HELP_NAME_MAX}
                  value={values.name}
                  onChange={(event) => setValues({ ...values, name: event.target.value })}
                  className={`${FIELD} min-h-12`}
                />
                {errors.name !== undefined ? (
                  <p id={`${fieldId}-name-error`} className={FIELD_ERROR}>
                    {errors.name}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`${fieldId}-contact`} className={LABEL}>
                  Email or phone
                </label>
                <input
                  {...field("contact")}
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={HELP_CONTACT_MAX}
                  value={values.contact}
                  onChange={(event) => setValues({ ...values, contact: event.target.value })}
                  className={`${FIELD} min-h-12`}
                />
                {errors.contact !== undefined ? (
                  <p id={`${fieldId}-contact-error`} className={FIELD_ERROR}>
                    {errors.contact}
                  </p>
                ) : null}
              </div>

              <div>
                <label htmlFor={`${fieldId}-message`} className={LABEL}>
                  Your message
                </label>
                <textarea
                  {...field("message")}
                  rows={5}
                  maxLength={HELP_MESSAGE_MAX}
                  value={values.message}
                  onChange={(event) => setValues({ ...values, message: event.target.value })}
                  className={`${FIELD} resize-y py-3 leading-relaxed`}
                />
                {errors.message !== undefined ? (
                  <p id={`${fieldId}-message-error`} className={FIELD_ERROR}>
                    {errors.message}
                  </p>
                ) : null}
              </div>

              {/* The honeypot: off screen and out of the tab order. People never fill it; bots do. */}
              <div aria-hidden="true" className="absolute -left-[10000px] h-px w-px overflow-hidden">
                <label htmlFor={`${fieldId}-website`}>Website</label>
                <input
                  ref={honeypotRef}
                  id={`${fieldId}-website`}
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  defaultValue=""
                />
              </div>

              {sendError ? (
                <p role="alert" className="text-sm leading-relaxed font-medium text-[var(--paper-no)]">
                  {SEND_FAILED}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={sending}
                className={`inline-flex min-h-12 items-center justify-center rounded-full bg-[var(--paper-emerald)] px-7 text-base font-semibold text-[var(--paper-washi)] transition-colors duration-200 hover:bg-[var(--paper-emerald-press)] disabled:opacity-80 ${FOCUS_ON_PAPER}`}
              >
                {sending ? "Sending..." : "Send message"}
              </button>
            </form>
          ) : null}

          {view === "sent" ? (
            <div className="flex flex-col items-start gap-4" role="status">
              <p className={BOT_BUBBLE}>Message sent. We will get back to you soon.</p>
              <button type="button" className={PILL_PRIMARY} onClick={backToQuestions}>
                Back to questions
              </button>
            </div>
          ) : null}
        </div>

        {/* The last pill, pinned under the questions so it never scrolls out of view. */}
        {view === "chat" ? (
          <div className="shrink-0 border-t border-[var(--paper-hairline)] bg-[var(--paper-card)] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
            <button type="button" className={PILL_PRIMARY} onClick={openForm}>
              Message Lifafa
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
