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
 * in -1..1 across (x) and down (y), heavily smoothed, so the glints' light
 * shifts slowly and never twitches with the hand:
 *
 *   a low-pass with a time constant of 400ms, and a reading less than 3
 *   degrees from the last one taken ignored;
 *   at most ten calls a second, and only while something changes;
 *   frozen while a finger is on the screen, while anything scrolls and for
 *   600ms after: the hand that swipes moves the phone, and that is not a tilt.
 *   What the phone turns through meanwhile becomes its new resting pose.
 *
 * The resting pose also follows the phone slowly, so a guest who settles into
 * a new way of holding it is back at the middle. No reading at all (no
 * sensor, permission refused, a computer) means no call: the glints then
 * twinkle on their own. A listener only ever changes brightness (Glints.tsx);
 * nothing moves with the tilt.
 *
 * The sensor, the touches and the scrolling are listened to only while a
 * listener is registered and the tab is showing. The scroll listener only
 * notes the time.
 */

export type TiltListener = (x: number, y: number) => void;

/* How far, in degrees from the resting pose, is a full tilt. */
const RANGE = 18;
/* Smaller changes than this, in degrees, are not a tilt. */
const DEAD_ZONE = 3;
/* The low-pass's time constant, and how often a listener may be called. */
const TAU = 400;
const EVERY = 100;
/* How long after the last scroll the tilt stays frozen. */
const SCROLL_REST = 600;
/* How fast the resting pose follows the phone, per reading. */
const DRIFT = 0.012;

const listeners = new Set<TiltListener>();
let permission: "unasked" | "pending" | "granted" | "refused" = "unasked";
let attached = false;
let rest: { beta: number; gamma: number } | null = null;
/* The last reading taken, for the dead zone. */
let taken: { beta: number; gamma: number } | null = null;
const target = { x: 0, y: 0 };
const now = { x: 0, y: 0 };
let timer = 0;
let lastStep = 0;
let touching = 0;
let scrolledAt = -Infinity;

type PermissionApi = { requestPermission?: () => Promise<"granted" | "denied"> };

function needsAsking(): boolean {
  return (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as unknown as PermissionApi).requestPermission === "function"
  );
}

const clamp = (value: number): number => Math.max(-1, Math.min(1, value));

function frozen(): boolean {
  return touching > 0 || performance.now() - scrolledAt < SCROLL_REST;
}

function step(): void {
  timer = 0;
  const time = performance.now();
  const dt = Math.min(500, time - lastStep);
  lastStep = time;

  /* Frozen: the light stays exactly where it is, and goes on once the hand is still. */
  if (frozen()) {
    timer = window.setTimeout(step, EVERY);
    return;
  }
  const share = 1 - Math.exp(-dt / TAU);

  now.x += (target.x - now.x) * share;
  now.y += (target.y - now.y) * share;

  for (const listener of listeners) {
    listener(now.x, now.y);
  }

  if (Math.abs(target.x - now.x) > 0.01 || Math.abs(target.y - now.y) > 0.01) {
    timer = window.setTimeout(step, EVERY);
  }
}

function onOrientation(event: DeviceOrientationEvent): void {
  const { beta, gamma } = event;

  if (beta === null || gamma === null) {
    return;
  }

  if (rest === null || taken === null) {
    rest = { beta, gamma };
    taken = { beta, gamma };
    return;
  }

  /*
    Frozen: whatever the phone turns through is taken as how it is now held,
    so the light stays exactly where it was.
  */
  if (frozen()) {
    rest.beta += beta - taken.beta;
    rest.gamma += gamma - taken.gamma;
    taken = { beta, gamma };
    return;
  }

  if (Math.abs(beta - taken.beta) < DEAD_ZONE && Math.abs(gamma - taken.gamma) < DEAD_ZONE) {
    return;
  }

  taken = { beta, gamma };
  rest.beta += (beta - rest.beta) * DRIFT;
  rest.gamma += (gamma - rest.gamma) * DRIFT;
  target.x = clamp((gamma - rest.gamma) / RANGE);
  target.y = clamp((beta - rest.beta) / RANGE);

  if (timer === 0) {
    lastStep = performance.now() - EVERY;
    timer = window.setTimeout(step, 0);
  }
}

const onTouchStart = (): void => {
  touching += 1;
};
const onTouchEnd = (event: TouchEvent): void => {
  touching = event.touches.length;
  /* The swipe's own scroll follows the finger's lifting; it is frozen from now. */
  scrolledAt = performance.now();
};
const onScroll = (): void => {
  scrolledAt = performance.now();
};

const QUIET = { passive: true, capture: true } as const;

function sync(): void {
  if (typeof window === "undefined") {
    return;
  }

  const allowed = needsAsking() ? permission === "granted" : true;
  const want = allowed && listeners.size > 0 && document.visibilityState === "visible";

  if (want && !attached) {
    window.addEventListener("deviceorientation", onOrientation, { passive: true });
    window.addEventListener("touchstart", onTouchStart, QUIET);
    window.addEventListener("touchend", onTouchEnd, QUIET);
    window.addEventListener("touchcancel", onTouchEnd, QUIET);
    /* Captured, so the scrolling of any box is heard, not only the page's. */
    document.addEventListener("scroll", onScroll, QUIET);
    attached = true;
  } else if (!want && attached) {
    window.removeEventListener("deviceorientation", onOrientation);
    window.removeEventListener("touchstart", onTouchStart, QUIET);
    window.removeEventListener("touchend", onTouchEnd, QUIET);
    window.removeEventListener("touchcancel", onTouchEnd, QUIET);
    document.removeEventListener("scroll", onScroll, QUIET);
    attached = false;
    window.clearTimeout(timer);
    timer = 0;
    touching = 0;
    /* Back at the middle when it is next looked at. */
    rest = null;
    taken = null;
    target.x = 0;
    target.y = 0;
    now.x = 0;
    now.y = 0;
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
