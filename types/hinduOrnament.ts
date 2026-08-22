/**
 * Hindu ornament pack — the shapes a host can add to their card, and the
 * greeting and shlok that head it.
 *
 * The parallel of types/ornament.ts, which declares the Muslim pack's ids.
 *
 * THIS FILE ONCE ARGUED AGAINST SHARING A TYPE WITH THAT ONE, on the grounds
 * that a union spanning both packs would permit a lantern and a kalash in the
 * same array. That was true and beside the point: the alternative was a second
 * config shape, which meant a second path through the panel and the canvas, and
 * two copies of a layout drift apart on the first change to either. The union
 * is AnyOrnamentId in types/ornament.ts, and the mixed state it permits is
 * unreachable — the panel offers one pack's chips, the editor empties the list
 * on every tradition click, and both the canvas and the placer resolve an id
 * through the current pack and skip one it does not know.
 *
 * What stays here is the id union itself: these seven names are the Hindu
 * pack's, drawn in lib/ornaments/hindu.tsx, and keeping them declared apart is
 * what lets that pack's own registry stay exhaustively typed.
 */

export type HinduOrnamentId =
  | "diya"
  | "kalash"
  | "ganesh"
  | "om"
  | "swastik"
  | "toran"
  | "marigold";

/*
  There is no HinduOrnamentConfig. The host's choices live in OrnamentConfig in
  types/ornament.ts, one shape for every tradition — see the note there. A
  second config would have been a second code path through the panel and the
  canvas, which is the thing this pack is built not to be.
*/
