import { GraduationCap } from "lucide-react";
import Link from "next/link";

import { ExamCountdown } from "@/components/layout/exam-countdown";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";

export function AppHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-4 sm:px-6">
      <MobileNav />
      <Link href="/" className="flex items-center gap-2 font-semibold md:hidden">
        <GraduationCap className="h-5 w-5 text-primary" />
        <span>ConcursoFlow</span>
      </Link>
      <div className="ml-auto flex items-center gap-3">
        <ExamCountdown />
        <ThemeToggle />
      </div>
    </header>
  );
}
