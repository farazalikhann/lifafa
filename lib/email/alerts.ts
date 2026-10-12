/**
 * An email to the owner, for the few things that cannot wait to be noticed on
 * a dashboard: today, a payment the webhook took and would not apply.
 *
 * SENT THROUGH RESEND'S HTTP API with fetch, so there is no package to add.
 * Three variables, all server only (see .env.example):
 *
 *   RESEND_API_KEY       the key, from resend.com. Unset, nothing is sent.
 *   PAYMENT_ALERT_EMAIL  where it goes: the owner's address. Unset, nothing
 *                        is sent.
 *   ALERT_EMAIL_FROM     who it is from. Must be an address on a domain
 *                        verified with Resend. Unset, Resend's own test
 *                        sender is used, which delivers only to the address
 *                        the Resend account itself was opened with.
 *
 * NEVER THROWS AND NEVER BLOCKS. This is called from the payment webhook,
 * whose job is to answer Razorpay; an alert that could not be sent is logged,
 * with the whole of what it would have said, and the webhook carries on. The
 * log line is therefore the record of last resort: everything in the email is
 * in it.
 */
const RESEND_ENDPOINT = "https://api.resend.com/emails";
const RESEND_TEST_SENDER = "Lifafa alerts <onboarding@resend.dev>";
/* An alert that has not gone in this long is not going to; the webhook must not wait on it. */
const SEND_TIMEOUT_MS = 8000;

export async function sendOwnerAlert(
  subject: string,
  lines: readonly string[],
): Promise<boolean> {
  const text = lines.join("\n");
  const key = (process.env.RESEND_API_KEY ?? "").trim();
  const to = (process.env.PAYMENT_ALERT_EMAIL ?? "").trim();
  const from = (process.env.ALERT_EMAIL_FROM ?? "").trim() || RESEND_TEST_SENDER;

  if (key.length === 0 || to.length === 0) {
    console.error(
      `[alert] NOT EMAILED (${key.length === 0 ? "RESEND_API_KEY" : "PAYMENT_ALERT_EMAIL"} is not set). ${subject}\n${text}`,
    );
    return false;
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, text }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      console.error(
        `[alert] NOT EMAILED (Resend answered ${response.status}: ${(await response.text()).slice(0, 300)}). ${subject}\n${text}`,
      );
      return false;
    }

    return true;
  } catch (cause: unknown) {
    console.error(`[alert] NOT EMAILED (${String(cause)}). ${subject}\n${text}`);
    return false;
  }
}
