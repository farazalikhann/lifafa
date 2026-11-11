"use client";

import { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { inAppBrowser } from "@/lib/inAppBrowser";

/**
 * How much a card may move on this page, beyond what the guest's own
 * reduced-motion setting already decides.
 *
 * THREE HOLDS, none of which reaches a guest's invitation (/i/...):
 *
 * - A STILL CARD (StillCard: the small preview on /create and the card on
 *   /login) is a picture, never a show. Its floating layers start still and
 *   its CSS loops are held, through MotionStillContext below.
 * - TYPING in the editor holds the floating layers until the typing stops
 *   (holdForTyping), so every key goes to the form and not to the air.
 * - A LIGHT PHONE (little memory, few cores) or an in-app browser (Instagram,
 *   Facebook) gets the "subtle" number of pieces on the editor's preview and
 *   the demos, where the page turns it on (LightMotion). The card keeps its
 *   look: fewer petals and butterflies, never none.
 */

/** True inside a card drawn as a still picture. */
export const MotionStillContext = createContext(false);

export function useMotionStill(): boolean {
  return useContext(MotionStillContext);
}

let light = false;
let typing = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeMotion(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Whether the floating layers are held for typing right now. */
export function motionHeld(): boolean {
  return typing;
}

/** A phone that struggles with a lot on screen at once, or an in-app browser. */
export function lightDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const memory = nav.deviceMemory;
  const cores = nav.hardwareConcurrency;

  return (
    (typeof memory === "number" && memory <= 4) ||
    (typeof cores === "number" && cores > 0 && cores <= 4) ||
    inAppBrowser(nav.userAgent) !== null
  );
}

/** Whether this page runs the cards light. False on the server and while hydrating. */
export function useLightMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => light,
    () => false,
  );
}

/** Turns light motion on for as long as the calling component is mounted, on a light device. */
export function useLightMotionHere(): void {
  useEffect(() => {
    if (!lightDevice()) {
      return;
    }

    light = true;
    emit();

    return () => {
      light = false;
      emit();
    };
  }, []);
}

/** How long after the last key the floating layers start again. */
const TYPING_REST_MS = 1200;

/**
 * Holds the floating layers while the visitor types in `root`, and lets them
 * go TYPING_REST_MS after the last key. Returns the cleanup.
 */
export function holdForTyping(root: Document | HTMLElement): () => void {
  let timer = 0;

  const onInput = (event: Event): void => {
    const target = event.target;

    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
      return;
    }

    window.clearTimeout(timer);

    if (!typing) {
      typing = true;
      emit();
    }

    timer = window.setTimeout(() => {
      typing = false;
      emit();
    }, TYPING_REST_MS);
  };

  root.addEventListener("input", onInput, true);

  return () => {
    root.removeEventListener("input", onInput, true);
    window.clearTimeout(timer);

    if (typing) {
      typing = false;
      emit();
    }
  };
}
