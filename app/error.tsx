"use client";

import type { ReactElement } from "react";
import ErrorScreen from "@/components/error/ErrorScreen";

/**
 * The catch-all boundary, for every route that has not written its own.
 *
 * Without this file Next renders its built-in fallback — "Application error: a
 * client-side exception has occurred" — which tells a host nothing, offers them
 * nothing to do, and does not look like the product they were using a moment
 * ago.
 *
 * It cannot catch everything: an error thrown by the root layout itself
 * escapes, because this component renders inside that layout. Only
 * app/global-error.tsx covers that, and it costs the layout to render one.
 * Every route below the layout is covered, which is where the code that can
 * actually fail lives.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): ReactElement {
  return (
    <ErrorScreen
      error={error}
      reset={reset}
      context="app/error.tsx"
      title="Something went wrong"
      description="This page did not load properly. Nothing you have saved is affected — try again, and if it keeps happening, come back in a few minutes."
    />
  );
}
