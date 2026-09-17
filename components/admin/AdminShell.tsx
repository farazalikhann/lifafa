import Link from "next/link";
import type { ReactElement, ReactNode } from "react";
import AdminNav from "@/components/admin/AdminNav";
import { signOut } from "@/app/admin/actions";

/**
 * The frame every signed-in admin page sits in: nav down the side, identity
 * across the top, page in the middle.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * IN THE LAYOUT, NOT IN EACH PAGE, and that is the change that makes the
 * loading states work. Each page used to render its own header, so a
 * slow query meant a blank screen with no chrome at all — nothing to look at,
 * nothing to navigate away with. Now the shell is rendered by the layout and
 * only the page area is replaced by a skeleton, so a slow query looks like a
 * page thinking rather than a page broken.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * THE SIDEBAR IS `position: sticky`, not fixed. Fixed would need the main
 * column to carry a matching margin, and the two would drift apart the first
 * time either width changed. Sticky keeps them in one flex row that the
 * browser sizes, and the nav simply stops scrolling at the top of the viewport.
 *
 * On narrow screens the whole thing is a normal document: header, then a
 * horizontally scrolling nav bar, then the page. Nothing is sticky there —
 * a phone screen is short, and a bar that eats forty pixels of it on every
 * scroll is a bar that has outstayed its welcome.
 */
export default function AdminShell({
  username,
  children,
}: {
  username: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="min-h-screen">
      {/* ── Header: identity and the way out, and nothing else ── */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/admin"
            className="rounded text-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Lifafa admin
          </Link>

          {/*
            `truncate` with a min-width of zero, because a long username in a
            flex row does not wrap, it pushes the sign-out button off the edge
            of a phone screen. The title attribute keeps the full value
            readable.
          */}
          <span
            title={username}
            className="ml-auto min-w-0 truncate text-sm text-zinc-500"
          >
            {username}
          </span>

          {/*
            A form posting to a server action, not a link. A link is a GET, and
            a GET that ends a session is one a prefetch or a link scanner can
            fire without anybody clicking it. It also works with JavaScript off.
          */}
          <form action={signOut} className="shrink-0">
            <button
              type="submit"
              className="min-h-9 rounded-md border border-zinc-300 px-3 text-sm font-medium transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* ── Nav bar, narrow screens only ── */}
      <div className="border-b border-zinc-200 bg-white px-4 py-2 sm:px-6 lg:hidden">
        <AdminNav />
      </div>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 sm:px-6">
        {/* ── Sidebar, wide screens only ── */}
        <aside className="hidden w-44 shrink-0 py-6 lg:block">
          <div className="sticky top-6">
            <AdminNav />
          </div>
        </aside>

        {/*
          `min-w-0` is load-bearing on a flex child. Without it the main column
          refuses to shrink below the intrinsic width of its widest contents —
          which here is a table with a `min-w-[860px]` — and the whole page
          gains a horizontal scrollbar instead of the table gaining its own.
        */}
        <main className="min-w-0 flex-1 py-6">{children}</main>
      </div>
    </div>
  );
}

/**
 * A page's title and one line under it, laid out the same way everywhere.
 *
 * Its own component because three pages had three slightly different versions
 * of the same two elements, and "slightly different" across an internal tool is
 * how it starts looking untended.
 */
export function PageHeading({
  title,
  description,
  /** Anything that belongs beside the title — a back link, a count. */
  aside,
}: {
  title: string;
  description?: string;
  aside?: ReactNode;
}): ReactElement {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description === undefined ? null : (
          <p className="mt-1 text-sm text-zinc-500">{description}</p>
        )}
      </div>
      {aside === undefined ? null : <div className="shrink-0">{aside}</div>}
    </div>
  );
}
