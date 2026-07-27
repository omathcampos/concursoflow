import { BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";

import { NavLinks } from "@/components/layout/nav-links";

export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:flex md:flex-col">
      <div className="flex h-16 items-center gap-2 px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span>ConcursoFlow</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <NavLinks />
      </div>
      <div className="border-t border-sidebar-border px-3 py-2">
        <Link
          href="/docs"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground transition-theme hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          Documentação
        </Link>
      </div>
    </aside>
  );
}
