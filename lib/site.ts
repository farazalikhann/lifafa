import { LIFAFA_DOMAIN } from "@/lib/siteUrl";

/**
 * Where to find Lifafa outside the site: Instagram and the one help address.
 * Written once, here; every page, footer and card reads them from this file.
 */

export const INSTAGRAM_URL = "https://www.instagram.com/getlifafa.co.in/";
export const INSTAGRAM_HANDLE = "@getlifafa.co.in";

/**
 * The one address for help, payments, refunds, data requests and complaints:
 * help@getlifafa.co.in. Built on LIFAFA_DOMAIN (lib/siteUrl.ts owns the
 * domain), so it stays the real mailbox on a preview host or a dev server.
 */
export const HELP_EMAIL = `help@${LIFAFA_DOMAIN}`;
export const HELP_MAILTO = `mailto:${HELP_EMAIL}`;

/**
 * Where the "Made with Lifafa" credit at the end of an invitation leads: the
 * home page, tagged so a visit from a card can be told apart. UTM parameters
 * only; nothing on the invitation tracks the guest.
 */
export const MADE_WITH_LIFAFA_URL = `https://${LIFAFA_DOMAIN}/?utm_source=invite&utm_medium=card_credit&utm_campaign=made_with_lifafa`;
