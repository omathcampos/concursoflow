import { BarChart3 } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

interface ChartEmptyStateProps {
  message: string;
}

export function ChartEmptyState({ message }: ChartEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <BarChart3 className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Link href="/sessoes" className={buttonVariants({ size: "sm", variant: "outline" })}>
        Registrar sessão
      </Link>
    </div>
  );
}
