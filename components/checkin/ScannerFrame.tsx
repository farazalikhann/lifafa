"use client";

import { useEffect, useId, useRef, useState, type ReactElement } from "react";
import type { Html5Qrcode } from "html5-qrcode";

/*
  The parts of the Shape Detection API used here. TypeScript's DOM library does
  not declare BarcodeDetector yet, so these are written out rather than pulling
  in a types package for three members.
*/
interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorInstance {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorClass {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

/** How often the native detector looks at a frame. About five times a second is plenty for a pass held still. */
const SCAN_INTERVAL_MS = 200;

/**
 * The same code, seen again within this long, is the same guest still holding
 * up their phone — not a second scan. After it, the pass reads again, and the
 * door is told they are already in.
 */
const REPEAT_COOLDOWN_MS = 5000;

/** HTMLMediaElement.HAVE_CURRENT_DATA: there is a frame to read. */
const HAVE_CURRENT_DATA = 2;

type CameraState =
  | "starting"
  | "scanning"
  | "insecure"
  | "denied"
  | "no-camera"
  | "in-use"
  | "failed";

type CameraProblem = Exclude<CameraState, "starting" | "scanning">;

const PROBLEM: Record<CameraProblem, { title: string; body: string; retry: boolean }> = {
  insecure: {
    title: "The camera needs a secure page",
    body: "Browsers only open the camera on an https:// page. Open this scanner on its https address, or check guests in by name below.",
    retry: false,
  },
  denied: {
    title: "Camera access is blocked",
    body: "Allow the camera for this site in your browser's settings, then tap Try again. The camera also only works on an https:// page. Until then, check guests in by name below.",
    retry: true,
  },
  "no-camera": {
    title: "No camera found",
    body: "This device did not offer a camera. Check guests in by name below.",
    retry: true,
  },
  "in-use": {
    title: "The camera is busy",
    body: "Another app is using it. Close that app, then tap Try again.",
    retry: true,
  },
  failed: {
    title: "The camera could not start",
    body: "Tap Try again, or check guests in by name below.",
    retry: true,
  },
};

/**
 * Which problem a failed camera start was.
 *
 * Read from the error's name and message rather than its type: getUserMedia
 * rejects with a DOMException, and html5-qrcode sometimes rejects with a plain
 * string that only names the DOMException inside it.
 */
function cameraProblem(cause: unknown): CameraProblem {
  const text =
    cause instanceof Error ? `${cause.name} ${cause.message}` : String(cause);

  if (/NotAllowed|Permission|SecurityError/i.test(text)) {
    return "denied";
  }

  if (/NotFound|Overconstrained|not found|no camera/i.test(text)) {
    return "no-camera";
  }

  if (/NotReadable|TrackStart|in use|Could not start/i.test(text)) {
    return "in-use";
  }

  return "failed";
}

function stopTracks(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

async function stopFallback(scanner: Html5Qrcode): Promise<void> {
  try {
    if (scanner.isScanning) {
      await scanner.stop();
    }
  } catch {
    /* Already stopping, or never got as far as starting. */
  }

  try {
    scanner.clear();
  } catch {
    /* Nothing was rendered to clear. */
  }
}

/** Four corner brackets, so the square reads as a camera viewfinder. */
function CornerBrackets(): ReactElement {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      role="presentation"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      className="pointer-events-none absolute inset-0 h-full w-full text-[var(--lifafa-marigold)]"
    >
      <path d="M4 20 V4 H20" />
      <path d="M80 4 H96 V20" />
      <path d="M96 80 V96 H80" />
      <path d="M20 96 H4 V80" />
    </svg>
  );
}

/**
 * The camera, reading passes.
 *
 * TWO ENGINES, ONE CHOSEN AT RUN TIME. BarcodeDetector first: it is built into
 * Chrome on Android — the phone most likely to be at the door — decodes in
 * native code and costs no download. Where it is missing (Safari on iPhone,
 * Firefox, Chrome on Windows) html5-qrcode takes over, and it is imported only
 * then, so a phone with a native detector never downloads it. html5-qrcode
 * drives its own <video>, so each engine gets its own element to draw into.
 *
 * The rear camera is asked for with facingMode "environment". A laptop with
 * only a front camera still gets that one, because the constraint is a
 * preference rather than an exact match.
 *
 * Every decoded string goes to onDecode, which decides whether it is a pass.
 * Two things are filtered here, because they are about the camera rather than
 * the pass: nothing is handed over while the page is still busy with the last
 * scan, and the same code held in front of the lens is not handed over again
 * for REPEAT_COOLDOWN_MS.
 *
 * THE CAMERA IS OFF WHEN THIS IS GONE. Unmounting stops every track and the
 * fallback scanner, so leaving the page — or the page leaving the screen —
 * does not leave a camera light on in somebody's pocket.
 */
export default function ScannerFrame({
  onDecode,
  busy,
}: {
  onDecode: (text: string) => void;
  /** True while the last scan is still being checked in. */
  busy: boolean;
}): ReactElement {
  /* html5-qrcode finds its element by id; useId's colons are stripped to keep it a plain id. */
  const regionId = `pass-scanner-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<CameraState>("starting");
  const [engine, setEngine] = useState<"native" | "fallback" | null>(null);
  /** Bumped by Try again, which is what restarts the camera. */
  const [attempt, setAttempt] = useState(0);

  /*
    Read through refs so that a new callback, or busy flipping on and off after
    every scan, never tears the camera down and starts it again.
  */
  const onDecodeRef = useRef(onDecode);
  const busyRef = useRef(busy);
  const lastRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });

  useEffect(() => {
    onDecodeRef.current = onDecode;
    busyRef.current = busy;
  });

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let timer: number | null = null;
    let fallback: Html5Qrcode | null = null;
    const video = videoRef.current;

    const handle = (text: string): void => {
      if (cancelled || busyRef.current) {
        return;
      }

      const now = Date.now();

      if (
        text === lastRef.current.text &&
        now - lastRef.current.at < REPEAT_COOLDOWN_MS
      ) {
        return;
      }

      lastRef.current = { text, at: now };
      onDecodeRef.current(text);
    };

    const run = async (): Promise<void> => {
      setState("starting");
      setEngine(null);

      /*
        getUserMedia only exists on a secure page — https, or localhost while
        developing. Checked up front so the answer is "use https" rather than a
        permission error that sends someone hunting through settings.
      */
      if (
        !window.isSecureContext ||
        typeof navigator.mediaDevices?.getUserMedia !== "function"
      ) {
        setState("insecure");
        return;
      }

      const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorClass })
        .BarcodeDetector;
      let native = false;

      if (Detector !== undefined) {
        try {
          const formats = await Detector.getSupportedFormats?.();
          native = formats === undefined || formats.includes("qr_code");
        } catch {
          native = false;
        }
      }

      if (cancelled) {
        return;
      }

      if (native && Detector !== undefined && video !== null) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
            audio: false,
          });
        } catch (cause: unknown) {
          if (!cancelled) {
            setState(cameraProblem(cause));
          }
          return;
        }

        if (cancelled) {
          stopTracks(stream);
          return;
        }

        video.srcObject = stream;
        await video.play().catch(() => undefined);

        const detector = new Detector({ formats: ["qr_code"] });
        setEngine("native");
        setState("scanning");

        const tick = async (): Promise<void> => {
          if (cancelled) {
            return;
          }

          if (video.readyState >= HAVE_CURRENT_DATA) {
            try {
              const codes = await detector.detect(video);
              const hit = codes.find((code) => code.rawValue.length > 0);

              if (hit !== undefined) {
                handle(hit.rawValue);
              }
            } catch {
              /* A frame that cannot be read is only the next frame. */
            }
          }

          if (!cancelled) {
            timer = window.setTimeout(() => void tick(), SCAN_INTERVAL_MS);
          }
        };

        void tick();
        return;
      }

      try {
        const library = await import("html5-qrcode");

        if (cancelled) {
          return;
        }

        const scanner = new library.Html5Qrcode(regionId, {
          formatsToSupport: [library.Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        fallback = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 8,
            qrbox: (width: number, height: number) => {
              const side = Math.floor(Math.min(width, height) * 0.72);
              return { width: side, height: side };
            },
          },
          (text: string) => handle(text),
          () => undefined,
        );

        if (cancelled) {
          await stopFallback(scanner);
          return;
        }

        setEngine("fallback");
        setState("scanning");
      } catch (cause: unknown) {
        if (!cancelled) {
          setState(cameraProblem(cause));
        }
      }
    };

    void run();

    return () => {
      cancelled = true;

      if (timer !== null) {
        window.clearTimeout(timer);
      }

      stopTracks(stream);

      if (video !== null) {
        video.srcObject = null;
      }

      if (fallback !== null) {
        void stopFallback(fallback);
      }
    };
  }, [attempt, regionId]);

  const problem =
    state !== "starting" && state !== "scanning" ? PROBLEM[state] : null;

  return (
    <section className="flex flex-col gap-3" aria-label="Pass scanner">
      <div
        data-camera={state}
        data-engine={engine ?? "none"}
        className="relative aspect-square w-full overflow-hidden rounded-3xl border border-[var(--lifafa-hairline)] bg-[var(--lifafa-ink-raised)]"
      >
        <video
          ref={videoRef}
          muted
          playsInline
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover ${
            engine === "native" ? "" : "invisible"
          }`}
        />

        {/*
          html5-qrcode's own stage. Always in the layout rather than hidden,
          because it sizes its video from this box when it starts.
        */}
        <div
          id={regionId}
          aria-hidden="true"
          className="absolute inset-0 [&_video]:h-full! [&_video]:w-full! [&_video]:object-cover"
        />

        <CornerBrackets />

        {state === "starting" ? (
          <p className="absolute inset-0 flex items-center justify-center px-10 text-center text-sm text-[var(--lifafa-muted)]">
            Starting the camera…
          </p>
        ) : null}

        {problem !== null ? (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[var(--lifafa-ink-raised)] px-8 text-center"
          >
            <p className="text-base font-semibold text-[var(--lifafa-cream)]">
              {problem.title}
            </p>
            <p className="text-sm leading-relaxed text-[var(--lifafa-muted)]">
              {problem.body}
            </p>
            {problem.retry ? (
              <button
                type="button"
                onClick={() => setAttempt((count) => count + 1)}
                className="mt-1 min-h-11 rounded-xl border border-[var(--lifafa-hairline)] px-4 text-sm font-medium text-[var(--lifafa-cream)] transition-colors duration-150 hover:border-[var(--lifafa-marigold)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lifafa-marigold)]"
              >
                Try again
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {state === "scanning" ? (
        <p className="text-center text-xs text-[var(--lifafa-muted)]">
          Hold a guest&rsquo;s pass inside the frame. Each scan checks them in
          straight away.
        </p>
      ) : null}
    </section>
  );
}
