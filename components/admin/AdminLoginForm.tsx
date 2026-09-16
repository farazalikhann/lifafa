"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ReactElement } from "react";
import { signIn } from "@/app/admin/actions";
import {
  ADMIN_LOGIN_INITIAL_STATE,
  type AdminLoginState,
} from "@/lib/admin/loginState";

/**
 * The owner's sign in form.
 *
 * A plain <form> with an action, not a fetch. It posts to the server action
 * whether or not React has hydrated, which matters more here than anywhere
 * else in the app: this is the page somebody opens when something is wrong,
 * and a login that needs JavaScript to work is a login that can stop working.
 *
 * The password never reaches any client state. It goes into an uncontrolled
 * input, the browser posts it, and this component never sees it — so there is
 * nothing for a React devtools inspection, an error boundary or a client-side
 * log to pick up.
 */

/** The submit button, in its own component so it can read the pending state. */
function SubmitButton(): ReactElement {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="mt-6 min-h-11 w-full rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-wait disabled:bg-zinc-400"
    >
      {pending ? "Checking…" : "Sign in"}
    </button>
  );
}

export default function AdminLoginForm(): ReactElement {
  const [state, formAction] = useActionState<AdminLoginState, FormData>(
    signIn,
    ADMIN_LOGIN_INITIAL_STATE,
  );

  return (
    <form action={formAction} className="w-full">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="admin-username" className="text-sm font-medium">
          Username
        </label>
        <input
          id="admin-username"
          name="username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900"
        />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <label htmlFor="admin-password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm focus:border-zinc-900 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900"
        />
      </div>

      <SubmitButton />

      {/*
        One message, wherever the failure came from, and never a hint about
        which field it was. role="alert" so a screen reader is told without
        having to go looking.
      */}
      {state.error !== null ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
