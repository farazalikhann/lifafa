/**
 * Jain ornament pack — the ids of the shapes a host can add to their card.
 *
 * The parallel of types/hinduOrnament.ts, which declares the Hindu pack's ids,
 * and it works the same way: the ids live here so lib/ornaments/jain.tsx
 * can keep its registry exhaustively typed, and they join AnyOrnamentId in
 * types/ornament.ts so one OrnamentConfig serves every tradition.
 *
 * There is no JainOrnamentConfig. The host's choices live in OrnamentConfig,
 * one shape for every tradition — a second config would be a second code path
 * through the panel and the canvas.
 */

export type JainOrnamentId =
  | "ahimsaHand"
  | "swastika"
  | "lotus"
  | "siddhaShila"
  | "kalash"
  | "tornGate";

/*
  "swastika" here and "swastik" in the Hindu pack are separate ids drawing
  separate components, even though both are the upright clockwise symbol. Each
  pack owns its own shapes; sharing one id across two packs would make the
  resolution ambiguous the moment either tradition wanted its own treatment.
*/
