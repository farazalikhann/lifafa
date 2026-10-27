import type { ReactNode } from "react";
import PaperTheme from "@/components/theme/PaperTheme";

/** Sign in and the email code screens, in the light theme (DESIGN.md). */
export default function LoginLayout({
  children,
}: {
  children: ReactNode;
}): ReactNode {
  return <PaperTheme>{children}</PaperTheme>;
}
