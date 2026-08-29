import type { ReactNode } from "react";

import { AppHeader } from "../../components/app-header";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <AppHeader />
      <main className="flex-1 py-8">{children}</main>
    </div>
  );
}
