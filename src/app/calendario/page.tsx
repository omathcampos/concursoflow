import { CalendarDays } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function CalendarioPage() {
  return (
    <PlaceholderPage
      title="Calendário"
      description="Organize sua semana de estudos."
      icon={CalendarDays}
      comingSoon="Vista semanal e mensal com blocos de estudo que você arrasta, redimensiona e reagenda livremente."
    />
  );
}
