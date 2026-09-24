import { NextResponse, type NextRequest } from "next/server";
import { requestIp } from "@/lib/admin/rateLimit";
import {
  TRANSLATE_MAX_FIELD_CHARS,
  TRANSLATE_MAX_TOTAL_CHARS,
  splitByGlossary,
  type GlossaryPart,
  type TranslateErrorResponse,
  type TranslateItem,
  type TranslateMode,
  type TranslateRequest,
  type TranslateResponse,
} from "@/lib/autoTranslate";
import type { CardLanguage } from "@/types/card";

/**
 * The Translate helper's server half: host-typed words, through Sarvam AI.
 *
 * ONLY TWO SARVAM ENDPOINTS ARE EVER CALLED, both named below and nowhere
 * else: /transliterate for names and places (script only, the sound kept) and
 * /translate for free text (meaning). No chat or LLM endpoint.
 *
 * THE KEY NEVER LEAVES THIS FILE. SARVAM_API_KEY has no NEXT_PUBLIC_ prefix, is
 * read only here, and goes only into the header of a request to Sarvam.
 *
 * Only a host's click in the editor reaches this route. A guest opening an
 * invitation reads the words already saved on it and never calls this.
 *
 * TODO: require a signed-in host once the editor is behind auth. /create is
 * open to signed-out visitors today, so this route is too, and the limits
 * below are all that stands between it and the credits.
 *
 * TODO: enforce one auto-translate per invitation here once auth is added.
 * Today the once-only rule is the editor's (`translationUsed` on the draft),
 * and a request sent by hand skips it. With a signed-in host, look up the
 * event, refuse when its saved draft is already marked used, and mark it
 * from here after a successful translate.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SARVAM_TRANSLATE_URL = "https://api.sarvam.ai/translate";
const SARVAM_TRANSLITERATE_URL = "https://api.sarvam.ai/transliterate";

/** How long one field may take before it is reported as failed. */
const SARVAM_TIMEOUT_MS = 15_000;

/** More fields than any real card has; a cap so one request stays one card. */
const MAX_ITEMS = 60;

const LOCALE: Record<CardLanguage, string> = {
  en: "en-IN",
  hi: "hi-IN",
};

/* ---------------------------------------------------------------------------
   Per-IP limit: 10 requests an hour.

   BEST EFFORT. A Map in one process's memory: on Vercel each instance keeps its
   own, and a cold start forgets it, so a determined caller gets more than 10.
   It stops a stuck button or a casual loop, not an attacker. When this needs
   to be real, move the count to Supabase (a row per IP per hour) or require a
   signed-in host and count per account. See lib/admin/rateLimit.ts for the
   same trade-off, stated at more length.
   --------------------------------------------------------------------------- */

const REQUESTS_PER_WINDOW = 10;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_TRACKED_ADDRESSES = 10_000;

/** Start times of the requests each address made in the last hour. */
const recentRequests = new Map<string, number[]>();

/** Records one request for `ip`; false when it is already over the limit. */
function takeRequest(ip: string): boolean {
  const now = Date.now();
  const recent = (recentRequests.get(ip) ?? []).filter(
    (startedAt) => now - startedAt < WINDOW_MS,
  );

  if (recent.length >= REQUESTS_PER_WINDOW) {
    recentRequests.set(ip, recent);
    return false;
  }

  recent.push(now);
  /* Re-inserted, so Map order stays oldest-activity first for the trim below. */
  recentRequests.delete(ip);
  recentRequests.set(ip, recent);

  while (recentRequests.size > MAX_TRACKED_ADDRESSES) {
    const oldest = recentRequests.keys().next();

    if (oldest.done === true) {
      break;
    }

    recentRequests.delete(oldest.value);
  }

  return true;
}

/* ---------------------------------------------------------------------------
   Reading the request.
   --------------------------------------------------------------------------- */

function isLanguage(value: unknown): value is CardLanguage {
  return value === "en" || value === "hi";
}

function isMode(value: unknown): value is TranslateMode {
  return value === "transliterate" || value === "translate";
}

/** The request, or the reason it is refused. */
function readRequest(
  body: unknown,
): { ok: true; request: TranslateRequest } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "The request was not understood." };
  }

  const { from, to, items } = body as Record<string, unknown>;

  if (!isLanguage(from) || !isLanguage(to) || from === to) {
    return { ok: false, error: "Choose two different languages." };
  }

  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) {
    return { ok: false, error: "There is nothing to translate." };
  }

  const read: TranslateItem[] = [];

  for (const item of items as unknown[]) {
    if (typeof item !== "object" || item === null) {
      return { ok: false, error: "The request was not understood." };
    }

    const { id, mode, text, keepCeremonyWords } = item as Record<
      string,
      unknown
    >;

    if (
      typeof id !== "string" ||
      id.length === 0 ||
      id.length > 120 ||
      !isMode(mode) ||
      typeof text !== "string" ||
      text.trim().length === 0 ||
      (keepCeremonyWords !== undefined && typeof keepCeremonyWords !== "boolean")
    ) {
      return { ok: false, error: "The request was not understood." };
    }

    if (text.length > TRANSLATE_MAX_FIELD_CHARS) {
      return {
        ok: false,
        error: `One field is longer than ${TRANSLATE_MAX_FIELD_CHARS} characters. Shorten it, or translate it yourself.`,
      };
    }

    read.push({ id, mode, text, keepCeremonyWords: keepCeremonyWords === true });
  }

  return { ok: true, request: { from, to, items: read } };
}

/* ---------------------------------------------------------------------------
   Sarvam.
   --------------------------------------------------------------------------- */

/**
 * What a call asks Sarvam for. `translate-held` is Translate on the
 * sarvam-translate:v1 model, used only for text holding ceremony-word markers:
 * it keeps a "[1]" where it stands far more reliably than mayura:v1, which
 * drops or rewrites markers. See translateAroundMarkers.
 */
type SarvamMode = TranslateMode | "translate-held";

/** Sarvam calls one request may have in flight at once. */
const MAX_CONCURRENT_CALLS = 8;

/**
 * Every Sarvam call one request makes, through one gate.
 *
 * De-duplicated, so "Khan" written three times on a card is paid for once, and
 * capped at MAX_CONCURRENT_CALLS so a long card does not trip Sarvam's own rate
 * limit. Counts the characters it actually sends, for the cost log.
 */
function sarvamCaller(apiKey: string, from: CardLanguage, to: CardLanguage) {
  const inFlight = new Map<string, Promise<string>>();
  const waiting: (() => void)[] = [];
  let active = 0;
  const stats = { calls: 0, chars: 0 };

  const acquire = async (): Promise<void> => {
    if (active >= MAX_CONCURRENT_CALLS) {
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    active += 1;
  };

  const release = (): void => {
    active -= 1;
    waiting.shift()?.();
  };

  /** One input through the endpoint its mode names. Throws on any failure. */
  const send = async (mode: SarvamMode, input: string): Promise<string> => {
    const isTransliterate = mode === "transliterate";

    await acquire();

    try {
      stats.calls += 1;
      stats.chars += input.length;

      const response = await fetch(
        isTransliterate ? SARVAM_TRANSLITERATE_URL : SARVAM_TRANSLATE_URL,
        {
          method: "POST",
          headers: {
            "api-subscription-key": apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isTransliterate
              ? {
                  input,
                  source_language_code: LOCALE[from],
                  target_language_code: LOCALE[to],
                  numerals_format: "international",
                }
              : mode === "translate-held"
                ? {
                    input,
                    source_language_code: LOCALE[from],
                    target_language_code: LOCALE[to],
                    model: "sarvam-translate:v1",
                    numerals_format: "international",
                  }
                : {
                    input,
                    source_language_code: LOCALE[from],
                    target_language_code: LOCALE[to],
                    model: "mayura:v1",
                    mode: "formal",
                    numerals_format: "international",
                  },
          ),
          signal: AbortSignal.timeout(SARVAM_TIMEOUT_MS),
          cache: "no-store",
        },
      );

      if (!response.ok) {
        /* The status and Sarvam's error code only — never the text or the key. */
        let code = "";

        try {
          const failure = (await response.json()) as {
            error?: { code?: unknown };
          };
          code =
            typeof failure.error?.code === "string" ? failure.error.code : "";
        } catch {
          /* Not JSON; the status is enough. */
        }

        throw new Error(`Sarvam ${mode} ${response.status} ${code}`.trim());
      }

      const payload = (await response.json()) as Record<string, unknown>;
      const text = isTransliterate
        ? payload.transliterated_text
        : payload.translated_text;

      if (typeof text !== "string" || text.trim().length === 0) {
        throw new Error(`Sarvam ${mode} returned no text`);
      }

      return text.trim();
    } finally {
      release();
    }
  };

  const call = (mode: SarvamMode, input: string): Promise<string> => {
    const key = `${mode}|${input}`;
    let pending = inFlight.get(key);

    if (pending === undefined) {
      pending = send(mode, input);
      inFlight.set(key, pending);
    }

    return pending;
  };

  return { call, stats };
}

type SarvamCall = ReturnType<typeof sarvamCaller>["call"];

/** A run of Devanagari letters and signs: one word, without its punctuation. */
const DEVANAGARI_WORD = /[\u0900-\u0963\u0971-\u097F\u200C\u200D]+/g;

/**
 * Devanagari names into Latin letters, one word per call.
 *
 * WHY NOT THE WHOLE NAME AT ONCE. Sarvam's Hindi-to-English transliteration
 * reads the words around a word, and for names that means guessing a more
 * common one: "रोज़ खान" comes back as "Roshni Khan" every time, and
 * "फैज़ान अहमद" as "Fayaz Ahmed", while "रोज़" alone is "Rose". Line breaks
 * and commas between the words do not stop it. A call per word does.
 *
 * Only the Devanagari words are sent. Spaces, commas, digits and anything
 * already in Latin stay exactly as typed, and each word starts with a
 * capital, as a name or a place does.
 */
async function romanize(call: SarvamCall, text: string): Promise<string> {
  const words = [...new Set(text.match(DEVANAGARI_WORD) ?? [])];
  const romanized = new Map<string, string>();

  await Promise.all(
    words.map(async (word) => {
      const latin = await call("transliterate", word);
      romanized.set(word, latin.charAt(0).toUpperCase() + latin.slice(1));
    }),
  );

  return text.replace(DEVANAGARI_WORD, (word) => romanized.get(word) ?? word);
}

/** Text through the mode it asked for; see romanize for Hindi names. */
function sendText(
  call: SarvamCall,
  mode: TranslateMode,
  text: string,
  to: CardLanguage,
): Promise<string> {
  return mode === "transliterate" && to === "en"
    ? romanize(call, text)
    : call(mode, text);
}

/** Whether a piece has any letter in it; spaces and "&" alone are not sent. */
const HAS_LETTER = /\p{L}/u;

/**
 * Translated in one piece, with a numbered marker standing in for each
 * ceremony word: "[1] Ceremony of Anas and Zainab" comes back as
 * "[1] अनस और ज़ैनब का समारोह", and the fixed spelling goes where the marker
 * landed. The ceremony word itself is never sent.
 *
 * WHY NOT THE PIECES ON THEIR OWN. Cut at the ceremony word, a title leaves
 * fragments too short to translate: "समारोह" alone came back once as
 * "Funeral", and "और" as "And". One piece keeps the grammar.
 *
 * Null when any marker did not come back exactly once, so the caller can
 * fall back to the pieces rather than print a "[1]" on a card.
 */
async function translateAroundMarkers(
  call: SarvamCall,
  parts: readonly GlossaryPart[],
): Promise<string | null> {
  const fixed: string[] = [];
  const input = parts
    .map((part) =>
      part.kind === "fixed" ? `[${fixed.push(part.text)}]` : part.text,
    )
    .join("")
    .trim();
  let output = await call("translate-held", input);

  for (const [index, word] of fixed.entries()) {
    const marker = `[${index + 1}]`;

    if (output.split(marker).length !== 2) {
      return null;
    }

    output = output.replace(marker, word);
  }

  return output;
}

/**
 * One field, through the mode it asked for.
 *
 * With `keepCeremonyWords`, the ceremony words are written from the glossary
 * and never sent to Sarvam. A title made only of ceremony words ("Mehndi &
 * Sangeet") costs no call at all. Otherwise a translated field goes through
 * translateAroundMarkers, and a transliterated one (a function's name) is
 * sent piece by piece, which is safe for a change of script: there is no
 * grammar to lose. The pieces are also the fallback for a lost marker.
 */
async function translateItem(
  call: SarvamCall,
  item: TranslateItem,
  from: CardLanguage,
  to: CardLanguage,
): Promise<string> {
  if (item.keepCeremonyWords !== true) {
    return sendText(call, item.mode, item.text, to);
  }

  const parts = splitByGlossary(item.text, from, to);

  if (!parts.some((part) => part.kind === "fixed")) {
    return sendText(call, item.mode, item.text, to);
  }

  const onlyCeremonyWords = parts.every(
    (part) => part.kind === "fixed" || !HAS_LETTER.test(part.text),
  );

  if (!onlyCeremonyWords && item.mode === "translate") {
    const held = await translateAroundMarkers(call, parts);

    if (held !== null) {
      return held;
    }

    console.warn("[translate] a ceremony-word marker was lost; sending pieces.");
  }

  const pieces = await Promise.all(
    parts.map(async (part) => {
      const core = part.text.trim();

      if (part.kind === "fixed" || !HAS_LETTER.test(core)) {
        return part.text;
      }

      const start = part.text.indexOf(core);
      const translated = await sendText(call, item.mode, core, to);

      return (
        part.text.slice(0, start) +
        translated +
        part.text.slice(start + core.length)
      );
    }),
  );

  return pieces.join("").trim();
}

function fail(
  status: number,
  error: string,
): NextResponse<TranslateErrorResponse> {
  return NextResponse.json({ error }, { status });
}

/**
 * POST only. Next answers every other method with 405 for a route that does
 * not export it.
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<TranslateResponse | TranslateErrorResponse>> {
  /* First, so a server without the key spends nothing and counts nothing. */
  const apiKey = process.env.SARVAM_API_KEY?.trim() ?? "";

  if (apiKey.length === 0) {
    console.error("[translate] SARVAM_API_KEY is not set.");
    return fail(
      503,
      "Translation is not set up on this server yet. You can still type the text yourself.",
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return fail(400, "The request was not understood.");
  }

  const read = readRequest(body);

  if (!read.ok) {
    return fail(400, read.error);
  }

  const { from, to, items } = read.request;
  const totalChars = items.reduce((total, item) => total + item.text.length, 0);

  if (totalChars > TRANSLATE_MAX_TOTAL_CHARS) {
    return fail(
      413,
      `That is ${totalChars} characters, over the ${TRANSLATE_MAX_TOTAL_CHARS} a single translation can take. Shorten the longest text and try again.`,
    );
  }

  if (!takeRequest(requestIp(request.headers))) {
    return fail(
      429,
      "Too many translation requests from this network. Please try again in an hour.",
    );
  }

  const { call, stats } = sarvamCaller(apiKey, from, to);

  /* Every field at once, so the button waits for the slowest, not the sum. */
  const settled = await Promise.allSettled(
    items.map((item) => translateItem(call, item, from, to)),
  );

  /*
    The size of the request, for estimating cost. Never the text itself.
    "sent" is what Sarvam actually received — repeated words are sent once, and
    the spaces and punctuation between romanized words not at all.
  */
  console.info(
    `[translate] ${from}->${to}: ${items.length} fields, ${totalChars} characters requested, ${stats.chars} characters sent to Sarvam in ${stats.calls} calls.`,
  );

  const results: TranslateResponse["results"] = [];
  const failed: string[] = [];

  settled.forEach((outcome, index) => {
    const { id } = items[index];

    if (outcome.status === "fulfilled") {
      results.push({ id, text: outcome.value });
    } else {
      failed.push(id);
      console.error(
        `[translate] field failed: ${
          outcome.reason instanceof Error ? outcome.reason.message : "unknown"
        }`,
      );
    }
  });

  if (results.length === 0) {
    return fail(
      502,
      "The translation service did not respond. Please try again, or type the text yourself.",
    );
  }

  return NextResponse.json({ results, failed });
}
