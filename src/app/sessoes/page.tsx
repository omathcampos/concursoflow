import { Timer } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function SessoesPage() {
  return (
    <PlaceholderPage
      title="Sessões"
      description="Registre o que você estudou."
      icon={Timer}
      comingSoon="Registro manual ou via cronômetro: questões feitas, páginas lidas e comentários."
    />
  );
}
