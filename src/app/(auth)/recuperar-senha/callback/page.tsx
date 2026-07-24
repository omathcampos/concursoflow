"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/data/supabase/client";

export default function RecuperarSenhaCallbackPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const client = getSupabaseBrowserClient();
    client.auth.getSession().then(({ data }) => {
      setHasRecoverySession(Boolean(data.session));
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres");
      return;
    }

    setError(null);
    setLoading(true);
    const client = getSupabaseBrowserClient();
    const { error: updateError } = await client.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setDone(true);
    setTimeout(() => router.push("/"), 1500);
  }

  if (checking) return null;

  if (done) {
    return (
      <Card>
        <CardHeader className="items-center text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <CardTitle>Senha atualizada</CardTitle>
          <CardDescription>Redirecionando…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!hasRecoverySession) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Link inválido ou expirado</CardTitle>
          <CardDescription>Solicite um novo link de redefinição de senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/recuperar-senha" className="text-sm text-primary hover:underline">
            Solicitar novo link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova senha</CardTitle>
        <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-password">Nova senha</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Salvando…" : "Salvar nova senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
