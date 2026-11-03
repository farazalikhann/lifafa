/**
 * The handoff id on a URL: the card saved on the server when "Save and
 * continue" is pressed in Instagram's or Facebook's in-app browser
 * (lib/handoff/actions.ts).
 *
 * THE ID RIDES ON EVERY URL OF THE TRIP, never in one browser's storage: the
 * Chrome or Safari link, /login, the sign-in's return path through Google and
 * the auth callback, and /create after it. Whatever browser, tab or Custom Tab
 * the trip ends in, the URL still names the card, and /create brings it back
 * from the server.
 *
 * Plain functions with no server code, so a page and a server component can
 * both use them.
 */

/** The query parameter the id travels in. */
export const HANDOFF_PARAM = "handoff";

/** 12 random bytes: 16 characters of base64url. The shape lib/handoff/actions.ts makes. */
const ID_SHAPE = /^[A-Za-z0-9_-]{16}$/;

/** Whether a value has the exact shape of a handoff id. */
export function isHandoffId(value: unknown): value is string {
  return typeof value === "string" && ID_SHAPE.test(value);
}

/** The handoff id in a query string, if it holds a well-formed one. */
export function handoffFromSearch(search: string): string | null {
  const id = new URLSearchParams(search).get(HANDOFF_PARAM);
  return isHandoffId(id) ? id : null;
}

/**
 * A same-site path ("/create?step=preview") with the handoff id on its query.
 * The path is kept exactly as it was otherwise; an id already there is
 * replaced.
 */
export function pathWithHandoff(path: string, id: string): string {
  const hashAt = path.indexOf("#");
  const hash = hashAt === -1 ? "" : path.slice(hashAt);
  const beforeHash = hashAt === -1 ? path : path.slice(0, hashAt);
  const queryAt = beforeHash.indexOf("?");
  const pathname = queryAt === -1 ? beforeHash : beforeHash.slice(0, queryAt);
  const params = new URLSearchParams(queryAt === -1 ? "" : beforeHash.slice(queryAt + 1));

  params.set(HANDOFF_PARAM, id);

  return `${pathname}?${params.toString()}${hash}`;
}
