/**
 * Christian ornament pack — the ids of the shapes a host can add to their card.
 *
 * The parallel of types/hinduOrnament.ts, which declares the Hindu pack's ids,
 * and it works the same way: the ids live here so lib/ornaments/christian.tsx
 * can keep its registry exhaustively typed, and they join AnyOrnamentId in
 * types/ornament.ts so one OrnamentConfig serves every tradition.
 *
 * There is no ChristianOrnamentConfig. The host's choices live in OrnamentConfig,
 * one shape for every tradition — a second config would be a second code path
 * through the panel and the canvas.
 */

export type ChristianOrnamentId =
  | "plainCross"
  | "dove"
  | "weddingBells"
  | "oliveBranch"
  | "chalice"
  | "gothicArch"
  | "ringPair"
  /* Two more pictures: an open Bible with the rings on it, and a spray of lilies for the corners. */
  | "bibleRings"
  | "lilyCorner"
  /*
    Calligraphy rather than shapes: six English lines in a copperplate hand.
    Ids here because the host switches them on from the same panel; the pack
    sends them to `calligraphyIds` and the head of the card.
  */
  | "godIsLove"
  | "loveNeverFails"
  | "twoBecomeOne"
  | "godHasJoined"
  | "holyMatrimony"
  | "loveIsPatient";

/*
  "plainCross" is a plain cross and not a crucifix. A crucifix carries a figure
  by definition, and no pack in this app draws one.
*/
