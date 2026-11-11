"use client";

import { useLightMotionHere } from "@/lib/motionBudget";

/** Runs this page's cards light on a light phone or an in-app browser; see lib/motionBudget.ts. */
export default function LightMotion(): null {
  useLightMotionHere();
  return null;
}
