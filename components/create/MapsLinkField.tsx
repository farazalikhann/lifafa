"use client";

import { useState, type ReactElement } from "react";
import { parseMapsLink } from "@/lib/cardFormat";

const HELPER = "Paste the venue's Google Maps link for exact directions.";
const ERROR =
  "This is not a Google Maps link. Paste a maps.app.goo.gl, goo.gl/maps or google.com/maps link, or coordinates like 19.1036, 72.8747.";

/**
 * The optional "Google Maps link" under a venue's address, for the main venue
 * and for each function that has one.
 *
 * Checked by parseMapsLink, the same function the guest's card reads it
 * through, so what the editor accepts is exactly what the card will use. The
 * complaint waits until the host leaves the field, so it does not flash up
 * over half a pasted link, and goes the moment the text becomes valid. An
 * invalid value is kept rather than thrown away, so the host can fix it; the
 * card ignores it until then and gives directions from the address.
 */
export default function MapsLinkField({
  id,
  value,
  onChange,
  inputClass,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** The form's own input style, so the field matches the ones above it. */
  inputClass: string;
}): ReactElement {
  const [touched, setTouched] = useState(false);

  const trimmed = value.trim();
  const invalid = trimmed.length > 0 && parseMapsLink(trimmed) === null;
  const showError = invalid && touched;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
      >
        Google Maps link{" "}
        <span className="font-normal text-[var(--lifafa-muted)]">(optional)</span>
      </label>
      <input
        id={id}
        /*
          Text, not url: coordinates need a comma and a space, which a phone's
          URL keyboard may not offer, and a url input refuses them anyway.
        */
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => setTouched(true)}
        placeholder="https://maps.app.goo.gl/…"
        autoComplete="off"
        spellCheck={false}
        aria-invalid={showError}
        aria-describedby={`${id}-hint${showError ? ` ${id}-error` : ""}`}
        className={inputClass}
        style={showError ? { borderColor: "var(--lifafa-rose)" } : undefined}
      />
      <p
        id={`${id}-hint`}
        className="text-xs leading-relaxed text-[var(--lifafa-muted)]"
      >
        {HELPER}
      </p>
      {showError ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs leading-relaxed text-[var(--lifafa-rose)]"
        >
          {ERROR}
        </p>
      ) : null}
    </div>
  );
}
