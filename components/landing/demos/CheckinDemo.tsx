import type { ReactElement } from "react";
import DemoPhone from "@/components/landing/demos/DemoPhone";
import styles from "./CheckinDemo.module.css";

/**
 * The modules of a real QR code for https://getlifafa.co.in — version 2, error
 * correction M, 25 modules a side — as one path of unit squares.
 *
 * Real rather than a pattern that looks like one, so a visitor who points a
 * camera at the demo is taken somewhere sensible instead of being told the
 * code is broken. Written out rather than drawn at runtime: the qrcode package
 * is a large thing to ship to the landing page for one fixed picture. Made with
 * that package's QRCode.create, with each dark run of a row joined into one
 * rectangle.
 */
const QR_PATH =
  "M0 0h7v1h-7zM9 0h1v1h-1zM12 0h2v1h-2zM18 0h7v1h-7zM0 1h1v1h-1zM6 1h1v1h-1zM13 1h4v1h-4zM18 1h1v1h-1zM24 1h1v1h-1zM0 2h1v1h-1zM2 2h3v1h-3zM6 2h1v1h-1zM8 2h1v1h-1zM10 2h1v1h-1zM15 2h1v1h-1zM18 2h1v1h-1zM20 2h3v1h-3zM24 2h1v1h-1zM0 3h1v1h-1zM2 3h3v1h-3zM6 3h1v1h-1zM8 3h3v1h-3zM12 3h4v1h-4zM18 3h1v1h-1zM20 3h3v1h-3zM24 3h1v1h-1zM0 4h1v1h-1zM2 4h3v1h-3zM6 4h1v1h-1zM8 4h1v1h-1zM16 4h1v1h-1zM18 4h1v1h-1zM20 4h3v1h-3zM24 4h1v1h-1zM0 5h1v1h-1zM6 5h1v1h-1zM8 5h1v1h-1zM11 5h3v1h-3zM15 5h1v1h-1zM18 5h1v1h-1zM24 5h1v1h-1zM0 6h7v1h-7zM8 6h1v1h-1zM10 6h1v1h-1zM12 6h1v1h-1zM14 6h1v1h-1zM16 6h1v1h-1zM18 6h7v1h-7zM8 7h3v1h-3zM12 7h1v1h-1zM14 7h1v1h-1zM16 7h1v1h-1zM0 8h1v1h-1zM2 8h5v1h-5zM9 8h1v1h-1zM11 8h1v1h-1zM13 8h3v1h-3zM18 8h5v1h-5zM1 9h2v1h-2zM5 9h1v1h-1zM9 9h1v1h-1zM12 9h2v1h-2zM16 9h1v1h-1zM19 9h1v1h-1zM23 9h1v1h-1zM1 10h1v1h-1zM3 10h2v1h-2zM6 10h2v1h-2zM12 10h10v1h-10zM23 10h2v1h-2zM0 11h2v1h-2zM5 11h1v1h-1zM8 11h1v1h-1zM10 11h3v1h-3zM14 11h2v1h-2zM17 11h3v1h-3zM24 11h1v1h-1zM0 12h2v1h-2zM4 12h1v1h-1zM6 12h3v1h-3zM10 12h4v1h-4zM15 12h1v1h-1zM17 12h2v1h-2zM20 12h1v1h-1zM22 12h3v1h-3zM0 13h2v1h-2zM3 13h3v1h-3zM7 13h4v1h-4zM13 13h1v1h-1zM16 13h2v1h-2zM19 13h1v1h-1zM21 13h1v1h-1zM23 13h1v1h-1zM0 14h1v1h-1zM4 14h4v1h-4zM10 14h6v1h-6zM17 14h5v1h-5zM23 14h2v1h-2zM0 15h1v1h-1zM3 15h3v1h-3zM8 15h1v1h-1zM10 15h2v1h-2zM16 15h1v1h-1zM18 15h3v1h-3zM24 15h1v1h-1zM0 16h1v1h-1zM6 16h2v1h-2zM9 16h3v1h-3zM13 16h8v1h-8zM22 16h1v1h-1zM8 17h2v1h-2zM12 17h2v1h-2zM15 17h2v1h-2zM20 17h2v1h-2zM0 18h7v1h-7zM9 18h2v1h-2zM16 18h1v1h-1zM18 18h1v1h-1zM20 18h1v1h-1zM22 18h3v1h-3zM0 19h1v1h-1zM6 19h1v1h-1zM8 19h1v1h-1zM12 19h1v1h-1zM14 19h1v1h-1zM16 19h1v1h-1zM20 19h2v1h-2zM23 19h1v1h-1zM0 20h1v1h-1zM2 20h3v1h-3zM6 20h1v1h-1zM8 20h3v1h-3zM12 20h9v1h-9zM22 20h3v1h-3zM0 21h1v1h-1zM2 21h3v1h-3zM6 21h1v1h-1zM8 21h3v1h-3zM13 21h1v1h-1zM17 21h2v1h-2zM20 21h5v1h-5zM0 22h1v1h-1zM2 22h3v1h-3zM6 22h1v1h-1zM8 22h1v1h-1zM11 22h6v1h-6zM21 22h2v1h-2zM24 22h1v1h-1zM0 23h1v1h-1zM6 23h1v1h-1zM9 23h1v1h-1zM11 23h1v1h-1zM15 23h3v1h-3zM19 23h3v1h-3zM24 23h1v1h-1zM0 24h7v1h-7zM8 24h1v1h-1zM11 24h2v1h-2zM18 24h7v1h-7z";

/**
 * A guest's pass is scanned at the door.
 *
 * The phone is the door team's: the scanner a host opens from the dashboard,
 * with the arrivals count above the camera. A guest's pass comes into view,
 * the beam sweeps it, the frame locks on, and the result the scanner really
 * shows slides in — the name, who they have brought — while the count moves on
 * by the two people who just walked in. See components/checkin/.
 *
 * The tick is marigold because the scanner's is: the product's success colour
 * is the accent, and there is no green anywhere in it.
 */
export default function CheckinDemo(): ReactElement {
  return (
    <DemoPhone className={styles.stage}>
      <div className={styles.content}>
        <div className={styles.counter}>
          <p className={styles.arrived}>
            <span className={styles.window}>
              <span className={styles.digits}>
                <span>86</span>
                <span>88</span>
              </span>
            </span>
            <span className={styles.expected}>/ 140</span>
            <span className={styles.word}>arrived</span>
          </p>
          <span className={styles.bar}>
            <span className={styles.fill} />
          </span>
        </div>

        <div className={styles.viewfinder}>
          <div className={styles.pass}>
            <svg
              viewBox="-2 -2 29 29"
              shapeRendering="crispEdges"
              className={styles.qr}
            >
              <rect x={-2} y={-2} width={29} height={29} fill="#ffffff" />
              <path d={QR_PATH} fill="#111111" />
            </svg>
            <p className={styles.passName}>Rohan Mehta</p>
          </div>

          <span className={styles.beam} />

          <span className={styles.brackets}>
            <span className={`${styles.corner} ${styles.topLeft}`} />
            <span className={`${styles.corner} ${styles.topRight}`} />
            <span className={`${styles.corner} ${styles.bottomLeft}`} />
            <span className={`${styles.corner} ${styles.bottomRight}`} />
          </span>
        </div>

        <div className={styles.result}>
          {/* The scanner's own success mark, from CheckinResult. */}
          <svg
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={styles.mark}
          >
            <path d="M32 5 Q59 5 59 32 Q59 59 32 59 Q5 59 5 32 Q5 5 32 5 Z" />
            <path d="M19 33 Q26 37 29 44 Q37 26 46 20" />
          </svg>
          <div className={styles.who}>
            <p className={styles.guest}>Rohan Mehta</p>
            <p className={styles.party}>+1 with them</p>
          </div>
        </div>
      </div>
    </DemoPhone>
  );
}
