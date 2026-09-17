import type { ReactElement } from "react";
import { EmptyState } from "@/components/admin/Feedback";
import { formatCount, formatIstDayMonth } from "@/lib/admin/format";
import type { DailyCount } from "@/lib/admin/stats";

/**
 * Events created per day over the last fortnight.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PLAIN DIVS. No chart library, and not inline SVG either. Fourteen bars whose
 * only variable is a height is a job for `style={{ height }}` on a div: SVG
 * would need a viewBox, a scale and its own text placement to say the same
 * thing, and a charting dependency would be several hundred kilobytes to draw
 * fourteen rectangles in an internal tool.
 *
 * The heights are the one inline style in the admin. Tailwind cannot express a
 * value computed at render time — `h-[57%]` has to exist in the stylesheet
 * before it can be used, and a class name built by interpolation is one the
 * compiler never sees and never emits.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * A SERVER COMPONENT. There is no interaction, no tooltip and no animation;
 * the numbers are in the markup where a screen reader, a text browser and
 * ctrl-F can all reach them.
 */

/** How tall the plot area is. A fixed height, so the page does not reflow. */
const PLOT_HEIGHT_CLASS = "h-28";

/**
 * The shortest a non-zero bar may be drawn, as a percentage.
 *
 * A day with one event against a day with forty would otherwise round to a
 * fraction of a pixel and read as nothing at all — which is exactly the day
 * somebody is looking for. Zero stays zero: an empty day draws no bar, only
 * the track behind it, because "a little" and "none" must not look alike.
 */
const MIN_VISIBLE_PERCENT = 6;

export default function DailyEventsChart({
  days,
}: {
  days: readonly DailyCount[];
}): ReactElement {
  const total = days.reduce((sum, day) => sum + day.count, 0);

  /*
    A quiet empty state rather than fourteen empty tracks. An axis with nothing
    on it looks like a chart that failed to load; a sentence does not.
  */
  if (days.length === 0 || total === 0) {
    return (
      <EmptyState
        title="No events created in the last 14 days."
        hint="New invitations will appear here as hosts create them."
      />
    );
  }

  const peak = Math.max(...days.map((day) => day.count));

  return (
    <figure className="rounded-lg border border-zinc-200 bg-white p-4">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
          Created per day
        </span>
        <span className="text-xs text-zinc-500">
          {formatCount(total)} in 14 days · peak {formatCount(peak)}
        </span>
      </figcaption>

      <div className={`mt-4 flex items-end gap-1 sm:gap-1.5 ${PLOT_HEIGHT_CLASS}`}>
        {days.map((day) => {
          const label = formatIstDayMonth(day.date);
          const share = peak === 0 ? 0 : (day.count / peak) * 100;
          const height =
            day.count === 0 ? 0 : Math.max(MIN_VISIBLE_PERCENT, share);

          return (
            <div
              key={day.date}
              /*
                The track, full height, so every column is the same size and the
                bars sit on a common baseline. `justify-end` puts the bar at the
                bottom of it.
              */
              className="flex h-full flex-1 flex-col justify-end"
              /*
                The whole column carries the description, so hovering anywhere
                over the day — not only over a one-pixel bar — says what it is.
              */
              title={`${label}: ${formatCount(day.count)} ${
                day.count === 1 ? "event" : "events"
              }`}
            >
              <div className="relative h-full w-full rounded-sm bg-zinc-100">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-sm bg-zinc-700"
                  style={{ height: `${height}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/*
        Only the ends of the axis are labelled. Fourteen dates across a phone
        screen overlap into illegibility, and the middle ones are inferable —
        the reader needs to know the range, not to read each tick.
      */}
      <div className="mt-2 flex justify-between text-xs text-zinc-500">
        <span>{formatIstDayMonth(days[0]?.date)}</span>
        <span>{formatIstDayMonth(days[days.length - 1]?.date)}</span>
      </div>

      {/*
        The numbers, for anyone not reading the picture. `sr-only` rather than
        omitted: a bar chart made of empty divs says nothing at all to a screen
        reader, and this is the same data in the order it is drawn.
      */}
      <ul className="sr-only">
        {days.map((day) => (
          <li key={day.date}>
            {formatIstDayMonth(day.date)}: {formatCount(day.count)} events
          </li>
        ))}
      </ul>
    </figure>
  );
}
