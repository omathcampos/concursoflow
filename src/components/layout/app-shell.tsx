import type { ReactNode } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TimerWidget } from "@/components/sessions/timer-widget";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
      <TimerWidget />
    </div>
  );
}
