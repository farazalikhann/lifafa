/**
 * Buddhist ornament pack — the ids of the shapes a host can add to their card.
 *
 * The parallel of types/hinduOrnament.ts, which declares the Hindu pack's ids,
 * and it works the same way: the ids live here so lib/ornaments/buddhist.tsx
 * can keep its registry exhaustively typed, and they join AnyOrnamentId in
 * types/ornament.ts so one OrnamentConfig serves every tradition.
 *
 * There is no BuddhistOrnamentConfig. The host's choices live in OrnamentConfig,
 * one shape for every tradition — a second config would be a second code path
 * through the panel and the canvas.
 */

export type BuddhistOrnamentId =
  | "dharmaWheel"
  | "lotus"
  | "bodhiLeaf"
  | "endlessKnot"
  | "stupaOutline"
  | "prayerFlagString"
  | "conchShell";

/*
  There is no id here for a figure of the Buddha, and there must never be one.
  See the header of lib/ornaments/buddhist.tsx.
*/
