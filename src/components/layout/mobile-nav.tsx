"use client";

import { GraduationCap, Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="outline" size="icon" className="md:hidden" aria-label="Abrir menu">
            <Menu className="h-5 w-5" />
          </Button>
        }
      />
      <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
        <SheetHeader className="h-16 justify-center border-b border-sidebar-border px-6">
          <SheetTitle
            render={
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 font-semibold text-sidebar-foreground"
              >
                <GraduationCap className="h-5 w-5 text-primary" />
                <span>ConcursoFlow</span>
              </Link>
            }
          />
        </SheetHeader>
        <div className="px-3 py-2">
          <NavLinks onNavigate={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
