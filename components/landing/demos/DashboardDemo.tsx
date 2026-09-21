import type { ReactElement } from "react";
import DemoPhone from "@/components/landing/demos/DemoPhone";
import styles from "./DashboardDemo.module.css";

type Reply = "accepted" | "declined" | "maybe";

interface Row {
  name: string;
  /** Companions, as the dashboard's Bringing column counts them. */
  bringing: number;
  reply: Reply;
}

interface Tally {
  headcount: number;
  accepted: number;
  declined: number;
  maybe: number;
}

/** The dashboard's own labels, from components/dashboard/GuestTable.tsx. */
const LABEL: Record<Reply, string> = {
  accepted: "Accepted",
  declined: "Declined",
  maybe: "Maybe",
};

/** Full class names, one per reply, for the badge colours GuestTable uses. */
const BADGE: Record<Reply, string> = {
  accepted: styles.badgeAccepted,
  declined: styles.badgeDeclined,
  maybe: styles.badgeMaybe,
};

/**
 * The replies above the top of the list, which the demo's small screen has no
 * room to show. Counted in, so the figures on each page are the ones its list
 * implies.
 */
const EARLIER: Tally = { headcount: 43, accepted: 17, declined: 4, maybe: 3 };

/**
 * Oldest first, as the dashboard lists them (created_at ascending, see
 * lib/db/guests.ts), so the replies that came in between the two visits are
 * the three at the bottom of the second.
 */
const FIRST_VISIT: readonly Row[] = [
  { name: "Priya Sharma", bringing: 2, reply: "accepted" },
  { name: "Vikram Rao", bringing: 0, reply: "declined" },
];

const SECOND_VISIT: readonly Row[] = [
  ...FIRST_VISIT,
  { name: "Rohan Mehta", bringing: 1, reply: "accepted" },
  { name: "Ananya Iyer", bringing: 0, reply: "maybe" },
  { name: "Kabir Singh", bringing: 3, reply: "accepted" },
];

/**
 * The figures, worked out from the rows the way HeadcountSummary works them
 * out from the guest list: an acceptance counts the guest and everyone they
 * bring, and a maybe is left out of the headcount. The first visit comes to 46,
 * the second to 52.
 */
function tally(rows: readonly Row[]): Tally {
  return rows.reduce<Tally>(
    (sum, row) => ({
      headcount:
        sum.headcount + (row.reply === "accepted" ? 1 + row.bringing : 0),
      accepted: sum.accepted + (row.reply === "accepted" ? 1 : 0),
      declined: sum.declined + (row.reply === "declined" ? 1 : 0),
      maybe: sum.maybe + (row.reply === "maybe" ? 1 : 0),
    }),
    EARLIER,
  );
}

/** The phone at rest between visits: the time is what says the day has moved on. */
function LockScreen({
  time,
  className,
}: {
  time: string;
  className: string;
}): ReactElement {
  return (
    <div className={`${styles.lock} ${className}`}>
      <p className={styles.time}>{time}</p>
      <p className={styles.day}>Saturday, 5 December</p>
    </div>
  );
}

/**
 * One visit to the dashboard: the expected headcount and the reply tiles from
 * HeadcountSummary, and the guest list from GuestTable, in their own words and
 * colours. Nothing on it moves; it is the page as it was when it was opened.
 */
function DashboardPage({
  rows,
  className,
}: {
  rows: readonly Row[];
  className: string;
}): ReactElement {
  const figures = tally(rows);

  return (
    <div className={`${styles.page} ${className}`}>
      <div>
        <p className={styles.title}>Aarav &amp; Meera</p>
        <p className={styles.meta}>12 December · Jaipur</p>
      </div>

      <div className={styles.headcount}>
        <p className={styles.label}>Expected headcount</p>
        <p className={styles.big}>{figures.headcount}</p>
      </div>

      <div className={styles.tiles}>
        <div className={styles.tile}>
          <p className={`${styles.tileCount} ${styles.accepted}`}>
            {figures.accepted}
          </p>
          <p className={styles.tileLabel}>Accepted</p>
        </div>
        <div className={styles.tile}>
          <p className={`${styles.tileCount} ${styles.declined}`}>
            {figures.declined}
          </p>
          <p className={styles.tileLabel}>Declined</p>
        </div>
        <div className={styles.tile}>
          <p className={`${styles.tileCount} ${styles.maybe}`}>
            {figures.maybe}
          </p>
          <p className={styles.tileLabel}>Maybe</p>
        </div>
      </div>

      <div>
        <p className={styles.label}>Guests</p>
        <ul className={styles.list}>
          {rows.map((guest) => (
            <li key={guest.name} className={styles.row}>
              <span className={styles.name}>{guest.name}</span>
              {guest.bringing > 0 ? (
                <span className={styles.bringing}>+{guest.bringing}</span>
              ) : null}
              <span className={`${styles.badge} ${BADGE[guest.reply]}`}>
                {LABEL[guest.reply]}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * The host's dashboard, up to date each time it is opened.
 *
 * Two visits on the same day. At 4:10 the host opens the dashboard and finds
 * 46 coming; they put the phone down. At 7:45 they open it again, and the
 * three replies that came in meanwhile are in the list and in the figures.
 *
 * WHY TWO VISITS AND NOT ONE PAGE FILLING UP. The dashboard reads its guests
 * when it is opened, and nothing is pushed to a page that is already open, so
 * a demo with rows arriving in front of the host would be showing a feature
 * the product does not have. Every figure here changes only between one
 * opening and the next. When replies are pushed to an open dashboard, this is
 * the demo to change back.
 */
export default function DashboardDemo(): ReactElement {
  return (
    <DemoPhone className={styles.stage}>
      <LockScreen time="4:10" className={styles.lockFirst} />
      <LockScreen time="7:45" className={styles.lockSecond} />
      <DashboardPage rows={FIRST_VISIT} className={styles.visitFirst} />
      <DashboardPage rows={SECOND_VISIT} className={styles.visitSecond} />
    </DemoPhone>
  );
}
