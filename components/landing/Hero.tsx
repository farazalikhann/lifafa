import Link from "next/link";

/**
 * Hero — first viewport. Pure CSS entrance so it stays a server component and
 * animates on first paint rather than waiting for hydration.
 */
export default function Hero() {
  return (
    /*
      No overflow-hidden. The rose bloom below is meant to hang past the bottom
      edge and carry its colour into the next section, and clipping it there is
      exactly the hard line this used to draw. `overflow-x-clip` is the one
      clip allowed: the glow behind the wordmark is wider than a phone and must
      not widen the page, and `clip` on one axis leaves the other visible where
      `hidden` would not.
    */
    /*
      More padding below than above: the scroll cue is pinned 2.5rem off the
      bottom and stands about 4.5rem tall, and on a short phone the call to
      action is pushed down far enough to reach it. pb-32 keeps the two apart
      whenever the content outgrows the viewport and the section has to grow.
    */
    <section className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-x-clip px-6 pt-24 pb-32 text-center">
      {/*
        Rose bloom over the seam between the hero and the section below it.

        It used to be a third of a viewport tall, pinned to the hero's bottom
        edge, with the gradient centred on that same edge — so the colour was at
        full strength exactly where the section stopped and the clip cut it off
        dead. On a phone whose browser chrome has slid away the visible viewport
        is taller than the 100svh the hero is sized to, which put that cut on
        screen as a bright band ending in a hard horizontal line.

        Straddling the seam instead fixes it at the cause: the bloom is centred
        on the fold and fades out in both directions, so the colour crosses into
        the showcase and thins to nothing on its own. Nothing to clip, and no
        edge left to see.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -bottom-[30svh] -z-10 h-[60svh] bg-[radial-gradient(60%_52%_at_50%_46%,rgba(196,86,107,0.13),transparent_72%)]"
      />

      <div className="relative">
        {/*
          The glow, and it is a shape rather than a wash: one large circle
          centred on the wordmark, marigold at its heart and rose towards its
          rim, fading to nothing well inside its own edge. The page around it
          stays ink. The earlier version tinted the whole hero from corner to
          corner, which read as a dim screen rather than as light.

          On the wordmark's own wrapper, so it stays centred on the word
          whatever the copy below does to the hero's height.
        */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-1/2 -z-10 aspect-square w-[min(140vw,56rem)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(232,163,61,0.2),rgba(232,163,61,0.08)_38%,rgba(196,86,107,0.07)_62%,transparent)]"
        />

        <h1 className="animate-[lifafa-rise_800ms_ease-out_both] font-[family-name:var(--font-display)] text-[clamp(3.25rem,16vw,7rem)] leading-[0.95] font-semibold tracking-[-0.03em] text-[var(--lifafa-marigold)] motion-reduce:animate-none">
          Lifafa
        </h1>
      </div>

      {/*
        One step brighter each. The first line takes a heavier weight rather
        than a lighter colour, since it was already cream; the second moves up
        from muted, which against the hero read as a footnote.
      */}
      <p className="mt-8 max-w-[22ch] animate-[lifafa-rise_800ms_ease-out_both] text-balance text-[1.0625rem] leading-relaxed font-medium text-[var(--lifafa-cream)] [animation-delay:180ms] sm:max-w-[34ch] sm:text-xl motion-reduce:animate-none">
        Beautiful digital invitations for every Indian celebration.
      </p>
      <p className="mt-3 max-w-[26ch] animate-[lifafa-rise_800ms_ease-out_both] text-balance text-[1.0625rem] leading-relaxed text-[var(--lifafa-cream-soft)] [animation-delay:340ms] sm:max-w-[38ch] sm:text-xl motion-reduce:animate-none">
        Know exactly how many guests are coming, long before the day arrives.
      </p>

      {/*
        The way in, on the first screen.

        The only link to the editor used to sit at the foot of the page, under
        five full-screen story panels and the pricing card — a visitor who had
        already decided had to scroll seven screens to find where to start.
        Same pill as the closing call to action, so the two read as one control.
      */}
      <Link
        href="/create"
        className="mt-10 inline-flex min-h-12 animate-[lifafa-rise_800ms_ease-out_both] items-center justify-center rounded-full bg-[var(--lifafa-marigold)] px-8 text-base font-semibold text-[var(--lifafa-ink)] shadow-[0_10px_30px_-12px_rgba(232,163,61,0.55)] transition-[transform,box-shadow] duration-200 ease-out [animation-delay:480ms] hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-14px_rgba(232,163,61,0.75)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)] motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      >
        Create your invitation
      </Link>

      {/* Scroll cue */}
      <div className="absolute inset-x-0 bottom-10 flex animate-[lifafa-rise_800ms_ease-out_both] flex-col items-center gap-3 [animation-delay:640ms] motion-reduce:animate-none">
        <span className="text-[0.6875rem] tracking-[0.32em] text-[var(--lifafa-muted)] uppercase">
          Scroll
        </span>
        <span
          aria-hidden="true"
          className="h-12 w-px animate-[lifafa-cue_2.4s_ease-in-out_infinite] bg-gradient-to-b from-[var(--lifafa-marigold)] via-[var(--lifafa-rose)] to-transparent motion-reduce:animate-none"
        />
      </div>
    </section>
  );
}
