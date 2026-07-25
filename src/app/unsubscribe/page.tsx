"use client";

import { AlertTriangle, CheckCircle2, GraduationCap, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const TYPE_LABELS: Record<string, string> = {
  daily: "lembrete diário",
  weekly: "relatório semanal",
  overdue: "alerta de revisões atrasadas",
};

type Status = "loading" | "success" | "error";

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const type = searchParams.get("type");
  const [status, setStatus] = useState<Status>(() => (!token || !type ? "error" : "loading"));
  const [errorMessage, setErrorMessage] = useState<string | null>(() => (!token || !type ? "Link inválido." : null));

  useEffect(() => {
    if (!token || !type) return;

    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/unsubscribe?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}`)
      .then(async (res) => {
        if (cancelled) return;
        const body = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !body.ok) {
          setStatus("error");
          setErrorMessage(body.error ?? "Não foi possível processar o pedido.");
          return;
        }
        setStatus("success");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage("Não foi possível processar o pedido.");
      });

    return () => {
      cancelled = true;
    };
  }, [token, type]);

  const typeLabel = type ? (TYPE_LABELS[type] ?? type) : "";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-muted/30 p-4">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
        <GraduationCap className="h-6 w-6 text-primary" />
        ConcursoFlow
      </Link>
      <div className="w-full max-w-sm">
        <Card>
          <CardHeader className="items-center text-center">
            {status === "loading" ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : status === "success" ? (
              <CheckCircle2 className="h-8 w-8 text-primary" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-destructive" />
            )}
            <CardTitle>
              {status === "loading" && "Processando…"}
              {status === "success" && "Inscrição cancelada"}
              {status === "error" && "Não foi possível cancelar"}
            </CardTitle>
            <CardDescription>
              {status === "loading" && "Só um instante."}
              {status === "success" && `Você não vai mais receber o ${typeLabel}. Pode reativar a qualquer momento no seu Perfil.`}
              {status === "error" && errorMessage}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/" className="text-sm text-primary hover:underline">
              Voltar para o ConcursoFlow
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
