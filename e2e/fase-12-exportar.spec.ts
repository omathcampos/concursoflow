import { expect, test, type Page } from "@playwright/test";

/**
 * Roda contra o modo `local` (padrão de `npm run e2e`/CI, sem login) — a
 * seção de assinatura por URL exige o backend Supabase de verdade e mostra
 * uma mensagem amigável nesse modo (mesmo padrão da fase 10). O download do
 * .ics não depende de backend nenhum — é gerado inteiramente no client a
 * partir dos dados já carregados no repo, então é testável direto em modo
 * local.
 */

async function createSubject(page: Page, name: string) {
  await page.goto("/materias");
  await page.getByRole("button", { name: "Nova matéria" }).first().click();
  await page.getByLabel("Nome").fill(name);
  await page.getByRole("button", { name: "Criar matéria" }).click();
  await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
}

function todayColumn(page: Page) {
  const today = new Date().toISOString().slice(0, 10);
  return page.locator(`[data-testid="calendar-column-${today}"]`);
}

async function createBlockAt(page: Page, subjectName: string, hour: number) {
  await page.goto("/calendario");
  await todayColumn(page).click({ position: { x: 20, y: ((hour - 5) * 60) * (28 / 30) + 4 } });
  const dialog = page.getByRole("dialog", { name: "Novo bloco de estudo" });
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: subjectName }).click();
  await dialog.getByRole("button", { name: "Criar bloco" }).click();
  await expect(dialog).not.toBeVisible();
}

test("dialog Exportar abre e mostra aviso de indisponibilidade da URL em modo local", async ({ page }) => {
  await page.goto("/calendario");
  await page.getByRole("button", { name: "Exportar" }).click();

  const dialog = page.getByRole("dialog", { name: "Exportar calendário" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("Isso exige o backend Supabase")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Baixar .ics" })).toBeVisible();

  await dialog.getByRole("button", { name: "Fechar" }).click();
  await expect(dialog).not.toBeVisible();
});

test("baixar .ics gera um arquivo válido com o bloco do período visível", async ({ page }) => {
  await createSubject(page, "Português E2E Export");
  await createBlockAt(page, "Português E2E Export", 10);

  await page.getByRole("button", { name: "Exportar" }).click();
  const dialog = page.getByRole("dialog", { name: "Exportar calendário" });
  await expect(dialog).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Baixar .ics" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe("concursoflow.ics");
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const content = Buffer.concat(chunks).toString("utf-8");

  expect(content).toContain("BEGIN:VCALENDAR");
  expect(content).toContain("END:VCALENDAR");
  expect(content).toContain("Português E2E Export");
});
