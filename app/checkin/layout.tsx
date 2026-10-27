import type { ReactNode } from "react";
import PaperTheme from "@/components/theme/PaperTheme";

/** The door's check-in screens, opened from a check-in link, in the light theme (DESIGN.md). */
export default function CheckinLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <PaperTheme>{children}</PaperTheme>;
}
