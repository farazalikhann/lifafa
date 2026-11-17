import { WHATSAPP_HELP_URL } from "@/lib/site";
import { WIZARD_PATH, WIZARD_STEP_PARAM, wizardStepId, type WizardStepId } from "@/lib/wizardSteps";

/**
 * The WhatsApp help chat, its first message saying which page the host was
 * on: "Hi, I need help with my Lifafa card (payment page)". WHATSAPP_HELP_URL
 * (lib/site.ts) types the sentence; this adds the page in brackets, so the
 * reply can start from where the host is stuck instead of asking.
 *
 * Read from the address at the moment of the tap (the step on /create changes
 * without the path changing), so a link built here is always up to date.
 */

const STEP_PAGE: Readonly<Record<WizardStepId, string>> = {
  template: "choose design step",
  details: "details step",
  customize: "customize step",
  preview: "preview step",
};

/** Which page the host is on, in a few words, or null for a page not named here. */
export function helpPageOf(pathname: string, search: string): string | null {
  if (pathname === "/") {
    return "home page";
  }

  if (pathname === WIZARD_PATH) {
    const params = new URLSearchParams(search);

    /* /create?event=<id> is always the saved card's payment page (app/create/page.tsx). */
    if (params.has("event")) {
      return "payment page";
    }

    return STEP_PAGE[wizardStepId(params.get(WIZARD_STEP_PARAM)) ?? "template"];
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    return "sign-in page";
  }

  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
    return "dashboard";
  }

  if (pathname.startsWith("/demo/")) {
    return "sample invitation";
  }

  return null;
}

/** WHATSAPP_HELP_URL with the page added to its message; unchanged for a page with no name. */
export function whatsappHelpUrl(page: string | null): string {
  return page === null ? WHATSAPP_HELP_URL : `${WHATSAPP_HELP_URL}${encodeURIComponent(` (${page})`)}`;
}

/** The link for the page the browser is on now. */
export function whatsappHelpUrlHere(): string {
  return whatsappHelpUrl(helpPageOf(window.location.pathname, window.location.search));
}
