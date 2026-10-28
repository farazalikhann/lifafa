/*
  Dak Ghar's opening, apart from its drawing so the config and the sound can
  read it without fetching the cover. Every time is in ms from the moment the
  opening starts. See Cover.tsx for what each part does.

    120 to 1100   the slip prints up out of the slot in three steps, at the
                  slot's own width (SLIP_SMALL of its reading size)
    1130          the slot stops hiding what is below its lip
    1150 to 1570  the slip rises to the middle of the screen at reading size
    1600 to 1900  the postmark presses onto it
    1900 to 2350  the hold, the slip in full view (a tap on it moves on)
    2350 to 2950  the slip lifts toward the guest and the scene fades; the
                  card is let go under it at 2350

  Each sound starts SOUND_LEAD_MS (sounds.ts) before its moment: the slip
  printing before PRINT_AT, the postmark before STAMP_AT. The tap's own sound
  plays in the tap.
*/
export const PRINT_AT = 120;
export const PRINT_MS = 980;
export const UNCLIP_AT = 1130;
export const GROW_AT = 1150;
export const GROW_MS = 420;
export const STAMP_AT = 1600;
export const STAMP_MS = 300;
export const LIFT_AT = 2350;
export const LIFT_MS = 600;
export const DURATION = LIFT_AT + LIFT_MS;
/* A tap on the slip from here on lifts it at once. */
export const TAPPABLE_AT = STAMP_AT + STAMP_MS;
