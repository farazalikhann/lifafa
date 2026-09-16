import Link from "next/link";
import type { ReactElement } from "react";
import { signOut } from "@/app/admin/actions";

/**
 * The bar across the top of every signed-in admin page.
 *
 * The sign out control is a form posting to a server action, not a link. A
 * link is a GET, and a GET that ends a session is one a prefetch, a link
 * scanner or an over-eager browser can trigger without anybody clicking it.
 * A form post also means this works with JavaScript disabled, which is the
 * same reason the login form is a plain form.
 */
export default function AdminHeader({
  username,
}: {
  username: string;
}): ReactElement {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
        <Link
          href="/admin"
          className="rounded text-sm font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
        >
          Lifafa admin
        </Link>

        <span className="ml-auto text-sm text-zinc-500">{username}</span>

        <form action={signOut}>
          <button
            type="submit"
            className="min-h-8 rounded-md border border-zinc-300 px-3 text-sm font-medium transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
