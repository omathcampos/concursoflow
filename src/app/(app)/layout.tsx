import { AppShell } from "@/components/layout/app-shell";
import { DataProvider } from "@/components/providers/data-provider";

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return (
    <DataProvider>
      <AppShell>{children}</AppShell>
    </DataProvider>
  );
}
