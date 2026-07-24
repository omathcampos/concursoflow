import { expect, test, type Page } from "@playwright/test";
import { format } from "date-fns";

async function createSubject(page: Page, name: string) {
  await page.goto("/materias");
  await page.getByRole("button", { name: "Nova matéria" }).first().click();
  await page.getByLabel("Nome").fill(name);
  await page.getByRole("button", { name: "Criar matéria" }).click();
  await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
}

function todayColumn(page: Page) {
  const today = format(new Date(), "yyyy-MM-dd");
  return page.locator(`[data-testid="calendar-column-${today}"]`);
}

test("registra sessão manual com questões e calcula % de acerto ao vivo", async ({ page }) => {
  await createSubject(page, "Direito Penal");
  await page.goto("/sessoes");

  await page.getByRole("button", { name: "Nova sessão" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova sessão" });
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Direito Penal" }).click();

  await dialog.getByRole("combobox").nth(2).click();
  await page.getByRole("option", { name: "Questões" }).click();

  await dialog.locator("#session-questions-total").fill("20");
  await dialog.locator("#session-questions-correct").fill("15");
  await expect(dialog.getByText("(75%)")).toBeVisible();

  await dialog.getByRole("button", { name: "Salvar" }).click();

  const main = page.getByRole("main");
  await expect(main.getByText("Direito Penal")).toBeVisible();
  await expect(main.getByText("75% de acerto")).toBeVisible();
});

test("cronômetro: iniciar, parar e abrir formulário pré-preenchido; sessão soma no ciclo", async ({ page }) => {
  await createSubject(page, "Contabilidade");
  await page.goto("/ciclo");
  await page.getByRole("button", { name: "Montar ciclo" }).click();
  await page.getByRole("checkbox", { name: "Contabilidade" }).click();
  await page.getByRole("spinbutton").first().fill("0.5");
  await page.getByRole("button", { name: "Salvar ciclo" }).click();

  await page.getByRole("combobox", { name: "Matéria do cronômetro" }).click();
  await page.getByRole("option", { name: "Contabilidade" }).click();
  await page.getByRole("button", { name: "Iniciar" }).click();

  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
  await page.waitForTimeout(1_200);
  await page.getByRole("button", { name: "Parar" }).click();

  const dialog = page.getByRole("dialog", { name: "Registrar sessão do cronômetro" });
  await expect(dialog.getByRole("combobox").first()).toContainText("Contabilidade");
  await dialog.getByRole("button", { name: "Salvar" }).click();

  await page.goto("/sessoes");
  await expect(page.getByRole("main").getByText("Contabilidade")).toBeVisible();
});

test("concluir bloco do calendário gera sessão vinculada e o bloco mostra Concluído", async ({ page }) => {
  await createSubject(page, "Auditoria");
  await page.goto("/calendario");
  await todayColumn(page).click({ position: { x: 20, y: 200 } });

  const createDialog = page.getByRole("dialog", { name: "Novo bloco de estudo" });
  await createDialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Auditoria" }).click();
  await createDialog.getByRole("button", { name: "Criar bloco" }).click();

  await page.getByRole("button", { name: /Auditoria/ }).click();
  const detailsDialog = page.getByRole("dialog", { name: "Auditoria" });
  await detailsDialog.getByRole("button", { name: "Concluído" }).click();

  const sessionDialog = page.getByRole("dialog", { name: "Concluir bloco — registrar sessão" });
  await expect(sessionDialog.getByRole("combobox").first()).toContainText("Auditoria");
  await sessionDialog.getByRole("button", { name: "Salvar" }).click();

  await page.getByRole("button", { name: /Auditoria/ }).click();
  await expect(page.getByText("Sessão registrada para este bloco.")).toBeVisible();
  await expect(page.getByText("Concluído")).toBeVisible();
});

test("filtros da lista de sessões funcionam combinados", async ({ page }) => {
  await createSubject(page, "Alfa");
  await createSubject(page, "Beta");

  await page.goto("/sessoes");

  for (const { name, type } of [
    { name: "Alfa", type: "Teoria" },
    { name: "Beta", type: "Questões" },
  ]) {
    await page.getByRole("button", { name: "Nova sessão" }).click();
    const dialog = page.getByRole("dialog", { name: "Nova sessão" });
    await dialog.getByRole("combobox").first().click();
    await page.getByRole("option", { name, exact: true }).click();
    if (type === "Questões") {
      await dialog.getByRole("combobox").nth(2).click();
      await page.getByRole("option", { name: "Questões" }).click();
    }
    await dialog.getByRole("button", { name: "Salvar" }).click();
  }

  const main = page.getByRole("main");
  // Nome da matéria no card da sessão (classe própria, evita colidir com os selects de filtro).
  const sessionRow = (name: string) => main.locator(".font-medium", { hasText: name });

  await expect(sessionRow("Alfa")).toBeVisible();
  await expect(sessionRow("Beta")).toBeVisible();

  const subjectFilter = main.getByRole("combobox").first();
  await subjectFilter.click();
  await page.getByRole("option", { name: "Alfa", exact: true }).click();

  await expect(sessionRow("Alfa")).toBeVisible();
  await expect(sessionRow("Beta")).toHaveCount(0);

  await subjectFilter.click();
  await page.getByRole("option", { name: "Todas as matérias" }).click();

  const typeFilter = main.getByRole("combobox").nth(1);
  await typeFilter.click();
  await page.getByRole("option", { name: "Questões", exact: true }).click();

  await expect(sessionRow("Beta")).toBeVisible();
  await expect(sessionRow("Alfa")).toHaveCount(0);
});
