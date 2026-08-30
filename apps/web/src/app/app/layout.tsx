import type { ReactNode } from "react";

import { AppLayoutShell } from "@/components/app-layout-shell";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AppLayoutShell>{children}</AppLayoutShell>;
}
