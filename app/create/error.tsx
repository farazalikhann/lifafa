"use client";

import type { ReactElement } from "react";
import ErrorScreen from "@/components/error/ErrorScreen";

/**
 * The editor's own boundary.
 *
 * Separate from app/error.tsx because /create is the one page where a host has
 * work in progress, and the first thing they will want to know is what happened
 * to it. The copy answers that before anything else.
 *
 * And it is honest: reset() re-renders this segment, which remounts the editor
 * and drops the card held in its state, but a new card is kept on this phone
 * as it is typed (lib/cardAutosave.ts, written again as the editor unmounts),
 * and the editor that opens brings it back with "Your card details were
 * restored". A code chunk that fails to arrive no longer lands here at all
 * (hooks/useLazyModule.ts).
 */
export default function CreateError({
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
      context="app/create/error.tsx"
      title="The editor could not load"
      description="Something went wrong while opening your card. What you typed is saved on this phone, and it will be there when you try again. If the editor still will not open, it is a problem at our end rather than anything you did."
    />
  );
}
