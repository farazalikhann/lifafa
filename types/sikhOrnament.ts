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
  | "kandaFloralBorder"
  /*
    Calligraphy rather than shapes — Gurmukhi word-marks cut from one supplied
    sheet. Ids here because the host switches them on from the same panel;
    the pack sends them to `calligraphyIds` and the head of the card.
  */
  | "ikOnkarCalligraphy"
  | "satnamWaheguru"
  | "shubhVivaah"
  | "guruKirpa"
  | "anandKaraj"
  | "ikDoojeDeSang"
  | "doRoohanIkRaah"
  | "waheguru"
  | "sarbatDaBhala";

/*
  There is still no "ikOnkarGlyph" — no Ik Onkar DRAWN in a path, reconstructed
  from memory, which nobody could correct. "ikOnkarCalligraphy" above is a
  different thing: supplied artwork, published as it was given. The long note
  above SIKH_ORNAMENTS in lib/ornaments/sikh.tsx says what that does and does
  not fix, and the "ikOnkar" greeting in lib/gurmukhiContent.ts remains the
  route where it is real, correctable, selectable text.
*/
