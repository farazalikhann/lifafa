import type { ReactElement } from "react";

/**
 * A price with its "₹" in the phone's own font. In Inter the sign is in the
 * latin-ext file, 83 kB downloaded for one character; every other character
 * of a price is in the latin file the page already has.
 */
export default function Rupees({ text }: { text: string }): ReactElement {
  if (!text.startsWith("₹")) {
    return <>{text}</>;
  }

  return (
    <>
      <span style={{ fontFamily: "system-ui, sans-serif" }}>₹</span>
      {text.slice(1)}
    </>
  );
}
