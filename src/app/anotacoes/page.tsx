import { StickyNote } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function AnotacoesPage() {
  return (
    <PlaceholderPage
      title="Anotações"
      description="Seu caderno de anotações em markdown."
      icon={StickyNote}
      comingSoon="Anotações avulsas ou vinculadas a matérias e tópicos, com busca, filtro e preview em markdown."
    />
  );
}
