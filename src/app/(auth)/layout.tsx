import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        <GraduationCap className="h-6 w-6 text-primary" />
        ConcursoFlow
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
