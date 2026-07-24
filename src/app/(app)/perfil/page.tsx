"use client";

import { Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSupabaseBrowserClient } from "@/lib/data/supabase/client";
import { useSupabaseCache } from "@/lib/data/supabase/cache-store";
import { useRepo } from "@/lib/data/use-repo";
import { initialsFor } from "@/lib/domain/profile-display";

export default function PerfilPage() {
  const repo = useRepo();
  const router = useRouter();
  const profile = repo.profile.get();
  const email = useSupabaseCache((s) => s.userEmail);

  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [targetExam, setTargetExam] = useState(profile.targetExam ?? "");
  const [examDate, setExamDate] = useState(profile.examDate ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await repo.profile.update({
        displayName: displayName.trim() || null,
        targetExam: targetExam.trim() || null,
        examDate: examDate || null,
      });
      toast.success("Perfil atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível salvar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    const client = getSupabaseBrowserClient();
    await client.auth.signOut();
    toast.success("Até logo!");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="mt-1 text-muted-foreground">Seus dados e preferências de conta.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar size="lg">
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">{initialsFor(profile.displayName, email)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>Dados pessoais</CardTitle>
            <CardDescription>Nome de exibição e informações do concurso.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-nome">Nome de exibição</Label>
            <Input id="perfil-nome" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Como podemos te chamar?" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-email">Email</Label>
            <Input id="perfil-email" value={email ?? ""} disabled readOnly />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-concurso">Concurso-alvo</Label>
            <Input id="perfil-concurso" value={targetExam} onChange={(e) => setTargetExam(e.target.value)} placeholder="Ex: TRT-15" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="perfil-data-prova">Data da prova</Label>
            <input
              id="perfil-data-prova"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="h-8 w-fit rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>
          <div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conta</CardTitle>
          <CardDescription>Encerrar sua sessão neste dispositivo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>Lembretes por email e Telegram chegam na fase 10 — em breve por aqui.</CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}
