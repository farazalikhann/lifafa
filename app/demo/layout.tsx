import type { ReactNode } from "react";
/* The card's own styles: see the head of app/card.css. */
import "@/app/card.css";

/** The demo cards: the styles every card needs, and nothing else. */
export default function DemoLayout({ children }: { children: ReactNode }): ReactNode {
  return children;
}
