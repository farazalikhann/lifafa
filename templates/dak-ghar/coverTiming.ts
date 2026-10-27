/*
  Dak Ghar's opening, apart from its drawing so the config and the sound can
  read it without fetching the cover. Every time is in ms from the moment the
  opening starts. See Cover.tsx for what each part does.

    0 to 1200     the slip prints up out of the slot in three steps
    1250 to 1550  the postmark presses onto it
    1550 to 1900  the hold, the slip in full view (a tap on it moves on)
    1900 to 2500  the slip lifts toward the guest and the scene fades; the
                  card is let go under it at 1900
*/
export const PRINT_MS = 1200;
export const STAMP_AT = 1250;
export const STAMP_MS = 300;
export const LIFT_AT = 1900;
export const LIFT_MS = 600;
export const DURATION = LIFT_AT + LIFT_MS;
/* A tap on the slip from here on lifts it at once. */
export const TAPPABLE_AT = STAMP_AT + STAMP_MS;
