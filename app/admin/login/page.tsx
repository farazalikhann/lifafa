import type { Metadata } from "next";
import type { ReactElement } from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

/**
 * The one page under /admin that is open.
 *
 * middleware.ts lets this through without a session and sends anyone who
 * already has one straight on to the dashboard, so this component never has to
 * ask who is looking at it.
 *
 * It says "Lifafa admin" and nothing else. No explanation of what is behind
 * it, no mention of what the dashboard holds, no link back to the product —
 * a login page is read by strangers, and every sentence on it is a sentence
 * telling a stranger whether this is worth their time.
 */

export const metadata: Metadata = {
  title: "Sign in · Lifafa admin",
  robots: { index: false, follow: false },
};

/*
  Never prerendered and never cached. This page's only job is to draw a form
  whose outcome depends on a cookie, and a cached copy of it is a copy served
  to someone whose session state the cache knows nothing about.
*/
export const dynamic = "force-dynamic";

export default function AdminLoginPage(): ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-lg font-semibold tracking-tight">Lifafa admin</h1>
        <p className="mt-1 mb-8 text-sm text-zinc-500">Owner access only.</p>

        <AdminLoginForm />
      </div>
    </main>
  );
}
