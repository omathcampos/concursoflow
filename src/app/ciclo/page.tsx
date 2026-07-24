import { RefreshCw } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function CicloPage() {
  return (
    <PlaceholderPage
      title="Ciclo"
      description="Defina o rodízio de matérias."
      icon={RefreshCw}
      comingSoon="Horas-alvo por matéria e sugestão automática da próxima matéria a estudar, ponderada pelo peso do edital."
    />
  );
}
