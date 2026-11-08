import type { ReactElement } from "react";
import guide from "@/components/landing/guide-videos.json";
import { CARD, EYEBROW, SECTION_HEADING, SECTION_LEAD, SECTION_X, SECTION_Y } from "@/components/landing/styles";
import VideoGuideCarousel, { ChapterList, GuideWatchLink } from "@/components/landing/VideoGuideCarousel";

type GuideVideo = (typeof guide.videos)[number];

/** The id an in-page link can lead to. */
export const VIDEO_GUIDE_ID = "video-guide";

/** A label over a list inside a card: small gold-ink caps (no tracking on Hindi; see `:lang(hi)` in globals.css). */
const CARD_LABEL = "text-sm font-bold tracking-[0.08em] text-[var(--paper-gold-ink)] uppercase";

/** A video's length as written ("5:46"), as an ISO 8601 duration for <time>. */
function isoDuration(clock: string): string {
  const [seconds = 0, minutes = 0, hours = 0] = clock.split(":").map(Number).reverse();

  return `PT${hours > 0 ? `${hours}H` : ""}${minutes}M${seconds}S`;
}

/**
 * The video guide, under the Premium carousel: the full guide on YouTube, in
 * English and in Hindi, as a carousel of two cards (VideoGuideCarousel). A
 * server component; only the carousel, the thumbnail link and "Show all" run
 * in the browser.
 *
 * Every word, link and chapter time comes from guide-videos.json, which is
 * written alongside the videos. Replace a video there, not here. The cards
 * follow the order of its `videos` array.
 */
export default function VideoGuide(): ReactElement {
  const { section, videos } = guide;

  return (
    <section
      id={VIDEO_GUIDE_ID}
      aria-labelledby="video-guide-heading"
      className={`${SECTION_Y} scroll-mt-16`}
    >
      <div className={`${SECTION_X} text-center`}>
        <p className={EYEBROW}>{section.eyebrow}</p>
        <h2 id="video-guide-heading" className={`mt-3 ${SECTION_HEADING}`}>
          {section.heading}
        </h2>
        <p className={`mx-auto mt-4 max-w-[34rem] ${SECTION_LEAD}`}>{section.intro}</p>
      </div>

      {/* Full bleed on phones, so a card can peek in from the edge; the content column from 1024px. */}
      <div className="mt-8 lg:mt-12 lg:px-24">
        <div className="lg:mx-auto lg:max-w-[70rem]">
          <VideoGuideCarousel
            label={section.heading}
            slides={videos.map((video) => ({
              id: video.id,
              name: video.title,
              lang: video.lang,
              content: <GuideCard video={video} />,
            }))}
          />
        </div>
      </div>
    </section>
  );
}

/**
 * One video: the thumbnail and the pill that open it, its language, title and
 * length, what it covers and its chapters. `lang` is set on the card, so a
 * Hindi card's Devanagari is matched and broken as Hindi, loses the tracking
 * the labels carry, and gets the taller leading Devanagari needs.
 */
function GuideCard({ video }: { video: GuideVideo }): ReactElement {
  const titleId = `video-guide-${video.id}-title`;
  const timelineId = `video-guide-${video.id}-timeline`;

  return (
    <article
      lang={video.lang}
      aria-labelledby={titleId}
      className={`${CARD} flex flex-1 flex-col overflow-hidden [&:lang(hi)]:leading-[var(--lifafa-devanagari-leading)]`}
    >
      <GuideWatchLink
        href={video.url}
        language={video.lang}
        thumbnail={video.thumbnail}
        alt={video.thumbnailAlt}
        playLabel={video.playLabel}
      />

      <div className="flex flex-1 flex-col px-5 pt-5 pb-6 sm:px-6 lg:px-7 lg:pb-7">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--paper-muted)]">
          <span className="rounded-full bg-[var(--paper-blush)] px-2.5 py-0.5 font-semibold text-[var(--paper-ink)]">
            {video.badge}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium tabular-nums">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5 V12 L15 14" />
            </svg>
            <time dateTime={isoDuration(video.duration)}>{video.duration}</time>
          </span>
        </p>

        <h3
          id={titleId}
          className="mt-3 font-[family-name:var(--paper-display)] text-xl leading-snug font-semibold break-words text-[var(--paper-ink)] lg:text-2xl [&:lang(hi)]:leading-[1.6]"
        >
          {video.title}
        </h3>
        <p className="mt-2 break-words text-[var(--paper-muted)]">{video.summary}</p>

        <h4 className={`mt-6 ${CARD_LABEL}`}>{video.learnHeading}</h4>
        <ul role="list" className="mt-3 space-y-2">
          {video.learn.map((point) => (
            <li key={point} className="relative pl-5 break-words text-[var(--paper-ink)]">
              {/* A gold lozenge, the section rule's own, at the middle of the first line. */}
              <span
                aria-hidden="true"
                className="absolute top-[0.8em] left-0.5 h-1.5 w-1.5 -translate-y-1/2 rotate-45 border border-[var(--paper-gold)] [&:lang(hi)]:top-[0.875em]"
              />
              {point}
            </li>
          ))}
        </ul>

        <h4 id={timelineId} className={`mt-6 ${CARD_LABEL}`}>
          {video.timelineHeading}
        </h4>
        <ChapterList
          chapters={video.chapters}
          labelledBy={timelineId}
          showAllLabel={video.showAllLabel}
          showFewerLabel={video.showFewerLabel}
        />
      </div>
    </article>
  );
}
