"use client";

import { useEffect } from "react";
import { reportSaveArrival } from "@/lib/saveTiming";

/** On the saved card's page: finishes the "Save my card" clock once the card is drawn (lib/saveTiming.ts). */
export default function SaveTimingReport({ eventId }: { eventId: string }): null {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => reportSaveArrival(eventId));
    return () => window.cancelAnimationFrame(frame);
  }, [eventId]);

  return null;
}
