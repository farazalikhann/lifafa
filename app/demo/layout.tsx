import type { ReactNode } from "react";
/* The card's own styles: see the head of app/card.css. */
import "@/app/card.css";
import LightMotion from "@/components/card/LightMotion";
import StartInChrome from "@/components/browser/StartInChrome";

/** The demo cards: the styles every card needs, and nothing else. */
export default function DemoLayout({ children }: { children: ReactNode }): ReactNode {
  /* A demo is a showcase, not a guest's invitation: on a light phone it runs with fewer pieces in the air. */
  return (
    <>
      <LightMotion />
      {children}
      {/* Instagram's and Facebook's browsers only: "open in Chrome", once per session (shared with /create). */}
      <StartInChrome />
    </>
  );
}
