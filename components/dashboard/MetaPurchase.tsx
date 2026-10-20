"use client";

import { useEffect } from "react";
import { purchase } from "@/lib/metaPixel";

/**
 * The ads' Purchase, on the dashboard of an invitation the server has just
 * confirmed paid. Drawn only with a payment lib/db/confirmedPayment.ts found;
 * lib/metaPixel.ts sends it once per payment id. Renders nothing.
 */
export default function MetaPurchase({
  paymentId,
  amountPaise,
  templateId,
}: {
  paymentId: string;
  amountPaise: number;
  templateId: string;
}): null {
  useEffect(() => {
    purchase({ paymentId, amountPaise, templateId });
  }, [paymentId, amountPaise, templateId]);

  return null;
}
