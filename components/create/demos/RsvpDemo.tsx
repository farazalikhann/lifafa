import type { ReactElement } from "react";

/**
 * One guest's answer turning into the host's headcount.
 *
 * The two halves are the two places this feature lives and the reason a host
 * cannot see it from the editor: the reply form is at the end of the guest's
 * card, and the number is on a dashboard they have not opened yet. The dot
 * crossing between them is the only invented part, and it is there because the
 * jump from 12 to 15 means nothing without something joining the two.
 *
 * 12 to 15, not 12 to 13, because the arithmetic is the thing hosts get wrong:
 * an accepted reply counts the guest *and* the people they are bringing.
 *
 * Decorative; see FeatureHelp, which marks it.
 */
export default function RsvpDemo(): ReactElement {
  return (
    <div className="flex h-full w-full items-center gap-2 px-4 py-4">
      {/* The end of the guest's card. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-2.5 py-2.5">
        <span className="text-[0.5625rem] tracking-[0.16em] text-[var(--lifafa-muted)] uppercase">
          Can you come?
        </span>

        <div className="flex gap-1.5">
          {/*
            The ring is a separate layer over the pill rather than a colour that
            changes, because a colour change is not a transform or an opacity
            and this demo does not animate anything else.
          */}
          <span className="relative rounded-full border border-[var(--lifafa-hairline)] px-2 py-1 text-[0.625rem] font-medium text-[var(--lifafa-cream)]">
            Coming
            <span className="lifafa-demo-pick absolute -inset-px rounded-full bg-[var(--lifafa-marigold)]/20 ring-2 ring-[var(--lifafa-marigold)]" />
          </span>
          <span className="rounded-full border border-[var(--lifafa-hairline)] px-2 py-1 text-[0.625rem] text-[var(--lifafa-muted)]">
            Can’t
          </span>
        </div>

        <span className="text-[0.625rem] text-[var(--lifafa-muted)]">
          Bringing <span className="text-[var(--lifafa-cream)]">2</span>
        </span>
      </div>

      {/* The reply on its way over, on a track the width of the gap. */}
      <span className="relative h-2 w-6 shrink-0">
        <span className="lifafa-demo-send absolute inset-0 flex items-center">
          <span className="size-2 rounded-full bg-[var(--lifafa-marigold)]" />
        </span>
      </span>

      {/* The host's dashboard. */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 rounded-lg border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)] px-2.5 py-2.5">
        <span className="text-[0.5625rem] tracking-[0.16em] text-[var(--lifafa-muted)] uppercase">
          Headcount
        </span>

        {/*
          Both numbers occupy the same box, one in flow and one stacked on it,
          so the tile keeps its height while they trade places. Animating the
          height instead would reflow the whole popover thirty times a second.
        */}
        <span className="relative block h-7">
          <span className="lifafa-demo-count-before absolute inset-0 font-[family-name:var(--font-display)] text-[1.5rem] leading-7 font-semibold tabular-nums text-[var(--lifafa-cream)]">
            12
          </span>
          <span className="lifafa-demo-count-after absolute inset-0 font-[family-name:var(--font-display)] text-[1.5rem] leading-7 font-semibold tabular-nums text-[var(--lifafa-marigold)]">
            15
          </span>
        </span>

        <span className="text-[0.625rem] text-[var(--lifafa-muted)]">
          people expected
        </span>
      </div>
    </div>
  );
}
