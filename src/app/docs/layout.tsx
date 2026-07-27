import { DocsLayout } from "fumadocs-ui/layouts/docs";
import { RootProvider } from "fumadocs-ui/provider/next";

import { baseOptions } from "@/lib/docs-layout-shared";
import { source } from "@/lib/source";

// `theme.enabled: false` — o app já tem next-themes no layout raiz
// (attribute="class" no <html>); deixar o Fumadocs gerenciar o seu próprio
// duplicaria o provider e poderia dessincronizar o toggle claro/escuro.
export default function DocsRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootProvider theme={{ enabled: false }}>
      <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
