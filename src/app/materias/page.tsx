import { BookOpen } from "lucide-react";

import { PlaceholderPage } from "@/components/layout/placeholder-page";

export default function MateriasPage() {
  return (
    <PlaceholderPage
      title="Matérias"
      description="Cadastre suas matérias e tópicos."
      icon={BookOpen}
      comingSoon="CRUD de matérias com cor, peso e tópicos do edital verticalizado."
    />
  );
}
