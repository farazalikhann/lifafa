"use client";

import Link from "next/link";
import { useInView } from "@/hooks/useInView";

export default function CallToAction() {
  const { ref, isInView } = useInView<HTMLElement>();

  return (
    <section
      ref={ref}
      className={[
        "flex min-h-[70svh] flex-col items-center justify-center px-6 py-20 text-center",
        "transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none",
        isInView ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0",
      ].join(" ")}
    >
      <h2 className="max-w-[16ch] text-balance font-[family-name:var(--font-display)] text-[2.25rem] leading-[1.15] font-semibold tracking-[-0.02em] text-[var(--lifafa-cream)] sm:max-w-[20ch] sm:text-5xl">
        Your guest list, finally settled.
      </h2>

      <p className="mt-5 max-w-[34ch] text-balance text-base leading-relaxed text-[var(--lifafa-muted)] sm:max-w-[46ch] sm:text-lg">
        Create your invitation today and start collecting replies in minutes.
      </p>

      <Link
        href="/create"
        className={[
          "mt-10 inline-flex items-center justify-center rounded-full",
          "bg-[var(--lifafa-marigold)] px-9 py-4 text-base font-semibold text-[var(--lifafa-ink)] sm:text-lg",
          "shadow-[0_10px_30px_-12px_rgba(232,163,61,0.55)]",
          "transition-[transform,box-shadow] duration-200 ease-out",
          "hover:-translate-y-0.5 hover:shadow-[0_20px_44px_-14px_rgba(232,163,61,0.75)]",
          "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lifafa-marigold)]",
          "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        ].join(" ")}
      >
        Create your invitation
      </Link>

      <p className="mt-6 text-sm text-[var(--lifafa-muted)]">
        One event. One payment. No subscription.
      </p>
    </section>
  );
}
