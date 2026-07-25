import { expect, test } from "@playwright/test";

/**
 * Roda contra o modo `local` (padrão de `npm run e2e`/CI, sem login) — a
 * página de Perfil renderiza a seção de Notificações com um stub local
 * (toggles funcionam, mas Telegram/envio de teste exigem o backend Supabase
 * de verdade e mostram um erro amigável). O envio real dos 3 tipos (email e
 * Telegram) é validado manualmente contra o projeto Supabase — não é
 * automatizável em CI sem credenciais reais de um bot/inbox.
 */

test("/unsubscribe sem token/type mostra link inválido sem chamar rede", async ({ page }) => {
  await page.goto("/unsubscribe");
  await expect(page.getByText("Não foi possível cancelar")).toBeVisible();
  await expect(page.getByText("Link inválido.")).toBeVisible();
});

test.describe("seção de Notificações no Perfil", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/perfil");
    await expect(page.getByText("Notificações", { exact: true })).toBeVisible();
  });

  test("toggles refletem os defaults e o horário some quando o lembrete diário é desligado", async ({ page }) => {
    const dailySwitch = page.getByRole("switch", { name: "Lembrete diário" });
    await expect(dailySwitch).toBeVisible();
    await expect(dailySwitch).toHaveAttribute("aria-checked", "true");
    await expect(page.getByLabel("Horário do lembrete")).toBeVisible();

    await dailySwitch.click();
    await expect(dailySwitch).toHaveAttribute("aria-checked", "false");
    await expect(page.getByLabel("Horário do lembrete")).toHaveCount(0);

    await dailySwitch.click();
    await expect(dailySwitch).toHaveAttribute("aria-checked", "true");
    await expect(page.getByLabel("Horário do lembrete")).toBeVisible();
  });

  test("vincular Telegram e enviar teste avisam que exigem o backend Supabase (modo local)", async ({ page }) => {
    await page.getByRole("button", { name: "Vincular Telegram" }).click();
    await expect(page.getByText("exigem o backend Supabase").first()).toBeVisible();

    await page.getByRole("button", { name: "Diário", exact: true }).click();
    await expect(page.getByText("exigem o backend Supabase").last()).toBeVisible();
  });
});
