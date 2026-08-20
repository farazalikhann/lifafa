"use client";

import type { ReactElement } from "react";
import { useInView } from "@/hooks/useInView";
import { CardFlourish } from "@/components/card/decor/DecorLayer";
import { REVEAL_BASE, lineDelay, resolve, revealClass } from "@/lib/cardFormat";
import type { Theme } from "@/lib/themes";
import type { EventDraft } from "@/types/event";

export default function CoverSection({
  draft,
  theme,
  minHeight,
}: {
  draft: EventDraft;
  theme: Theme;
  minHeight: string;
}): ReactElement {
  const { ref, isInView } = useInView<HTMLElement>();

  const hosts = resolve(draft.hostNames, "Your names");
  const title = resolve(draft.eventTitle, "Event title");

  /*
    Reveal lives on the wrapper, placeholder dimming on the text inside it.
    Nested opacity multiplies, so a placeholder still starts fully hidden —
    putting both on one element would let the inline value win and the line
    would never fade in.
  */
  const reveal = `${REVEAL_BASE} ${revealClass(isInView)}`;

  return (
    <section
      ref={ref}
      className="flex flex-col items-center justify-center px-7 py-16 text-center"
      style={{
        minHeight,
        gap: `calc(1.5rem * var(--card-gap-scale, 1))`,
      }}
    >
      <div className={reveal} style={lineDelay(0)}>
        <p
          className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.015em] text-balance sm:text-[2.25rem]"
          style={{
            opacity: hosts.isPlaceholder ? 0.4 : 1,
            fontFamily: "var(--card-heading)",
            fontWeight: "var(--card-heading-weight)" as unknown as number,
          }}
        >
          {hosts.text}
        </p>
      </div>

      <div className={reveal} style={lineDelay(1)}>
        <p
          className="text-[0.6875rem] tracking-[0.28em] uppercase"
          style={{
            color: theme.textMuted,
            opacity: title.isPlaceholder ? 0.55 : 1,
          }}
        >
          {title.text}
        </p>
      </div>

      <div className={reveal} style={lineDelay(2)}>
        <CardFlourish accent={theme.accent} />
      </div>

      {/* Scroll cue — this is the section that has to teach the gesture. */}
      <div
        className={`mt-6 flex flex-col items-center gap-2 ${reveal}`}
        style={lineDelay(3)}
      >
        <span
          className="text-[0.625rem] tracking-[0.3em] uppercase"
          style={{ color: theme.textMuted }}
        >
          Scroll
        </span>
        <span
          aria-hidden="true"
          className="h-9 w-px animate-[lifafa-cue_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{
            backgroundImage: `linear-gradient(to bottom, ${theme.accent}, transparent)`,
          }}
        />
      </div>
    </section>
  );
}
