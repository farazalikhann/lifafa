"use client";

import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactElement, type ReactNode } from "react";
import { clarityEvent, claritySet } from "@/lib/clarity";
import { inAppBrowser } from "@/lib/inAppBrowser";
import { WHATSAPP_HELP_URL } from "@/lib/site";
import { whatsappHelpUrlHere } from "@/lib/whatsappHelp";

/** Where a WhatsApp chat was opened from, for Clarity's whatsapp_click_from tag. */
export type WhatsAppSource = "floating" | "pay_page" | "link";

/**
 * A chat with Lifafa's WhatsApp Business number, the first message already
 * typed and naming the page the host is on (lib/whatsappHelp.ts). Every
 * WhatsApp help link on the site is this one: "Chat on WhatsApp" in a line of
 * text by default, or whatever is passed as `children` (the payment page's
 * button, the round floating button).
 *
 * A new tab in a browser, so the page the host was on is still there. Not in
 * Instagram's or Facebook's own browser: those handle a new tab unreliably
 * (some open it in place, some drop it), while following the link in place
 * always reaches wa.me, which hands the chat to the WhatsApp app. Decided after
 * the page is up, so the server's HTML and the first render agree.
 *
 * The page in the message is read at the tap, from the address as it is then
 * (a step on /create changes without the page changing); the server's HTML
 * carries the plain message. Each tap is Clarity's whatsapp_click.
 */
export default function WhatsAppLink({
  className = "",
  source = "link",
  ariaLabel,
  style,
  inert,
  children,
}: {
  className?: string;
  source?: WhatsAppSource;
  ariaLabel?: string;
  style?: CSSProperties;
  /** Out of reach (no tap, no focus, not read out) while it is out of sight. */
  inert?: boolean;
  children?: ReactNode;
}): ReactElement {
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setInApp(inAppBrowser(navigator.userAgent) !== null);
  }, []);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>): void => {
    /* Before the browser follows it, so it goes with this page's name in the message. */
    event.currentTarget.href = whatsappHelpUrlHere();
    claritySet("whatsapp_click_from", source);
    clarityEvent("whatsapp_click");
  };

  return (
    <a
      href={WHATSAPP_HELP_URL}
      onClick={handleClick}
      aria-label={ariaLabel}
      style={style}
      inert={inert}
      /* Which one it is; the round button keeps clear of the payment page's (components/help/WhatsAppFloat.tsx). */
      data-whatsapp-source={source}
      {...(inApp ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      className={children === undefined ? `inline-flex items-center gap-1.5 ${className}` : className}
    >
      {children ?? (
        <>
          <WhatsAppIcon />
          Chat on WhatsApp
        </>
      )}
    </a>
  );
}

/**
 * WhatsApp's mark, the speech bubble with the handset, in the text's own
 * colour: 1.15em in a line of text by default, or the size `className` gives.
 */
export function WhatsAppIcon({ className = "h-[1.15em] w-[1.15em]" }: { className?: string }): ReactElement {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.86 9.86 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2Zm0 18.15a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 4.54 0 8.23 3.7 8.23 8.24 0 4.54-3.7 8.24-8.24 8.24Zm4.52-6.16c-.25-.12-1.46-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" />
    </svg>
  );
}
