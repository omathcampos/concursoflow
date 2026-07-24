"use client";

import { BookOpen, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsSeeded, useLoadSeed } from "@/lib/data/use-repo";
import { countLocalRecords, readLocalSnapshot } from "@/lib/data/supabase/import-local-data";

/** Boas-vindas para conta nova de verdade — sem matérias e sem dados locais para importar (senão o banner de importação assume). */
export function WelcomeOnboarding() {
  const isSeeded = useIsSeeded();
  const loadSeed = useLoadSeed();
  // localStorage só existe no cliente — ler em useEffect (não no corpo do
  // componente) evita divergir do HTML gerado no servidor (hydration mismatch).
  const [hasLocalDataToImport, setHasLocalDataToImport] = useState(false);

  useEffect(() => {
    function checkLocalData() {
      const localSnapshot = readLocalSnapshot();
      setHasLocalDataToImport(localSnapshot ? countLocalRecords(localSnapshot) > 0 : false);
    }
    checkLocalData();
  }, []);

  if (isSeeded || hasLocalDataToImport) return null;

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardHeader>
        <CardTitle>Bem-vindo(a) ao ConcursoFlow! 🎉</CardTitle>
        <CardDescription>Vamos organizar seus estudos. Comece criando sua primeira matéria ou carregue dados de exemplo para explorar o app.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Link href="/materias" className={buttonVariants({})}>
          <BookOpen className="h-4 w-4" />
          Criar minha primeira matéria
        </Link>
        <Button variant="outline" onClick={loadSeed}>
          <Sparkles className="h-4 w-4" />
          Carregar dados de exemplo
        </Button>
      </CardContent>
    </Card>
  );
}
