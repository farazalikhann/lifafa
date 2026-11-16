"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import { useRouter } from "next/navigation";
import {
  prepareCustomMusicUpload,
  removeCustomMusic,
  setCustomMusic,
} from "@/app/admin/events/actions";
import {
  CARD_MUSIC_ACCEPT,
  CARD_MUSIC_BUCKET,
  cardMusicRefusal,
  describeCardMusic,
} from "@/lib/admin/cardMusic";

/**
 * "Custom music" on /admin/events/[id]: the card's song, uploaded by support.
 *
 * Shows what the card plays now, and offers "Upload song" and "Remove custom
 * music". The file goes from this browser straight to Storage on a signed
 * address the server makes behind the admin session, so a song of several
 * megabytes never passes through a Vercel function; the server then checks
 * the file and sets the card's musicUrl, and nothing else about the card. See
 * the note over the three actions in app/admin/events/actions.ts.
 *
 * A wrong file is refused here first, before anything is sent, and again on
 * the server.
 */

const PRIMARY =
  "min-h-10 rounded-md bg-zinc-900 px-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-400";
const SECONDARY =
  "min-h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 disabled:opacity-50";

type Busy = null | "uploading" | "removing";

/** "1763290000000.mp3" → when it was uploaded, in India. */
function uploadedAt(fileName: string): string | null {
  const stamp = Number(/^(\d{13})\./.exec(fileName)?.[1]);

  if (!Number.isFinite(stamp)) {
    return null;
  }

  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(new Date(stamp));
}

export default function CustomMusicPanel({
  eventId,
  musicUrl,
}: {
  eventId: string;
  musicUrl: string | null;
}): ReactElement {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  /*
    What the card plays, as the last action answered it: shown at once,
    rather than when the page's refresh lands. The page's own value takes
    over whenever it changes.
  */
  const [shownUrl, setShownUrl] = useState<string | null>(musicUrl);
  useEffect(() => setShownUrl(musicUrl), [musicUrl]);
  const current = describeCardMusic(shownUrl);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    /* Cleared at once, so choosing the same file again still fires a change. */
    event.target.value = "";

    if (file === undefined || busy !== null) {
      return;
    }

    setError(null);
    setNotice(null);

    const refusal = cardMusicRefusal(file.name, file.size);

    if (refusal !== null) {
      setError(refusal);
      return;
    }

    setBusy("uploading");

    try {
      const prepared = await prepareCustomMusicUpload(eventId, file.name, file.size);

      if (!prepared.ok) {
        setError(prepared.error);
        return;
      }

      /*
        Sent under the type the server named, not the one the browser guessed:
        Chrome calls an .m4a audio/x-m4a, Safari audio/mp4, and some send none.
      */
      const body = new Blob([file], { type: prepared.contentType });
      /* Fetched when a song is chosen, not with the page: only this needs it. */
      const { createClient } = await import("@/lib/supabase/client");
      const { error: uploadError } = await createClient()
        .storage.from(CARD_MUSIC_BUCKET)
        .uploadToSignedUrl(prepared.path, prepared.token, body, {
          contentType: prepared.contentType,
          upsert: false,
        });

      if (uploadError !== null) {
        console.error("[admin] music upload failed:", uploadError);
        setError(
          /size|too large|payload/i.test(uploadError.message)
            ? "That file is too large. The most a song can be is 8 MB."
            : /mime|type/i.test(uploadError.message)
              ? "Only .mp3 and .m4a files can be used."
              : "The upload did not go through. Check the connection and try again.",
        );
        return;
      }

      const saved = await setCustomMusic(eventId, prepared.path);

      if (!saved.ok) {
        setError(saved.error);
        return;
      }

      setShownUrl(saved.musicUrl);
      setNotice(`${file.name} is now this card's music.`);
      router.refresh();
    } catch (cause: unknown) {
      console.error("[admin] could not upload the music:", cause);
      setError("Could not upload the song. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async (): Promise<void> => {
    if (busy !== null) {
      return;
    }

    setBusy("removing");
    setError(null);
    setNotice(null);

    try {
      const result = await removeCustomMusic(eventId);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setShownUrl(null);
      setNotice("The music is off. The card now has none.");
      router.refresh();
    } catch (cause: unknown) {
      console.error("[admin] could not remove the music:", cause);
      setError("Could not remove the music. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-8" aria-labelledby={`${id}-title`}>
      <h2
        id={`${id}-title`}
        className="text-sm font-semibold tracking-wide text-zinc-500 uppercase"
      >
        Custom music
      </h2>

      <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-500">Now playing on this card</p>

        {current.kind === "none" ? (
          <p className="mt-1 text-sm font-medium">No music</p>
        ) : current.kind === "other" ? (
          <p className="mt-1 text-sm font-medium break-words">
            Track: {current.name}{" "}
            <a
              href={current.url}
              target="_blank"
              rel="noreferrer"
              className="font-normal text-blue-700 underline underline-offset-2"
            >
              open
            </a>
          </p>
        ) : (
          <div className="mt-1">
            <p className="text-sm font-medium break-words">
              Custom file: <code className="text-xs">{current.fileName}</code>
              {uploadedAt(current.fileName) === null ? null : (
                <span className="font-normal text-zinc-500">
                  {" "}
                  · uploaded {uploadedAt(current.fileName)}
                </span>
              )}
            </p>
            {/* Nothing is fetched until it is played. */}
            <audio
              key={current.url}
              controls
              preload="none"
              src={current.url}
              className="mt-2 h-10 w-full max-w-md"
            >
              <a href={current.url}>Listen</a>
            </audio>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            ref={input}
            id={`${id}-file`}
            type="file"
            accept={CARD_MUSIC_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            onChange={(event) => void handleFile(event)}
            aria-describedby={`${id}-note`}
          />
          <button
            type="button"
            className={PRIMARY}
            disabled={busy !== null}
            aria-busy={busy === "uploading"}
            onClick={() => input.current?.click()}
          >
            {busy === "uploading" ? "Uploading…" : "Upload song"}
          </button>
          {current.kind === "custom" ? (
            <button
              type="button"
              className={SECONDARY}
              disabled={busy !== null}
              aria-busy={busy === "removing"}
              onClick={() => void handleRemove()}
            >
              {busy === "removing" ? "Removing…" : "Remove custom music"}
            </button>
          ) : null}
        </div>

        <p id={`${id}-note`} className="mt-3 text-xs text-zinc-500">
          .mp3 or .m4a, at most 8 MB. It replaces this card&apos;s music and
          changes nothing else: guests hear it after they tap the cover, and
          the music button pauses it. If the host later picks a track in
          Customize, theirs replaces this one.
        </p>

        {error !== null ? (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {notice !== null && error === null ? (
          <p role="status" className="mt-3 text-sm font-medium text-green-700">
            {notice}
          </p>
        ) : null}
      </div>
    </section>
  );
}
