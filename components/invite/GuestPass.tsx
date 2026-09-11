"use client";

import { toCanvas } from "qrcode";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import type { Theme } from "@/lib/themes";

/**
 * The code's own dark and light, fixed whatever the card's colours.
 *
 * Not the theme's. A scanner needs dark modules on a light ground at a strong
 * contrast, and a card in rose on blush, or gold on ink, would hand it neither.
 * The block around the code is the card's; the code itself is always ink on
 * white.
 */
const QR_DARK = "#111111";
const QR_LIGHT = "#FFFFFF";
/** The event line on the saved picture: quieter than the name, still dark. */
const PASS_MUTED = "#555555";

/** What the saved picture is called when it is downloaded rather than shared. */
const PASS_FILENAME = "lifafa-pass.png";

/** The code on the page, in CSS pixels. */
const QR_SIZE = 216;

/** The saved picture, in image pixels. */
const PASS_WIDTH = 720;
const PASS_QR = 560;
const PASS_PAD = 64;
const NAME_SIZE = 36;
const EVENT_SIZE = 26;

/**
 * Enough error correction to survive a cracked screen or a thumb over a corner,
 * without packing the modules so tightly that a cheap phone camera struggles.
 */
const ERROR_CORRECTION = "M";

/** Where the door scanner will look this guest up. */
function checkinUrl(origin: string, token: string): string {
  return `${origin}/checkin/${encodeURIComponent(token)}`;
}

/** Up to `maxLines` lines of `text` that fit `maxWidth` in the context's current font. */
function wrapLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const fits = (line: string): boolean =>
    context.measureText(line).width <= maxWidth;

  const ellipsize = (line: string): string => {
    let cut = line;
    while (cut.length > 1 && !fits(`${cut}…`)) {
      cut = cut.slice(0, -1);
    }
    return `${cut.trimEnd()}…`;
  };

  const lines: string[] = [];
  let current = "";

  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    const next = current.length > 0 ? `${current} ${word}` : word;

    if (current.length === 0 || fits(next)) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current.length > 0) {
    lines.push(current);
  }

  const kept = lines.slice(0, maxLines);

  if (lines.length > maxLines) {
    kept[maxLines - 1] = ellipsize(
      `${kept[maxLines - 1]} ${lines.slice(maxLines).join(" ")}`,
    );
  }

  /* A single word wider than the picture is cut rather than allowed to run off it. */
  return kept.map((line) => (fits(line) ? line : ellipsize(line)));
}

/**
 * The picture a guest keeps: the code on a white plate, with their name and
 * the occasion under it, so it still means something in a gallery of photos
 * a week later. The card's accent appears once, as a band along the top, and
 * nowhere near the code.
 */
async function buildPassImage({
  url,
  guestName,
  eventName,
  accent,
  fontFamily,
}: {
  url: string;
  guestName: string;
  eventName: string;
  accent: string;
  fontFamily: string;
}): Promise<Blob> {
  /* The card's webfont, if it is still arriving, rather than a fallback. */
  await document.fonts?.ready;

  const code = document.createElement("canvas");
  await toCanvas(code, url, {
    errorCorrectionLevel: ERROR_CORRECTION,
    margin: 2,
    width: PASS_QR,
    color: { dark: QR_DARK, light: QR_LIGHT },
  });

  const pass = document.createElement("canvas");
  const context = pass.getContext("2d");

  if (context === null) {
    throw new Error("no 2d context");
  }

  const nameFont = `600 ${NAME_SIZE}px ${fontFamily}`;
  const eventFont = `400 ${EVENT_SIZE}px ${fontFamily}`;
  const textWidth = PASS_WIDTH - PASS_PAD * 2;

  /* Measured before the canvas is sized: the height depends on how the text wraps. */
  context.font = nameFont;
  const nameLines = wrapLines(context, guestName, textWidth, 2);
  context.font = eventFont;
  const eventLines = wrapLines(context, eventName, textWidth, 2);

  const nameLeading = Math.round(NAME_SIZE * 1.3);
  const eventLeading = Math.round(EVENT_SIZE * 1.4);
  const textTop = PASS_PAD + PASS_QR + 36;

  /* Sizing a canvas resets its context, so every setting below comes after this. */
  pass.width = PASS_WIDTH;
  pass.height =
    textTop +
    nameLines.length * nameLeading +
    12 +
    eventLines.length * eventLeading +
    PASS_PAD;

  context.fillStyle = QR_LIGHT;
  context.fillRect(0, 0, pass.width, pass.height);
  context.fillStyle = accent;
  context.fillRect(0, 0, pass.width, 10);

  context.drawImage(code, (PASS_WIDTH - PASS_QR) / 2, PASS_PAD);

  context.textAlign = "center";
  context.textBaseline = "top";

  let y = textTop;

  context.font = nameFont;
  context.fillStyle = QR_DARK;
  for (const line of nameLines) {
    context.fillText(line, PASS_WIDTH / 2, y);
    y += nameLeading;
  }

  y += 12;
  context.font = eventFont;
  context.fillStyle = PASS_MUTED;
  for (const line of eventLines) {
    context.fillText(line, PASS_WIDTH / 2, y);
    y += eventLeading;
  }

  return new Promise<Blob>((resolve, reject) => {
    pass.toBlob(
      (blob) => (blob === null ? reject(new Error("toBlob gave nothing")) : resolve(blob)),
      "image/png",
    );
  });
}

/** The plain fallback: a link with a filename, clicked on the guest's behalf. */
function download(blob: Blob): void {
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = PASS_FILENAME;
  document.body.append(link);
  link.click();
  link.remove();
  /* Revoked later rather than at once: some browsers read the URL after click() returns. */
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/**
 * A guest's check-in pass: their own QR code, and a way to keep it.
 *
 * Only ever mounted after a reply has come back accepted, on an event whose
 * host switched check-in on, with a token the database issued — InviteExperience
 * checks all three and renders nothing at all otherwise. So everything in here
 * runs in the browser, after a tap, and there is no server render for the
 * origin or the canvas to disagree with.
 *
 * THE ORIGIN IS THE PAGE'S OWN. window.location.origin is the address this guest
 * actually opened, so a pass made on a preview deploy points at that deploy and
 * one made on the live site points at the live site. lib/siteUrl.ts is a fixed
 * domain, which is right for a link printed on a card and wrong for this.
 *
 * THE PICTURE IS BUILT BEFORE THE TAP. Safari only lets navigator.share run
 * close to the gesture that asked for it, and a share that first waits on font
 * loading and PNG encoding can arrive too late and be refused. So the image is
 * made as soon as the code is drawn, and the button shares what is ready.
 */
export default function GuestPass({
  token,
  guestName,
  eventName,
  theme,
}: {
  token: string;
  guestName: string;
  eventName: string;
  theme: Theme;
}): ReactElement {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** The saved picture, once it has been made. */
  const passRef = useRef<Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  /** Everything the saved picture is made of, read at the moment it is made. */
  const makePass = useCallback((): Promise<Blob> => {
    const root = rootRef.current;

    return buildPassImage({
      url: checkinUrl(window.location.origin, token),
      guestName: guestName.trim(),
      eventName,
      accent: theme.accent,
      /* The resolved family, not theme.fontFamily: a canvas cannot read var(). */
      fontFamily:
        root !== null ? getComputedStyle(root).fontFamily : "system-ui, sans-serif",
    });
  }, [token, guestName, eventName, theme.accent]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas === null) {
      return;
    }

    let cancelled = false;
    passRef.current = null;

    /*
      Drawn at the screen's density so the modules stay sharp, then shown at
      QR_SIZE. toCanvas writes its own inline size, so that is put back after.
    */
    const density = Math.min(3, Math.max(1, Math.round(window.devicePixelRatio || 1)));

    toCanvas(canvas, checkinUrl(window.location.origin, token), {
      errorCorrectionLevel: ERROR_CORRECTION,
      margin: 2,
      width: QR_SIZE * density,
      color: { dark: QR_DARK, light: QR_LIGHT },
    })
      .then(() => {
        canvas.style.width = `${QR_SIZE}px`;
        canvas.style.height = `${QR_SIZE}px`;
        return makePass();
      })
      .then((blob) => {
        if (!cancelled) {
          passRef.current = blob;
        }
      })
      .catch((cause: unknown) => {
        /* The tap tries again from scratch, so a failure here is only logged. */
        console.error("[pass] could not draw the pass:", cause);
      });

    return () => {
      cancelled = true;
    };
  }, [token, makePass]);

  const handleSave = async (): Promise<void> => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const blob = passRef.current ?? (await makePass());
      const file = new File([blob], PASS_FILENAME, { type: "image/png" });

      if (
        typeof navigator.canShare === "function" &&
        navigator.canShare({ files: [file] })
      ) {
        try {
          await navigator.share({ files: [file], title: `${eventName} — pass` });
          return;
        } catch (cause: unknown) {
          /* The guest closed the share sheet. That is an answer, not a failure. */
          if (cause instanceof DOMException && cause.name === "AbortError") {
            return;
          }
          /* Anything else — usually a refused share — falls through to the download. */
        }
      }

      download(blob);
    } catch (cause: unknown) {
      console.error("[pass] could not save the pass:", cause);
      setSaveError("Could not save your pass. A screenshot of this code works just as well.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={rootRef}
      /*
        The card's colours, set inline the way RsvpPanel sets them, so nothing
        of the editor's dark styling can reach a guest-facing block.
      */
      className="mt-2 flex w-full flex-col items-center gap-4 rounded-2xl border px-5 py-6"
      style={{
        backgroundColor: theme.surface,
        borderColor: `${theme.textMuted}55`,
        color: theme.textPrimary,
      }}
    >
      <div className="flex flex-col gap-1">
        <h3
          className="font-[family-name:var(--font-display)] text-lg font-semibold"
          style={{ color: theme.textPrimary }}
        >
          Your entry pass
        </h3>
        <p className="text-sm" style={{ color: theme.textMuted }}>
          Show this code at the entrance on the day.
        </p>
      </div>

      {/* The light plate the code sits on, whatever the card's own ground is. */}
      <div className="rounded-xl p-3" style={{ backgroundColor: QR_LIGHT }}>
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Check-in code for ${guestName.trim()}`}
          width={QR_SIZE}
          height={QR_SIZE}
          className="block"
          style={{ width: QR_SIZE, height: QR_SIZE, imageRendering: "pixelated" }}
        />
      </div>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={isSaving}
        aria-busy={isSaving}
        className="min-h-[52px] w-full rounded-xl px-4 text-base font-semibold transition-transform duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 enabled:hover:-translate-y-px disabled:cursor-wait"
        style={{
          backgroundColor: theme.accent,
          border: "1px solid transparent",
          color: theme.background,
          outlineColor: theme.accent,
        }}
      >
        Save my pass
      </button>

      {/* Inline and re-readable, never an alert box — the same as a failed reply. */}
      {saveError !== null ? (
        <p
          role="alert"
          className="w-full rounded-xl px-4 py-3 text-center text-sm"
          style={{
            backgroundColor: `${theme.accent}1a`,
            color: theme.textPrimary,
          }}
        >
          {saveError}
        </p>
      ) : null}
    </div>
  );
}
