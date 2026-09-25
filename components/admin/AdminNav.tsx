"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactElement } from "react";

/**
 * Overview, Events, Coupons, Free activation — as a sidebar on a laptop and a
 * top bar on a phone.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ONE COMPONENT, TWO LAYOUTS, NO JAVASCRIPT DECIDING WHICH. The wrapper in
 * AdminShell switches between a column and a row with Tailwind's `lg:`
 * breakpoint, so there is no "is the sidebar open" state, no toggle button, no
 * hamburger and nothing to get stuck open after a navigation. Four
 * destinations do not need a drawer; they need to be visible.
 *
 * The narrow layout scrolls horizontally rather than wrapping, so the bar is
 * always one line tall however many items it grows to hold.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * THE ONLY REASON THIS IS A CLIENT COMPONENT is `usePathname`, for the active
 * mark. That is worth the few hundred bytes in an internal tool: the pages
 * look alike enough that "which one am I on" is a real question, and answering
 * it in the markup costs less than answering it by reading the heading.
 */

interface NavItem {
  href: string;
  label: string;
  /**
   * Whether a child path counts as being here.
   *
   * /admin/events/<id> should light up "Events"; /admin/coupons/<code> should
   * light up "Coupons". /admin must NOT light up for either, which is why it
   * is matched exactly and the others by prefix.
   */
  exact: boolean;
}

const ITEMS: readonly NavItem[] = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/events", label: "Events", exact: false },
  { href: "/admin/coupons", label: "Coupons", exact: false },
  { href: "/admin/complimentary", label: "Free activation", exact: false },
];

function isCurrent(pathname: string, item: NavItem): boolean {
  return item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export default function AdminNav(): ReactElement {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Admin sections"
      /*
        A row that scrolls on a phone, a column on a laptop. `lg:overflow-visible`
        undoes the scroll container at the wide breakpoint so a focus ring on the
        first item is not clipped by it.
      */
      className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible"
    >
      {ITEMS.map((item) => {
        const current = isCurrent(pathname, item);

        return (
          <Link
            key={item.href}
            href={item.href}
            /*
              `aria-current="page"` is what actually tells a screen reader which
              section this is. The colour is for everyone else, and is never the
              only signal — the current item is also the only bold one, so this
              still reads on a monochrome screen or to someone who cannot
              distinguish the greys.
            */
            aria-current={current ? "page" : undefined}
            className={`min-h-9 shrink-0 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 ${
              current
                ? "bg-zinc-200 font-semibold text-zinc-900"
                : "font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
