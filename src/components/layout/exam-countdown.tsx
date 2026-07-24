import { Hourglass } from "lucide-react";

// Placeholder — a contagem real depende da data da prova, definida no perfil
// do usuário (Fase 8, Auth). Por enquanto exibe um estado vazio estável.
export function ExamCountdown() {
  return (
    <div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground sm:flex">
      <Hourglass className="h-4 w-4" />
      <span>Defina a data da prova</span>
    </div>
  );
}
