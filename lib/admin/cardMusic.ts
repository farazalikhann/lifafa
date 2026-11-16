/**
 * A card's own song, uploaded by support from /admin: the rules both sides
 * of the upload share.
 *
 * Read by the panel in the browser (components/admin/CustomMusicPanel.tsx),
 * to refuse a wrong file before anything is sent, and by the server actions
 * (app/admin/events/actions.ts), which refuse it again, because a server
 * action's arguments are whatever crossed the wire. Nothing secret is here.
 *
 * THE FILE IS STORED, THE CARD HOLDS ITS LINK. The song goes into the public
 * Storage bucket CARD_MUSIC_BUCKET as <eventId>/<timestamp>.<ext>, a new name
 * for every upload, so a phone or a CDN that cached an earlier song can never
 * be handed a different one under the same address. The card's
 * card_config.musicUrl is set to the file's public address, and from there it
 * plays exactly as any other musicUrl does (components/card/MusicToggle.tsx).
 */

/** The public bucket that holds every card's own song. */
export const CARD_MUSIC_BUCKET = "card-music";

/** 8 MB: a whole song at a good bitrate, and small enough to load on a phone. */
export const CARD_MUSIC_MAX_BYTES = 8 * 1024 * 1024;

/**
 * The two kinds of file accepted, and the type each is stored under. Every
 * phone plays both. A .wav is refused: ten times the size for the same song.
 */
export const CARD_MUSIC_TYPES = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
} as const;

export type CardMusicExtension = keyof typeof CARD_MUSIC_TYPES;

/** For the file picker's `accept`. */
export const CARD_MUSIC_ACCEPT = ".mp3,.m4a,audio/mpeg,audio/mp4,audio/x-m4a";

/**
 * Every type the bucket lets in. Browsers name an .m4a differently (Chrome on
 * Windows says audio/x-m4a), but the panel always uploads under the type in
 * CARD_MUSIC_TYPES; the others are here so a hand-made upload is not refused
 * for a name.
 */
export const CARD_MUSIC_BUCKET_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/x-m4a",
] as const;

/** The file's extension if it is one this accepts, else null. */
export function cardMusicExtension(fileName: string): CardMusicExtension | null {
  const match = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  const extension = match?.[1]?.toLowerCase();

  return extension === "mp3" || extension === "m4a" ? extension : null;
}

/** Why a file cannot be used, in a sentence for support, or null if it can. */
export function cardMusicRefusal(fileName: string, bytes: number): string | null {
  if (cardMusicExtension(fileName) === null) {
    return "Only .mp3 and .m4a files can be used. Convert the song to MP3 first.";
  }

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "That file is empty.";
  }

  if (bytes > CARD_MUSIC_MAX_BYTES) {
    const megabytes = (bytes / (1024 * 1024)).toFixed(1);
    return `That file is ${megabytes} MB. The most a song can be is 8 MB.`;
  }

  return null;
}

/**
 * The stored name of an upload for this event: its folder, the time, the
 * extension. Anything else is not a file this flow made.
 */
export function isCardMusicPath(eventId: string, path: string): boolean {
  const [folder, name, ...rest] = path.split("/");

  return (
    rest.length === 0 &&
    folder === eventId &&
    name !== undefined &&
    /^\d{13}\.(mp3|m4a)$/.test(name)
  );
}

/** What a card's musicUrl is, for the admin panel. */
export type CardMusicSource =
  | { kind: "none" }
  /** Uploaded here: in CARD_MUSIC_BUCKET. */
  | { kind: "custom"; url: string; fileName: string }
  /** Any other link: a track the host chose, or one pasted in an older build. */
  | { kind: "other"; url: string; name: string };

/** The marker every public address in the bucket carries. */
const BUCKET_PATH = `/storage/v1/object/public/${CARD_MUSIC_BUCKET}/`;

export function describeCardMusic(musicUrl: string | null | undefined): CardMusicSource {
  if (typeof musicUrl !== "string" || musicUrl.trim().length === 0) {
    return { kind: "none" };
  }

  const lastSegment = (url: string): string => {
    try {
      const name = new URL(url, "https://x.invalid").pathname.split("/").pop() ?? "";
      return decodeURIComponent(name) || url;
    } catch {
      return url;
    }
  };

  if (musicUrl.includes(BUCKET_PATH)) {
    return { kind: "custom", url: musicUrl, fileName: lastSegment(musicUrl) };
  }

  /* "wedding-shehnai.mp3" reads as "wedding shehnai". */
  const name = lastSegment(musicUrl)
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .trim();

  return { kind: "other", url: musicUrl, name: name.length > 0 ? name : musicUrl };
}
