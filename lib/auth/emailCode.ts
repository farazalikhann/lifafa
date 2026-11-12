/**
 * Sign in with a code sent by email: what can go wrong, told apart, and what
 * the host is told (components/auth/EmailCodeForm.tsx). Each reason is also
 * the value Clarity's login_email_code_failed is tagged with.
 *
 * Supabase sends the code (6 digits, valid for 10 minutes) through Resend,
 * from Lifafa <login@getlifafa.co.in>.
 */

/** How long a code is good for, as set in Supabase. */
export const CODE_LIFETIME_MS = 10 * 60 * 1000;

/** How long before another code may be asked for. Supabase allows one a minute per address. */
export const RESEND_COOLDOWN_MS = 60 * 1000;

/** Wrong codes in a row before the host is asked to send a new one. */
export const MAX_WRONG_TRIES = 5;

export const CODE_LENGTH = 6;

export type CodeFailure =
  | "offline"
  | "network"
  | "invalid_email"
  | "send_limit"
  | "not_allowed"
  | "send_error"
  | "wrong"
  | "expired"
  | "too_many_tries"
  | "verify_error";

export const CODE_FAILURE_MESSAGES: Record<CodeFailure, string> = {
  offline: "You are offline. Connect to the internet, then try again.",
  network: "Could not reach the sign in service. Check your connection and try again.",
  invalid_email: "Please enter your full email address, like name@gmail.com.",
  send_limit: "Too many codes were asked for. Please wait a few minutes, then send a new code.",
  not_allowed: "Sign in by email is not available right now. Please try again shortly.",
  send_error: "Could not send the code. Please try again.",
  wrong: "That code is not right. Check the newest email from Lifafa and try again.",
  expired: "That code has expired. Send a new code and enter the newest one.",
  too_many_tries: "Too many tries. Please wait a few minutes, then send a new code.",
  verify_error: "Could not check the code. Please try again.",
};

/** A plain check that catches typing slips; Supabase has the final word. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * The code in whatever was typed, pasted or filled in: "123456", "123 456",
 * or a whole line from the email ("Your code is 123456"). A run of exactly six
 * digits wins over the digits gathered from the whole text, so a date or a
 * number elsewhere in a pasted line does not get mixed in.
 */
export function codeFrom(text: string): string {
  const run = /(?:^|\D)(\d{3}[\s-]?\d{3})(?!\d)/.exec(text);

  if (run?.[1] !== undefined) {
    return run[1].replace(/\D/g, "");
  }

  return text.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

/*
  Supabase's errors, read by their shape rather than with its own isAuthApiError:
  importing that would bring the whole sign-in client into the page's first
  download, which it is kept out of (lib/supabase/loadClient.ts).
*/
interface ApiError {
  name: "AuthApiError";
  message: string;
  status?: number;
  code?: string;
}

function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AuthApiError"
  );
}

function isNetworkFailure(error: unknown): boolean {
  return (
    error instanceof TypeError ||
    (typeof error === "object" &&
      error !== null &&
      (error as { name?: unknown }).name === "AuthRetryableFetchError")
  );
}

function offline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

/**
 * Seconds Supabase asks the host to wait before another code: its message is
 * "For security purposes, you can only request this after 37 seconds."
 */
export function waitSecondsFrom(error: unknown): number | null {
  if (!isApiError(error)) {
    return null;
  }

  const match = /after (\d+) seconds?/i.exec(error.message);
  return match?.[1] === undefined ? null : Number(match[1]);
}

/** Why signInWithOtp did not send a code. */
export function sendFailure(error: unknown): CodeFailure {
  if (offline()) {
    return "offline";
  }

  if (isNetworkFailure(error)) {
    return "network";
  }

  if (isApiError(error)) {
    switch (error.code) {
      case "over_email_send_rate_limit":
      case "over_request_rate_limit":
        return "send_limit";
      case "email_address_invalid":
      case "validation_failed":
        return "invalid_email";
      case "signup_disabled":
      case "otp_disabled":
      case "email_provider_disabled":
      case "email_address_not_authorized":
        return "not_allowed";
    }

    if (error.status === 429) {
      return "send_limit";
    }
  }

  return "send_error";
}

/**
 * Why verifyOtp did not accept a code.
 *
 * Supabase answers a wrong code and an old one the same way ("Token has
 * expired or is invalid", otp_expired), so they are told apart by the clock:
 * a code older than its 10 minutes has expired, anything sooner was mistyped
 * or is from an earlier email (a new code replaces the one before).
 */
export function verifyFailure(error: unknown, sentAt: number, now = Date.now()): CodeFailure {
  if (offline()) {
    return "offline";
  }

  if (isNetworkFailure(error)) {
    return "network";
  }

  if (isApiError(error)) {
    if (error.code === "over_request_rate_limit" || error.status === 429) {
      return "too_many_tries";
    }

    if (
      error.code === "otp_expired" ||
      error.code === "invalid_credentials" ||
      error.status === 403
    ) {
      return now - sentAt >= CODE_LIFETIME_MS ? "expired" : "wrong";
    }
  }

  return "verify_error";
}
