"use client";

import { AlertTriangle, GraduationCap, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        <GraduationCap className="h-6 w-6 text-primary" />
        ConcursoFlow
      </Link>
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <CardTitle>Algo deu errado</CardTitle>
          <CardDescription>Encontramos um problema inesperado. Você pode tentar de novo ou voltar ao início.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center gap-2">
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="h-4 w-4" />
            Tentar de novo
          </Button>
          <Link href="/" className={buttonVariants({})}>
            Início
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
