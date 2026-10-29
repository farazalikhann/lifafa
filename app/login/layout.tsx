import type { ReactNode } from "react";
import PaperTheme from "@/components/theme/PaperTheme";

/** The sign in screen, in the light theme (DESIGN.md). */
export default function LoginLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <PaperTheme>{children}</PaperTheme>;
}
