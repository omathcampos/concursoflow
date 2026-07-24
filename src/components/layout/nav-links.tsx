"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { countReviewsDueToday } from "@/lib/domain/reviews";
import { useRepo } from "@/lib/data/use-repo";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const repo = useRepo();
  const reviewsDueToday = countReviewsDueToday(repo.reviews.list());

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href;
        const badge = href === "/revisoes" && reviewsDueToday > 0 ? reviewsDueToday : null;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-theme",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
            {badge !== null ? (
              <span
                className={cn(
                  "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
                  isActive ? "bg-sidebar-primary-foreground/20" : "bg-primary text-primary-foreground",
                )}
              >
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
