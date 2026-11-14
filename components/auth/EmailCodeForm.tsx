"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type ReactElement,
} from "react";
import { loadClient } from "@/lib/supabase/loadClient";
import { signInDestination } from "@/lib/auth/signInDestination";
import { isOnline } from "@/lib/loadNotice";
import { clarityEvent, claritySet } from "@/lib/clarity";
import {
  CODE_FAILURE_MESSAGES,
  CODE_LENGTH,
  MAX_WRONG_TRIES,
  RESEND_COOLDOWN_MS,
  codeFrom,
  looksLikeEmail,
  sendFailure,
  verifyFailure,
  waitSecondsFrom,
  type CodeFailure,
} from "@/lib/auth/emailCode";
import {
  PRIMARY_SIGNIN_BUTTON,
  SECONDARY_SIGNIN_BUTTON,
  SIGNIN_FIELD,
  SIGNIN_TEXT_BUTTON,
} from "@/components/auth/styles";

/**
 * Sign in with a 6-digit code sent by email: for anyone without Google, and
 * the first way in from Instagram's and Facebook's browsers, where Google
 * refuses to sign anyone in (SignInForm).
 *
 * The same Supabase Auth as Google. A host who signed in with Google before
 * and gives the same address lands on the same account; a new address makes
 * one (shouldCreateUser). No emailRedirectTo: the email holds the code only.
 *
 * Once the code is accepted, the browser has the session, and goes to
 * /auth/email, which leaves exactly as the return from Google does: to the
 * same `redirectTo`, with a waiting card's handoff inside it, and the same
 * marks for login_success (app/auth/email/route.ts).
 */

type Stage = { kind: "email" } | { kind: "code"; email: string; sentAt: number };

type Busy = "sending" | "checking" | "finishing" | null;

interface Problem {
  text: string;
}

/** The failure, for Clarity: the event, and why in the session's tag. */
function report(reason: CodeFailure): void {
  claritySet("login_email_code_failed_reason", reason);
  clarityEvent("login_email_code_failed");
}

/** An envelope, for the email way in. */
export function MailMark(): ReactElement {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </svg>
  );
}

export default function EmailCodeForm({
  redirectTo,
  primary,
  autoFocus,
}: {
  /** Where to land after signing in. A path, already validated by the caller. */
  redirectTo: string;
  /** The first way in on this page: its button is the main one. */
  primary: boolean;
  /** Put the cursor in the email field at once (it was opened by a tap). */
  autoFocus: boolean;
}): ReactElement {
  const [stage, setStage] = useState<Stage>({ kind: "email" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  /** When another code may be asked for. */
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(0);
  const wrongTries = useRef(0);
  /** A code being checked: the auto-submit and the button never both send it. */
  const checking = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const emailId = `${id}-email`;
  const codeId = `${id}-code`;
  const problemId = `${id}-problem`;
  const helpId = `${id}-help`;

  useEffect(() => {
    if (autoFocus) {
      emailRef.current?.focus();
    }
  }, [autoFocus]);

  /* The code field takes the cursor as it appears, and again after a new code. */
  useEffect(() => {
    if (stage.kind === "code") {
      codeRef.current?.focus();
    }
  }, [stage]);

  /* The countdown on "Send a new code", ticking only while there is one. */
  useEffect(() => {
    const tick = (): boolean => {
      const time = Date.now();
      setNow(time);
      return time < resendAt;
    };

    if (!tick()) {
      return;
    }

    const timer = window.setInterval(() => {
      if (!tick()) {
        window.clearInterval(timer);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendAt]);

  /*
    Back from the next page by the back/forward cache, this page would still
    say "Signing you in" with nothing in flight. A restored page starts fresh.
  */
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent): void => {
      if (event.persisted) {
        checking.current = false;
        setBusy(null);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const fail = (reason: CodeFailure, text = CODE_FAILURE_MESSAGES[reason]): void => {
    report(reason);
    setNotice(null);
    setProblem({ text });
  };

  const send = async (raw: string, again: boolean): Promise<void> => {
    if (busy !== null) {
      return;
    }

    const address = raw.trim().toLowerCase();

    if (!looksLikeEmail(address)) {
      fail("invalid_email");
      emailRef.current?.focus();
      return;
    }

    if (!isOnline()) {
      fail("offline");
      return;
    }

    setBusy("sending");
    setProblem(null);
    setNotice(null);

    try {
      const supabase = await loadClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: true },
      });

      if (error !== null) {
        console.error("[auth] could not send an email code:", error);
        const reason = sendFailure(error);
        const wait = reason === "send_limit" ? waitSecondsFrom(error) : null;

        if (wait !== null) {
          setResendAt(Date.now() + wait * 1000);
          fail(reason, `Please wait ${wait} seconds, then ask for a new code.`);
        } else {
          fail(reason);
        }

        return;
      }

      clarityEvent("login_email_code_sent");
      const sentAt = Date.now();
      wrongTries.current = 0;
      setEmail(address);
      setCode("");
      setResendAt(sentAt + RESEND_COOLDOWN_MS);
      setStage({ kind: "code", email: address, sentAt });
      setNotice(again ? `We sent a new code to ${address}. Use the newest email.` : null);
    } catch (cause: unknown) {
      console.error("[auth] email code request failed:", cause);
      fail(sendFailure(cause));
    } finally {
      setBusy(null);
    }
  };

  const verify = async (token: string): Promise<void> => {
    if (stage.kind !== "code" || checking.current) {
      return;
    }

    if (token.length !== CODE_LENGTH) {
      setNotice(null);
      setProblem({ text: "Please enter all 6 digits of the code." });
      codeRef.current?.focus();
      return;
    }

    if (wrongTries.current >= MAX_WRONG_TRIES) {
      fail("too_many_tries", "Too many wrong tries. Send a new code and enter the newest one.");
      return;
    }

    if (!isOnline()) {
      fail("offline");
      return;
    }

    checking.current = true;
    setBusy("checking");
    setProblem(null);
    setNotice(null);

    const giveBack = (reason: CodeFailure): void => {
      let text = CODE_FAILURE_MESSAGES[reason];

      if (reason === "wrong") {
        wrongTries.current += 1;

        if (wrongTries.current >= MAX_WRONG_TRIES) {
          text = "Too many wrong tries. Send a new code and enter the newest one.";
        }
      }

      fail(reason, text);
      checking.current = false;
      setBusy(null);
      /* The code stays, selected, so the next one typed replaces it. */
      window.requestAnimationFrame(() => {
        codeRef.current?.focus();
        codeRef.current?.select();
      });
    };

    try {
      const supabase = await loadClient();
      const { data, error } = await supabase.auth.verifyOtp({
        email: stage.email,
        token,
        type: "email",
      });

      if (error !== null || data.session === null) {
        console.error("[auth] email code not accepted:", error);
        giveBack(error === null ? "verify_error" : verifyFailure(error, stage.sentAt));
        return;
      }

      clarityEvent("login_email_code_verified");
      setBusy("finishing");

      /*
        On, exactly as a return from Google goes on (app/auth/email/route.ts).
        replace(): Back from the card should not land on a used code.
      */
      const finish = new URL("/auth/email", window.location.origin);
      /*
        With a card still unsaved in this browser, back to /create, which saves
        it to the account at once, wherever this page was opened from
        (lib/signInCard.ts).
      */
      finish.searchParams.set("redirectTo", await signInDestination(redirectTo));
      window.location.replace(finish.toString());
    } catch (cause: unknown) {
      console.error("[auth] email code check failed:", cause);
      giveBack(verifyFailure(cause, stage.sentAt));
    }
  };

  const handleCodeChange = (value: string): void => {
    const next = codeFrom(value);
    setCode(next);

    if (problem !== null) {
      setProblem(null);
    }

    /* Six digits in: checked at once, however they arrived. */
    if (next.length === CODE_LENGTH && next !== code) {
      void verify(next);
    }
  };

  /* A pasted line from the email ("Your code is 123 456") gives up its code. */
  const handleCodePaste = (event: ClipboardEvent<HTMLInputElement>): void => {
    const text = event.clipboardData.getData("text");

    if (text === "") {
      return;
    }

    event.preventDefault();
    const next = codeFrom(text);
    setCode(next);
    setProblem(null);

    if (next.length === CODE_LENGTH) {
      void verify(next);
    }
  };

  const problemBox =
    problem !== null ? (
      <p
        id={problemId}
        role="alert"
        className="mt-3 rounded-xl border border-[var(--lifafa-rose)]/40 bg-[var(--lifafa-rose)]/10 px-4 py-3 text-sm text-[var(--lifafa-cream)]"
      >
        {problem.text}
      </p>
    ) : null;

  if (stage.kind === "email") {
    const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault();
      void send(email, false);
    };

    return (
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor={emailId} className="block text-sm font-medium text-[var(--lifafa-cream)]">
          Your email address
        </label>
        <input
          ref={emailRef}
          id={emailId}
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="send"
          placeholder="name@gmail.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setProblem(null);
          }}
          readOnly={busy !== null}
          aria-invalid={problem !== null}
          aria-describedby={problem !== null ? problemId : undefined}
          className={`${SIGNIN_FIELD} mt-2`}
        />

        <button
          type="submit"
          disabled={busy !== null}
          aria-busy={busy === "sending"}
          className={`${primary ? PRIMARY_SIGNIN_BUTTON : SECONDARY_SIGNIN_BUTTON} mt-4`}
        >
          {busy === "sending" ? (
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
            />
          ) : (
            <MailMark />
          )}
          {busy === "sending" ? "Sending your code…" : "Get a code on email"}
        </button>

        {problemBox}
      </form>
    );
  }

  const waitLeft = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const coolingDown = waitLeft > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    void verify(code);
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <p className="text-sm leading-relaxed text-[var(--lifafa-cream)]">
        We sent a 6-digit code to{" "}
        <strong className="font-semibold break-all">{stage.email}</strong>. Enter it below.
      </p>

      <label htmlFor={codeId} className="mt-4 block text-sm font-medium text-[var(--lifafa-cream)]">
        6-digit code
      </label>
      <input
        ref={codeRef}
        id={codeId}
        type="text"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        enterKeyHint="go"
        value={code}
        onChange={(event) => handleCodeChange(event.target.value)}
        onPaste={handleCodePaste}
        readOnly={busy !== null}
        aria-invalid={problem !== null}
        aria-describedby={problem !== null ? `${problemId} ${helpId}` : helpId}
        className={`${SIGNIN_FIELD} mt-2 indent-[0.45em] text-center font-semibold tracking-[0.45em] tabular-nums text-[1.5rem]`}
      />

      <button
        type="submit"
        disabled={busy !== null}
        aria-busy={busy === "checking" || busy === "finishing"}
        className={`${PRIMARY_SIGNIN_BUTTON} mt-4`}
      >
        {busy === "checking" || busy === "finishing" ? (
          <span
            aria-hidden="true"
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none"
          />
        ) : null}
        {busy === "checking"
          ? "Checking your code…"
          : busy === "finishing"
            ? "Signing you in…"
            : "Sign in"}
      </button>

      {notice !== null ? (
        <p
          role="status"
          className="mt-3 rounded-xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-4 py-3 text-sm text-[var(--lifafa-muted)]"
        >
          {notice}
        </p>
      ) : null}

      {problemBox}

      <p id={helpId} className="mt-3 text-[0.8125rem] leading-snug text-[var(--lifafa-muted)]">
        The code works for 10 minutes. It comes from Lifafa (login@getlifafa.co.in) and can
        take a minute to arrive. If you cannot find it, check your Spam or Promotions folder.
      </p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4">
        <button
          type="button"
          onClick={() => void send(stage.email, true)}
          disabled={coolingDown || busy !== null}
          aria-busy={busy === "sending"}
          className={SIGNIN_TEXT_BUTTON}
        >
          {busy === "sending"
            ? "Sending…"
            : coolingDown
              ? `Send a new code in ${waitLeft}s`
              : "Send a new code"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStage({ kind: "email" });
            setProblem(null);
            setNotice(null);
            setCode("");
            window.requestAnimationFrame(() => emailRef.current?.focus());
          }}
          disabled={busy !== null}
          className={SIGNIN_TEXT_BUTTON}
        >
          Use a different email
        </button>
      </div>
    </form>
  );
}
