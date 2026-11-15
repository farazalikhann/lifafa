"use client";

import { useEffect } from "react";
import { clarityEvent } from "@/lib/clarity";
import { craftingArrived } from "@/lib/crafting";

/**
 * On the payment page of a card just saved: tells the crafting screen the
 * page is here under it, so it can finish and go (lib/crafting.ts), and
 * Clarity pay_page_shown. Renders nothing.
 */
export default function PayPageShown({ eventId }: { eventId: string }): null {
  useEffect(() => {
    craftingArrived(eventId);
    clarityEvent("pay_page_shown");
  }, [eventId]);

  return null;
}
