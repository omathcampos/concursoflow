"use client";

import { Bell, Copy, Link2, LogOut, Send, Unlink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { getSupabaseBrowserClient } from "@/lib/data/supabase/client";
import { useSupabaseCache } from "@/lib/data/supabase/cache-store";
import { useRepo } from "@/lib/data/use-repo";
import { initialsFor } from "@/lib/domain/profile-display";
import type { NotificationPrefs } from "@/lib/data/types";

const TELEGRAM_BOT_USERNAME = "ConcursoFlow_bot";

const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "Brasília (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)" },
  { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
  { value: "America/Noronha", label: "Fernando de Noronha (GMT-2)" },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const TEST_TYPES = [
  { type: "daily" as const, label: "Diário" },
  { type: "weekly" as const, label: "Semanal" },
  { type: "overdue" as const, label: "Atrasadas" },
];

export default function PerfilPage() {
  const repo = useRepo();
  const router = useRouter();
  const profile = repo.profile.get();
  const email = useSupabaseCache((s) => s.userEmail);

  const [displayName, setDisplayName] = useState(profile.displayName ?? "");
  const [targetExam, setTargetExam] = useState(profile.targetExam ?? "");
  const [examDate, setExamDate] = useState(profile.examDate ?? "");
  const [saving, setSaving] = useState(false);

  const notificationPrefs = repo.notifications.get();
  const [linkCode, setLinkCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [linking, setLinking] = useState(false);
  const [checkingLink, setCheckingLink] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [testingType, setTestingType] = useState<"daily" | "weekly" | "overdue" | null>(null);

  function toastError(err: unknown, fallback: string) {
    toast.error(err instanceof Error ? err.message : fallback);
  }

  async function handleTogglePref(patch: Partial<Pick<NotificationPrefs, "dailyEnabled" | "weeklyEnabled" | "overdueEnabled" | "channelEmail">>) {
    try {
      await repo.notifications.update(patch);
    } catch (err) {
      toastError(err, "Não foi possível salvar as preferências de notificação.");
    }
  }

  async function handleDailyHourChange(value: string | null) {
    if (value === null) return;
    try {
      await repo.notifications.update({ dailyHour: Number(value) });
    } catch (err) {
      toastError(err, "Não foi possível salvar o horário do lembrete.");
    }
  }

  async function handleTimezoneChange(value: string | null) {
    if (value === null) return;
    try {
      await repo.notifications.update({ timezone: value });
    } catch (err) {
      toastError(err, "Não foi possível salvar o fuso horário.");
    }
  }

  async function handleGenerateLinkCode() {
    setLinking(true);
    try {
      const result = await repo.notifications.generateTelegramLinkCode();
      setLinkCode(result);
    } catch (err) {
      toastError(err, "Não foi possível gerar o código de vínculo do Telegram.");
    } finally {
      setLinking(false);
    }
  }

  async function handleCheckLink() {
    setCheckingLink(true);
    try {
      const updated = await repo.notifications.refreshTelegramLink();
      if (updated.telegramChatId) {
        setLinkCode(null);
        toast.success("Telegram vinculado com sucesso!");
      } else {
        toast.info("Ainda não vinculado. Envie /start com o código no bot e tente de novo.");
      }
    } catch (err) {
      toastError(err, "Não foi possível checar o status do vínculo do Telegram.");
    } finally {
      setCheckingLink(false);
    }
  }

  async function handleUnlink() {
    setUnlinking(true);
    try {
      await repo.notifications.unlinkTelegram();
      toast.success("Telegram desvinculado.");
    } catch (err) {
      toastError(err, "Não foi possível desvincular o Telegram.");
    } finally {
      setUnlinking(false);
    }
  }

  async function handleSendTest(type: "daily" | "weekly" | "overdue") {
    setTestingType(type);
    try {
      const result = await repo.notifications.sendTest(type);
      if ("skipped" in result) toast.info(`Nada para enviar agora (sem conteúdo ou fora do horário).`);
      else toast.success("Notificação de teste enviada — confira seu email/Telegram.");
    } catch (err) {
      toastError(err, "Não foi possível enviar a notificação de teste.");
    } finally {
      setTestingType(null);
    }
  }

  async function handleCopyLink(code: string) {
    await navigator.clipboard.writeText(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`);
    toast.success("Link copiado.");
  }

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
            <CardDescription>Lembrete diário, relatório semanal e alerta de revisões atrasadas, por email e/ou Telegram.</CardDescription>
          </div>
        </CardHeader>
        {!notificationPrefs ? (
          <CardContent>
            <p className="text-sm text-muted-foreground">Carregando preferências…</p>
          </CardContent>
        ) : (
          <CardContent className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Lembrete diário</p>
                  <p className="text-sm text-muted-foreground">Blocos de hoje e revisões pendentes.</p>
                </div>
                <Switch
                  aria-label="Lembrete diário"
                  checked={notificationPrefs.dailyEnabled}
                  onCheckedChange={(checked) => handleTogglePref({ dailyEnabled: checked })}
                />
              </div>
              {notificationPrefs.dailyEnabled ? (
                <div className="ml-0 flex flex-col gap-1.5 sm:ml-4">
                  <Label htmlFor="perfil-notif-hora">Horário do lembrete</Label>
                  <Select value={String(notificationPrefs.dailyHour)} onValueChange={handleDailyHourChange}>
                    <SelectTrigger id="perfil-notif-hora" className="w-32">
                      <SelectValue placeholder="Horário">{(value: string) => `${value.padStart(2, "0")}:00`}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {HOURS.map((hour) => (
                        <SelectItem key={hour} value={String(hour)}>
                          {String(hour).padStart(2, "0")}:00
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Relatório semanal</p>
                  <p className="text-sm text-muted-foreground">Domingos: horas estudadas, acerto e streak.</p>
                </div>
                <Switch
                  aria-label="Relatório semanal"
                  checked={notificationPrefs.weeklyEnabled}
                  onCheckedChange={(checked) => handleTogglePref({ weeklyEnabled: checked })}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">Alerta de atrasadas</p>
                  <p className="text-sm text-muted-foreground">Revisões vencidas há 2+ dias (no máx. a cada 3 dias).</p>
                </div>
                <Switch
                  aria-label="Alerta de atrasadas"
                  checked={notificationPrefs.overdueEnabled}
                  onCheckedChange={(checked) => handleTogglePref({ overdueEnabled: checked })}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="perfil-notif-fuso">Fuso horário</Label>
              <Select value={notificationPrefs.timezone} onValueChange={handleTimezoneChange}>
                <SelectTrigger id="perfil-notif-fuso" className="w-full sm:w-64">
                  <SelectValue placeholder="Fuso horário">
                    {(value: string) => TIMEZONES.find((tz) => tz.value === value)?.label ?? value}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 border-t pt-4">
              <p className="text-sm font-medium">Canais</p>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">Email ({email ?? "—"})</p>
                <Switch
                  aria-label="Notificações por email"
                  checked={notificationPrefs.channelEmail}
                  onCheckedChange={(checked) => handleTogglePref({ channelEmail: checked })}
                />
              </div>

              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between gap-4">
                  <p className="text-sm text-muted-foreground">
                    Telegram {notificationPrefs.channelTelegram && notificationPrefs.telegramChatId ? "— vinculado ✅" : "— não vinculado"}
                  </p>
                  {notificationPrefs.channelTelegram && notificationPrefs.telegramChatId ? (
                    <Button variant="outline" size="sm" onClick={handleUnlink} disabled={unlinking}>
                      <Unlink className="h-4 w-4" />
                      {unlinking ? "Desvinculando…" : "Desvincular"}
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={handleGenerateLinkCode} disabled={linking}>
                      <Link2 className="h-4 w-4" />
                      {linking ? "Gerando…" : "Vincular Telegram"}
                    </Button>
                  )}
                </div>
                {linkCode ? (
                  <div className="flex flex-col gap-2 rounded-md bg-muted/50 p-3 text-sm">
                    <p>
                      Abra o Telegram e envie <code className="rounded bg-muted px-1 py-0.5">/start {linkCode.code}</code> para{" "}
                      <span className="font-medium">@{TELEGRAM_BOT_USERNAME}</span>, ou use o link abaixo:
                    </p>
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${linkCode.code}`}
                        target="_blank"
                        rel="noreferrer"
                        className="truncate text-primary hover:underline"
                      >
                        t.me/{TELEGRAM_BOT_USERNAME}?start={linkCode.code}
                      </a>
                      <Button variant="ghost" size="sm" onClick={() => handleCopyLink(linkCode.code)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <Button variant="secondary" size="sm" onClick={handleCheckLink} disabled={checkingLink}>
                        {checkingLink ? "Checando…" : "Já vinculei, atualizar status"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <p className="text-sm font-medium">Enviar agora (teste)</p>
              <p className="text-sm text-muted-foreground">Dispara pelos canais habilitados, só para você.</p>
              <div className="flex flex-wrap gap-2">
                {TEST_TYPES.map(({ type, label }) => (
                  <Button key={type} variant="outline" size="sm" onClick={() => handleSendTest(type)} disabled={testingType !== null}>
                    <Send className="h-4 w-4" />
                    {testingType === type ? "Enviando…" : label}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
