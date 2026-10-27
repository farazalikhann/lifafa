import type { ReactElement, ReactNode } from "react";

/** The reply card: drawn in full in the next pass; for now the form on the card's ground. */
export default function DakGharRsvpFrame({ children }: { children: ReactNode }): ReactElement {
  return <div className="mx-auto w-full max-w-[30rem] px-4 py-10">{children}</div>;
}
