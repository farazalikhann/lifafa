"use client";

import { useEffect, useRef, useState, type ComponentType, type ReactElement } from "react";
import type { CardConfig } from "@/types/card";
import type { EventDraft } from "@/types/event";

type StillModule = ComponentType<{ draft: EventDraft; config: CardConfig; height: number }>;

/**
 * The saved card, small and still, on its payment page: the same picture the
 * sign-in page shows (components/auth/SavedCardStill.tsx). The design's tiny
 * gallery picture holds its place from the first paint, and the card's own
 * code, the heaviest thing here, is fetched once the page is idle, so the Pay
 * button is ready first.
 */
export default function PayCardPreview({
  draft,
  config,
  placeholder,
  label,
}: {
  draft: EventDraft;
  config: CardConfig;
  /** The design's gallery picture, a tiny inline image (lib/loginPlaceholders.ts), or null. */
  placeholder: string | null;
  /** What the picture shows, for a screen reader. */
  label: string;
}): ReactElement {
  const [Still, setStill] = useState<StillModule | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    let live = true;
    const load = (): void => {
      void import("@/components/auth/SavedCardStill").then(
        (module) => live && setStill(() => module.default),
        () => undefined,
      );
    };
    const idle = typeof window.requestIdleCallback === "function";
    const handle = idle ? window.requestIdleCallback(load, { timeout: 1500 }) : window.setTimeout(load, 300);

    return () => {
      live = false;

      if (idle) {
        window.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle);
      }
    };
  }, []);

  useEffect(() => {
    if (Still !== null && boxRef.current !== null) {
      setHeight(boxRef.current.clientHeight);
    }
  }, [Still]);

  return (
    <div
      ref={boxRef}
      role="img"
      aria-label={label}
      data-pay-card=""
      data-clarity-mask="true"
      className="lifafa-card-scope relative mx-auto aspect-[390/720] h-[min(260px,32svh)] shrink-0 overflow-hidden rounded-[1.125rem] border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] shadow-[0_20px_40px_-24px_rgba(30,27,24,0.5)]"
    >
      {placeholder !== null ? (
        // eslint-disable-next-line @next/next/no-img-element -- inline and tiny: next/image would add a request.
        <img
          src={placeholder}
          alt=""
          aria-hidden="true"
          decoding="sync"
          className="absolute inset-0 size-full scale-105 object-cover blur-[2px]"
        />
      ) : null}
      {Still !== null && height > 0 ? <Still draft={draft} config={config} height={height} /> : null}
    </div>
  );
}
