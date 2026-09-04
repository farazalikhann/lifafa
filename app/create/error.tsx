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
 * and loses the draft held in its state. Saying the card is gone is better than
 * a cheerful "try again" that quietly hands back an empty form.
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
      description="Something went wrong while opening your card, so anything you had started is not here. Try again — and if the editor still will not open, it is a problem at our end rather than anything you did."
    />
  );
}
