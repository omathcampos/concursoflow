import { GraduationCap } from "lucide-react";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

/** Opções compartilhadas entre o layout de docs e (se um dia precisar) uma home própria de /docs. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="flex items-center gap-2 font-semibold">
          <GraduationCap className="h-5 w-5 text-primary" />
          ConcursoFlow
        </span>
      ),
      url: "/",
    },
    links: [
      {
        text: "Abrir o app",
        url: "/",
      },
    ],
    githubUrl: "https://github.com/omathcampos/concursoflow",
  };
}
