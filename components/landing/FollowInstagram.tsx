import type { ReactElement } from "react";
import InstagramIcon from "@/components/brand/InstagramIcon";
import {
  EYEBROW,
  SECONDARY_BUTTON,
  SECTION_HEADING,
  SECTION_LEAD,
  SECTION_X,
  SECTION_Y,
} from "@/components/landing/styles";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/site";

/**
 * A short invitation to follow Lifafa on Instagram, near the end of the
 * landing page. An outline button, so it never competes with the emerald
 * closing band under it, which stays the page's one main action. Opens in a
 * new tab, so the page is still there afterwards. A server component.
 */
export default function FollowInstagram(): ReactElement {
  return (
    <section aria-labelledby="instagram-heading" className={`${SECTION_X} ${SECTION_Y}`}>
      <div className="mx-auto flex max-w-[40rem] flex-col items-center text-center">
        <p className={EYEBROW}>Instagram</p>
        <h2 id="instagram-heading" className={`mt-3 ${SECTION_HEADING}`}>
          Follow us on Instagram
        </h2>
        <p className={`mt-4 max-w-[30rem] ${SECTION_LEAD}`}>
          See new designs and real invitations first.
        </p>

        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Follow Lifafa on Instagram, ${INSTAGRAM_HANDLE} (opens in a new tab)`}
          className={`mt-8 w-full gap-2.5 sm:w-auto ${SECONDARY_BUTTON}`}
        >
          <InstagramIcon />
          Follow on Instagram
        </a>
        <p className="mt-3 text-sm font-medium text-[var(--paper-muted)]">
          {INSTAGRAM_HANDLE}
        </p>
      </div>
    </section>
  );
}
