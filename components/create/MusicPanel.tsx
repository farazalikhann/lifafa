"use client";

import type { ReactElement } from "react";

/**
 * The link to a track that plays behind the card.
 *
 * Was the sixth group inside StylePanel, and it sits in the Structure tab now,
 * with the sections and the cover: it is another thing the invitation carries,
 * not a typographic choice. The field, its label and its note are unchanged.
 */
export default function MusicPanel({
  musicUrl,
  onMusicUrlChange,
}: {
  /*
    A link the host pastes, never a file they upload. Hosting audio needs
    storage, a size cap and a scanner, and clearing music rights is a question
    about somebody else's copyright that no form field can answer. Both are out
    of scope for this step, which is why the note under the input says plainly
    whose responsibility the link is.
  */
  musicUrl: string | null;
  onMusicUrlChange: (url: string | null) => void;
}): ReactElement {
  return (
    <section className="flex flex-col gap-2.5 rounded-2xl border border-[var(--lifafa-hairline)] px-4 py-4">
      <h2 className="text-[0.6875rem] tracking-[0.2em] text-[var(--lifafa-muted)] uppercase">
        Background music
      </h2>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="musicUrl"
          className="text-[0.8125rem] font-medium text-[var(--lifafa-cream)]"
        >
          Music file URL
        </label>
        <input
          id="musicUrl"
          type="url"
          inputMode="url"
          value={musicUrl ?? ""}
          /*
            An empty field is null, not "". Null is what "no music" means
            everywhere else — the column, the config, the toggle's own guard —
            and storing an empty string would be a second way to say it that
            every reader would then have to know about.
          */
          onChange={(event) => {
            const next = event.target.value.trim();
            onMusicUrlChange(next.length > 0 ? next : null);
          }}
          placeholder="https://example.com/song.mp3"
          autoComplete="off"
          spellCheck={false}
          aria-describedby="musicUrl-hint"
          className={[
            "w-full min-h-11 rounded-xl px-4 py-2.5",
            "border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]",
            "text-[0.9375rem] text-[var(--lifafa-cream)] placeholder:text-[var(--lifafa-muted)]/70",
            "transition-colors duration-150 [color-scheme:dark]",
            "focus:border-[var(--lifafa-marigold)] focus:ring-2 focus:ring-[var(--lifafa-marigold)]/30 focus:outline-none",
          ].join(" ")}
        />
      </div>

      <p id="musicUrl-hint" className="text-xs leading-relaxed text-[var(--lifafa-muted)]">
        Paste a link to an audio file you have the right to use. Guests choose
        whether to play it.
      </p>
    </section>
  );
}
