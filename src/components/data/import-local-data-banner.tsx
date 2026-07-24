"use client";

import { DatabaseZap, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDataSource } from "@/lib/data/data-source";
import { countLocalRecords, importLocalDataToSupabase, readLocalSnapshot } from "@/lib/data/supabase/import-local-data";
import { useSupabaseCache } from "@/lib/data/supabase/cache-store";
import { getSupabaseBrowserClient } from "@/lib/data/supabase/client";

/**
 * Aparece só quando: rodando com Supabase, o servidor ainda não tem
 * nenhuma matéria (senão a importação é recusada, idempotente) e há dados
 * de uma sessão local anterior (fases 1-6) neste navegador para trazer.
 */
export function ImportLocalDataBanner() {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const subjectsInSupabase = useSupabaseCache((s) => s.subjects.length);
  const cacheReady = useSupabaseCache((s) => s.status === "ready");
  const userId = useSupabaseCache((s) => s.userId);

  if (getDataSource() !== "supabase") return null;
  if (!cacheReady || subjectsInSupabase > 0) return null;

  const localSnapshot = readLocalSnapshot();
  const localCount = localSnapshot ? countLocalRecords(localSnapshot) : 0;
  if (localCount === 0) return null;

  async function handleImport() {
    if (!userId) return;
    setImporting(true);
    try {
      const client = getSupabaseBrowserClient();
      const summary = await importLocalDataToSupabase(client, userId);
      const total = Object.values(summary).reduce((sum, n) => sum + n, 0);
      toast.success(`Importação concluída: ${total} registros trazidos para o servidor.`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível importar os dados locais.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <Card className="border-primary/40 bg-primary/5">
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <DatabaseZap className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <CardTitle>Dados de uma sessão local encontrados</CardTitle>
            <CardDescription>
              Este navegador tem {localCount} registro(s) salvos localmente (de antes do Supabase). Importar para o servidor?
            </CardDescription>
          </div>
          <Button onClick={() => setOpen(true)}>Importar dados locais</Button>
        </CardHeader>
        <CardContent />
      </Card>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Importar dados locais?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso copia matérias, tópicos, ciclo, blocos, sessões, revisões e anotações deste navegador para o seu servidor Supabase. Só
              funciona uma vez — se o servidor já tiver matérias, a importação é recusada para não duplicar dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={importing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Importar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
