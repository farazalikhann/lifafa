"use client";

import { useEffect, useId, useRef, type ReactElement, type ReactNode } from "react";
import { useLinkStatus } from "next/link";
import BusyLabel from "@/components/network/BusyLabel";
import { SLOW_LOAD_MS, clearWaiting, reportWaiting } from "@/lib/loadNotice";

/**
 * A link's label, which becomes a spinner and "Opening…" the moment the link
 * is tapped, so the tap is answered before the next page (or its skeleton,
 * app/create/loading.tsx) has come down a slow connection. Same width either
 * way (BusyLabel), so nothing moves.
 *
 * Still waiting after SLOW_LOAD_MS, the network notice says the internet
 * seems slow, with "Try again", which loads the page the link leads to
 * directly (lib/loadNotice.ts).
 *
 * Goes inside the <Link>: useLinkStatus reads the link it is in.
 */
export default function LinkPending({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const { pending } = useLinkStatus();
  const id = `link-${useId()}`;
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!pending) {
      return;
    }

    const timer = window.setTimeout(() => {
      const href = ref.current?.closest("a")?.href;
      reportWaiting(id, {
        kind: "slow",
        retry: () => (href === undefined ? window.location.reload() : window.location.assign(href)),
      });
    }, SLOW_LOAD_MS);

    return () => {
      window.clearTimeout(timer);
      clearWaiting(id);
    };
  }, [pending, id]);

  return (
    <span ref={ref} className="contents" data-own-pending="">
      <BusyLabel busy={pending}>{children}</BusyLabel>
    </span>
  );
}
