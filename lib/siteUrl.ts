/**
 * Where Lifafa lives, and how an invite code becomes a link.
 *
 * A constant rather than a read of `window.location`, because the two places
 * that need this are a server component and a client one, and an origin that
 * differed between them would put a different URL in the card's calendar file
 * than in the host's reminder message. It is also the only honest answer
 * during a server render, where there is no window to ask.
 *
 * No `node:` imports here, deliberately: lib/inviteCode.ts would have been the
 * natural home, but it pulls in `node:crypto` to mint codes and so cannot be
 * imported from a Client Component at all.
 */
export const SITE_ORIGIN = "https://getlifafa.co.in";

/** The absolute link a guest opens. The only place this shape is written. */
export function inviteUrl(inviteCode: string): string {
  return `${SITE_ORIGIN}/i/${inviteCode}`;
}
