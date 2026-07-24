import { LayoutDashboard } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function DashboardPage() {
  return (
    <PlaceholderPage
      title="Dashboard"
      description="Visão geral do seu progresso."
      icon={LayoutDashboard}
      comingSoon="Horas por matéria, evolução semanal, % de acerto, distribuição por tipo de estudo e streak de dias consecutivos."
    />
  );
}
