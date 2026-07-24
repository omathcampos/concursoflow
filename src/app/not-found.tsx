import { GraduationCap, SearchX } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        <GraduationCap className="h-6 w-6 text-primary" />
        ConcursoFlow
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SearchX className="h-5 w-5" />
          </div>
          <CardTitle>Página não encontrada</CardTitle>
          <CardDescription>O endereço que você tentou acessar não existe ou foi movido.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/" className={buttonVariants({})}>
            Voltar para o início
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
