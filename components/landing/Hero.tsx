/**
 * Hero — first viewport. Pure CSS entrance so it stays a server component and
 * animates on first paint rather than waiting for hydration.
 */
export default function Hero() {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      {/* Warm glow behind the wordmark — keeps the ink from reading as flat black. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_50%_at_50%_38%,rgba(232,163,61,0.16),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(196,86,107,0.12),transparent_70%)]"
      />

      <h1 className="animate-[lifafa-rise_800ms_ease-out_both] font-[family-name:var(--font-display)] text-[clamp(3.25rem,16vw,7rem)] leading-[0.95] font-semibold tracking-[-0.03em] text-[var(--lifafa-marigold)] motion-reduce:animate-none">
        Lifafa
      </h1>

      <p className="mt-8 max-w-[22ch] animate-[lifafa-rise_800ms_ease-out_both] text-balance text-[1.0625rem] leading-relaxed text-[var(--lifafa-cream)] [animation-delay:180ms] sm:max-w-[34ch] sm:text-xl motion-reduce:animate-none">
        Beautiful digital invitations for every Indian celebration.
      </p>
      <p className="mt-3 max-w-[26ch] animate-[lifafa-rise_800ms_ease-out_both] text-balance text-[1.0625rem] leading-relaxed text-[var(--lifafa-muted)] [animation-delay:340ms] sm:max-w-[38ch] sm:text-xl motion-reduce:animate-none">
        Know exactly how many guests are coming, long before the day arrives.
      </p>

      {/* Scroll cue */}
      <div className="absolute inset-x-0 bottom-10 flex animate-[lifafa-rise_800ms_ease-out_both] flex-col items-center gap-3 [animation-delay:640ms] motion-reduce:animate-none">
        <span className="text-[0.6875rem] tracking-[0.32em] text-[var(--lifafa-muted)] uppercase">
          Scroll
        </span>
        <span
          aria-hidden="true"
          className="h-12 w-px animate-[lifafa-cue_2.4s_ease-in-out_infinite] bg-gradient-to-b from-[var(--lifafa-marigold)] to-transparent motion-reduce:animate-none"
        />
      </div>
    </section>
  );
}
