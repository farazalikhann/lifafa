/**
 * Sikh ornament pack — the ids of the shapes a host can add to their card.
 *
 * The parallel of types/hinduOrnament.ts, which declares the Hindu pack's ids,
 * and it works the same way: the ids live here so lib/ornaments/sikh.tsx
 * can keep its registry exhaustively typed, and they join AnyOrnamentId in
 * types/ornament.ts so one OrnamentConfig serves every tradition.
 *
 * There is no SikhOrnamentConfig. The host's choices live in OrnamentConfig,
 * one shape for every tradition — a second config would be a second code path
 * through the panel and the canvas.
 */

export type SikhOrnamentId =
  | "khanda"
  | "gurudwaraArch"
  | "lotus"
  | "nishanSahibPennant"
  | "kandaFloralBorder";

/*
  There is no "ikOnkarGlyph" id, and its absence is deliberate. It is a script
  character and the opening of the Mool Mantar, not a decorative mark; drawing
  it would mean freezing a reconstructed letterform in a path that nobody could
  correct. See the long note above SIKH_ORNAMENTS in lib/ornaments/sikh.tsx —
  the route for putting it on a card is the "ikOnkar" greeting in
  lib/gurmukhiContent.ts, where it is real, correctable, selectable text.
*/
