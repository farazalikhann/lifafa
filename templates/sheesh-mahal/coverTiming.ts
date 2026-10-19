/*
  The cover's clock, apart from its drawing so the template's config can read
  it without fetching the cover: the whole opening, and when the card is let
  go under it. See Cover.tsx for every part's own moment.

  The card is let go at the very end, when the cover's hall has faded into
  page 2's own: page 2's words make their entrance then, in front of the
  guest, never behind the cover.
*/
export const DURATION = 3300;
export const REVEAL_AT = 3300;
/* The longest the tap waits for the screen to go fullscreen before the opening starts anyway. */
export const SETTLE_LIMIT = 250;
