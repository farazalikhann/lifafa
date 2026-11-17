"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactElement } from "react";
import WhatsAppLink, { WhatsAppIcon } from "@/components/legal/WhatsAppLink";

/**
 * The round WhatsApp button, bottom right, on every host page: the home page,
 * /create on every step and its payment page, the sample invitations under
 * /demo, /login and the dashboard (SHOWN_ON). Never on a guest's invitation
 * (/i), check-in, /admin or the policy pages: a guest's questions go to the
 * host, not to us.
 *
 * ALWAYS ABOVE WHAT IS PINNED TO THE FOOT OF THE PAGE, never over it: the
 * wizard's bar of buttons, the gallery's, a demo's "Create this card" bar on a
 * phone, and the Help button on the home page and the dashboard (CLEAR_OF).
 * Their tops are measured while the page runs, and the button sits 12px over
 * the highest; with none on screen it sits 20px in. Drawn only once the page
 * runs, so it is never seen in the wrong place before that measure. Nor does
 * it cover a main button that scrolls with the page (AVOID): it fades out of
 * the way while one is under it.
 *
 * WhatsApp's green taken a little darker (#1A9E4F), so the white mark on it
 * clears 3:1; #25D366 itself gives the mark 2:1.
 *
 * z-40, the Help button's own layer: under a cover (an invitation's envelope,
 * z-50), the dialogs and full-screen preview (z-50), the "Open in Chrome"
 * sheet (z-60) and the crafting screen (z-70).
 */

/** Host pages, each with everything under it except "/", which is the home page alone. */
const SHOWN_ON = ["/create", "/demo/", "/login", "/dashboard"];

/** Whatever is pinned to the foot of a page, which the button must sit above. */
const CLEAR_OF = "[data-lifafa-foot-bar], [data-demo-create-bar], [data-help-launcher]";

/**
 * A page's main button that scrolls with the page rather than being pinned:
 * the payment page's Pay, and the WhatsApp button under it. While one is under
 * the round button, the round button steps aside (fades out) rather than cover
 * it, and comes back once it has scrolled on.
 */
const AVOID = '[data-pay-button], [data-whatsapp-source="pay_page"]';

/** The button's size, how far it stands off the screen's edge and off whatever it sits above, and the room it keeps round a main button. */
const SIZE_PX = 56;
const EDGE_PX = 20;
const GAP_PX = 12;
const AVOID_ROOM_PX = 4;

function shownOn(pathname: string): boolean {
  return (
    pathname === "/" ||
    SHOWN_ON.some((prefix) =>
      prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

/**
 * Where the button goes: how far up from the foot of the screen the things in
 * CLEAR_OF reach, in px (0 for none on screen), and whether it should step
 * aside because a page's main button is under it now (AVOID). Null until the
 * page has run.
 */
function usePlace(active: boolean): { reach: number; aside: boolean } | null {
  const [place, setPlace] = useState<{ reach: number; aside: boolean } | null>(null);

  useEffect(() => {
    if (!active) {
      return;
    }

    let frame = 0;
    let watched: HTMLElement[] = [];
    const sizes = typeof ResizeObserver === "function" ? new ResizeObserver(() => schedule()) : null;

    const measure = (): void => {
      frame = 0;
      const found = [...document.querySelectorAll<HTMLElement>(CLEAR_OF)];

      /* The bars come and go as the wizard changes step: watch the ones there now. */
      if (found.length !== watched.length || found.some((element, index) => element !== watched[index])) {
        sizes?.disconnect();
        for (const element of found) {
          sizes?.observe(element);
        }
        watched = found;
      }

      const viewport = window.innerHeight;
      const reach = Math.max(
        0,
        ...found.map((element) => {
          const box = element.getBoundingClientRect();
          /* Hidden (a demo's bar from 640px) or off the foot of the screen: nothing to clear. */
          return box.height === 0 || box.width === 0 || box.bottom < viewport - 1 - EDGE_PX * 4
            ? 0
            : Math.ceil(viewport - box.top);
        }),
      );

      /* The button's own box, with a little room round it. */
      const right = document.documentElement.clientWidth - EDGE_PX + AVOID_ROOM_PX;
      const left = right - SIZE_PX - 2 * AVOID_ROOM_PX;
      const bottom = viewport - (reach > 0 ? reach + GAP_PX : EDGE_PX) + AVOID_ROOM_PX;
      const top = bottom - SIZE_PX - 2 * AVOID_ROOM_PX;
      const aside = [...document.querySelectorAll<HTMLElement>(AVOID)].some((element) => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.left < right && box.right > left && box.top < bottom && box.bottom > top;
      });

      setPlace((was) => (was !== null && was.reach === reach && was.aside === aside ? was : { reach, aside }));
    };

    const schedule = (): void => {
      if (frame === 0) {
        frame = window.requestAnimationFrame(measure);
      }
    };

    measure();
    const added = new MutationObserver(schedule);
    added.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    /* A main button scrolling under it, or out from under it. */
    window.addEventListener("scroll", schedule, { passive: true });

    return () => {
      window.cancelAnimationFrame(frame);
      added.disconnect();
      sizes?.disconnect();
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
    };
  }, [active]);

  return active ? place : null;
}

export default function WhatsAppFloat(): ReactElement | null {
  const pathname = usePathname();
  const shown = shownOn(pathname);
  const place = usePlace(shown);

  if (!shown || place === null) {
    return null;
  }

  return (
    <WhatsAppLink
      source="floating"
      ariaLabel="Chat with us on WhatsApp"
      inert={place.aside}
      className="fixed right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#1A9E4F] text-white shadow-[0_6px_18px_rgb(0_0_0/0.3)] transition-[transform,background-color,opacity] duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#178A45] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-[#1A9E4F] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{
        bottom:
          place.reach > 0
            ? `${place.reach + GAP_PX}px`
            : `calc(${EDGE_PX}px + env(safe-area-inset-bottom))`,
        /* Stepped aside: out of sight, out of reach of a tap and of the keyboard. */
        opacity: place.aside ? 0 : 1,
        pointerEvents: place.aside ? "none" : undefined,
      }}
    >
      <WhatsAppIcon className="h-7 w-7" />
    </WhatsAppLink>
  );
}
