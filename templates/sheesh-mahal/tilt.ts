/**
 * The phone's tilt, for the mirrors' glints: one source for the cover and
 * page 2, which each listen only while they are on the screen.
 *
 * ASKED FOR ONCE, INSIDE THE COVER'S TAP. An iPhone gives a page the phone's
 * orientation only after asking its owner, and lets a page ask only from
 * inside a tap: so `askTilt` is the cover's `onTap`, and nothing else ever
 * shows a prompt (the first listener's quiet try, `probe`, cannot). Chrome
 * answers that try at once, and a browser with no such question gives the
 * tilt, where it has a sensor, without asking.
 *
 * WHAT A LISTENER IS GIVEN is the tilt away from how the phone was being held,
 * in -1..1 across (x) and down (y): smoothed, at most once a frame, and only
 * while something moves. The resting pose follows the phone slowly, so a
 * guest who settles into a new way of holding it is back at the middle. No
 * reading at all (no sensor, permission refused, a computer) means no call:
 * the glints then twinkle on their own.
 *
 * The sensor is listened to only while a listener is registered and the tab
 * is showing.
 */

export type TiltListener = (x: number, y: number) => void;

/* How far, in degrees from the resting pose, is a full tilt. */
const RANGE = 18;
/* How much of the way to the reading each frame goes, and how fast the resting pose follows. */
const EASE = 0.16;
const DRIFT = 0.012;

const listeners = new Set<TiltListener>();
let permission: "unasked" | "pending" | "granted" | "refused" = "unasked";
let attached = false;
let rest: { beta: number; gamma: number } | null = null;
const target = { x: 0, y: 0 };
const now = { x: 0, y: 0 };
let frame = 0;

type PermissionApi = { requestPermission?: () => Promise<"granted" | "denied"> };

function needsAsking(): boolean {
  return (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as unknown as PermissionApi).requestPermission === "function"
  );
}

const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

function step(): void {
  frame = 0;
  now.x += (target.x - now.x) * EASE;
  now.y += (target.y - now.y) * EASE;

  for (const listener of listeners) {
    listener(now.x, now.y);
  }

  if (Math.abs(target.x - now.x) > 0.002 || Math.abs(target.y - now.y) > 0.002) {
    frame = window.requestAnimationFrame(step);
  }
}

function onOrientation(event: DeviceOrientationEvent): void {
  const { beta, gamma } = event;

  if (beta === null || gamma === null) {
    return;
  }

  if (rest === null) {
    rest = { beta, gamma };
  }

  rest.beta += (beta - rest.beta) * DRIFT;
  rest.gamma += (gamma - rest.gamma) * DRIFT;
  target.x = clamp((gamma - rest.gamma) / RANGE);
  target.y = clamp((beta - rest.beta) / RANGE);

  if (frame === 0) {
    frame = window.requestAnimationFrame(step);
  }
}

function sync(): void {
  if (typeof window === "undefined") {
    return;
  }

  const allowed = needsAsking() ? permission === "granted" : true;
  const want = allowed && listeners.size > 0 && document.visibilityState === "visible";

  if (want && !attached) {
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    attached = true;
  } else if (!want && attached) {
    window.removeEventListener("deviceorientation", onOrientation);
    attached = false;
    window.cancelAnimationFrame(frame);
    frame = 0;
    /* Back at the middle when it is next looked at. */
    rest = null;
  }
}

/*
  The tab's visibility is listened to from the first listener on, not when
  this file loads: the template's config, which every page that lists
  templates loads, imports `askTilt`.
*/
let followingVisibility = false;

function followVisibility(): void {
  if (!followingVisibility && typeof document !== "undefined") {
    followingVisibility = true;
    document.addEventListener("visibilitychange", sync);
  }
}

/** Asks for the tilt where the browser wants asking (an iPhone). Only from inside a tap. */
export function askTilt(): void {
  if (permission === "granted" || permission === "pending" || !needsAsking()) {
    return;
  }

  permission = "pending";
  const api = DeviceOrientationEvent as unknown as Required<PermissionApi>;

  void api
    .requestPermission()
    .then((state) => {
      permission = state === "granted" ? "granted" : "refused";
      sync();
    })
    .catch(() => {
      permission = "refused";
    });
}

/*
  Some browsers that want asking (Chrome, now) give the tilt to any page that
  asks, tap or no tap. So the first listener tries, quietly: granted, the
  glints follow the tilt on the closed cover too; refused for want of a tap
  (an iPhone, which shows nothing then), it is as if nothing had been asked,
  and the cover's tap asks.
*/
let probed = false;

function probe(): void {
  if (probed || permission !== "unasked" || !needsAsking()) {
    return;
  }

  probed = true;
  const api = DeviceOrientationEvent as unknown as Required<PermissionApi>;

  try {
    void api
      .requestPermission()
      .then((state) => {
        if (state === "granted" && permission !== "granted") {
          permission = "granted";
          sync();
        }
      })
      .catch(() => undefined);
  } catch {
    /* The tap asks. */
  }
}

/** Listens to the tilt until the returned function is called. */
export function watchTilt(listener: TiltListener): () => void {
  listeners.add(listener);
  followVisibility();
  probe();
  sync();

  return () => {
    listeners.delete(listener);
    sync();
  };
}
