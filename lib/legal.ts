import { POLICY_PATHS } from "@/lib/metaPixel";
import { LIFAFA_DOMAIN } from "@/lib/siteUrl";

/**
 * Who runs Lifafa and how to reach them, and the five policy pages, written
 * once for the pages, the footer and the sitemap.
 *
 * The mailbox is built on LIFAFA_DOMAIN rather than the resolved origin: it
 * stays support@getlifafa.co.in on a preview host or a dev server, because
 * that is where the mail actually goes.
 */
export const SUPPORT_EMAIL = `support@${LIFAFA_DOMAIN}`;

export const OPERATOR = {
  name: "Faraz Ali Khan",
  city: "Lucknow, Uttar Pradesh, India",
} as const;

export type PolicyPath = (typeof POLICY_PATHS)[number];

/**
 * Each page's name in a link. Keyed by the pixel's own list of policy paths
 * (lib/metaPixel.ts), so a page cannot be linked without being measured as a
 * Lifafa page, or the other way round.
 */
const POLICY_LABELS: Record<PolicyPath, string> = {
  "/privacy": "Privacy Policy",
  "/terms": "Terms and Conditions",
  "/refunds": "Cancellation and Refund Policy",
  "/shipping": "Shipping and Delivery Policy",
  "/contact": "Contact Us",
};

export const POLICY_LINKS: readonly { href: PolicyPath; label: string }[] =
  POLICY_PATHS.map((href) => ({ href, label: POLICY_LABELS[href] }));

/**
 * The year in India rather than on the runtime's clock. `getFullYear()`
 * resolves in whatever zone the process sits in, so a UTC server and an IST
 * browser disagree for the five and a half hours around New Year.
 */
export function currentYearInIndia(): string {
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());
}
