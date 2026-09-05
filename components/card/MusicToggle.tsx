"use client";

import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";

/**
 * A guest's control over the card's background music, and never anything else.
 *
 * It starts paused and it stays paused until somebody taps it. That is not
 * caution about autoplay policy — although every mobile browser does block
 * audio until a gesture, and a card that tried would simply fail silently — it
 * is that music starting on its own is the fastest way to get an invitation
 * closed. Somebody opens a link in a quiet room, in an office, next to a
 * sleeping child. The first tap is what makes the sound theirs.
 *
 * The audio element is created here rather than rendered as JSX, so nothing
 * about it survives into the markup: no preload, no fetch, and no <audio> tag
 * that some future change could accidentally give an `autoplay` attribute to.
 */

/** Big enough for a thumb, on a card a guest is holding one handed. */
const BUTTON_SIZE = 44;

export default function MusicToggle({
  musicUrl,
  accent,
  surface,
}: {
  /** Null on every card whose host never pasted a link, which is most of them. */
  musicUrl: string | null;
  accent: string;
  surface: string;
}): ReactElement | null {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /*
    Built in an effect, and rebuilt only when the link itself changes.

    `new Audio()` touches the DOM, so it cannot happen during a render that also
    runs on the server. Keeping it in a ref rather than in state means changing
    tracks does not re-render, and the cleanup below is the only thing that ever
    tears one down.
  */
  useEffect(() => {
    if (musicUrl === null) {
      return;
    }

    const audio = new Audio(musicUrl);
    audio.loop = true;
    /* Nothing is fetched until the guest asks for it. */
    audio.preload = "none";
    audioRef.current = audio;

    /*
      The button follows the element, not the other way round. A track that
      ends, stalls or fails after it started leaves the audio paused, and a
      button still showing "playing" would be lying about what the guest can
      hear.
    */
    const handlePause = (): void => setIsPlaying(false);
    const handlePlay = (): void => setIsPlaying(true);
    const handleEnded = (): void => setIsPlaying(false);
    const handleError = (): void => setIsPlaying(false);

    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);

      /*
        Paused and unsourced, in that order. Leaving the src set keeps the
        browser holding the buffered audio for an element nothing points at any
        more, and on some builds keeps it playing over the page that replaced
        this one.
      */
      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      audioRef.current = null;
      setIsPlaying(false);
    };
  }, [musicUrl]);

  /*
    Music stops when the guest leaves the tab and does not come back on its own.

    Returning to a tab that starts singing again is worse than returning to
    silence: the guest switched away for a reason, and by the time they come
    back the reason may still be true. The button is right there.
  */
  useEffect(() => {
    const handleVisibility = (): void => {
      if (document.visibilityState === "hidden") {
        audioRef.current?.pause();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const handleToggle = useCallback((): void => {
    const audio = audioRef.current;

    if (audio === null) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      return;
    }

    /*
      play() returns a promise that rejects for reasons a guest can do nothing
      about: a browser that wanted a different gesture, a link that 404s, a
      format this device cannot decode. All of them are handled the same way,
      which is to leave the button showing paused and say nothing. An error
      message over somebody's wedding invitation would be worse than silence.
    */
    void audio
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  }, [isPlaying]);

  if (musicUrl === null) {
    return null;
  }

  const label = isPlaying ? "Pause background music" : "Play background music";

  return (
    /*
      A zero height sticky row rather than a fixed element.

      `position: fixed` would pin this to the viewport, which is right on the
      guest's screen and wrong in the editor, where the card lives inside a
      phone frame and a fixed button would float outside it over the form.
      Sticky in a row of no height keeps it in the top right of whatever is
      doing the scrolling, and costs the layout nothing.
    */
    <div
      className="pointer-events-none sticky top-3 z-30 flex h-0 justify-end px-4"
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-label={label}
        aria-pressed={isPlaying}
        title={label}
        className="pointer-events-auto flex items-center justify-center rounded-full backdrop-blur-sm transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-95"
        style={{
          width: BUTTON_SIZE,
          height: BUTTON_SIZE,
          /*
            The card's own surface at three quarters, over a blur. A solid chip
            reads as a foreign object on a dark palette and vanishes on a light
            one; a translucent one takes the colour underneath it either way.
          */
          backgroundColor: `${surface}bf`,
          border: `1px solid ${accent}59`,
          color: accent,
          outlineColor: accent,
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          focusable="false"
        >
          {/* A quaver: stem, flag, and the note head under it. */}
          <path d="M9 18V5l10-2v13" />
          <circle cx="6.5" cy="18" r="2.5" />
          <circle cx="16.5" cy="16" r="2.5" />

          {/* Struck through while it is playing, which is what tapping will do. */}
          {isPlaying ? <path d="M3 21 21 3" /> : null}
        </svg>
      </button>
    </div>
  );
}
