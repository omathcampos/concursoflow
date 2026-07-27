"use client";

import { useTheme } from "next-themes";
import { useEffect, useId, useRef, useState } from "react";

/** Renderiza um diagrama Mermaid a partir do código-fonte (bloco ```mermaid nos .mdx, convertido pelo remark-mdx-mermaid). Reage à troca de tema claro/escuro do próprio app. */
export function Mermaid({ chart }: { chart: string }) {
  const { resolvedTheme } = useTheme();
  const id = useId().replace(/:/g, "-");
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("mermaid")
      .then(async ({ default: mermaid }) => {
        mermaid.initialize({
          startOnLoad: false,
          theme: resolvedTheme === "dark" ? "dark" : "default",
          fontFamily: "inherit",
        });
        const { svg: rendered } = await mermaid.render(`mermaid-${id}`, chart);
        if (!cancelled) setSvg(rendered);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [chart, id, resolvedTheme]);

  return (
    <div ref={containerRef} data-testid="mermaid-diagram" className="my-4 flex justify-center overflow-x-auto rounded-lg border bg-card p-4">
      {error ? (
        <pre className="w-full whitespace-pre-wrap text-sm text-destructive">Erro ao renderizar o diagrama: {error}</pre>
      ) : svg ? (
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <p className="text-sm text-muted-foreground">Renderizando diagrama…</p>
      )}
    </div>
  );
}
