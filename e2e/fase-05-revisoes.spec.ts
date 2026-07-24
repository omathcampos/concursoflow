import { expect, test, type Page } from "@playwright/test";
import { format } from "date-fns";

const DAY_1 = new Date("2026-01-05T09:00:00");
const DAY_2 = new Date("2026-01-06T09:00:00"); // DAY_1 + 24h — vencimento da revisão step 1

async function createSubject(page: Page, name: string) {
  await page.goto("/materias");
  await page.getByRole("button", { name: "Nova matéria" }).first().click();
  await page.getByLabel("Nome").fill(name);
  await page.getByRole("button", { name: "Criar matéria" }).click();
  await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
}

async function createTheorySessionWithReview(page: Page, subjectName: string) {
  await page.goto("/sessoes");
  await page.getByRole("button", { name: "Nova sessão" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova sessão" });
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: subjectName }).click();
  await expect(dialog.getByRole("checkbox", { name: "Agendar revisões espaçadas" })).toBeChecked();
  await dialog.getByRole("button", { name: "Salvar" }).click();
}

test("sessão de teoria com opt-in gera revisão D+1 e ela aparece em Próximas", async ({ page }) => {
  await page.clock.install({ time: DAY_1 });
  await createSubject(page, "Direito Administrativo");
  await createTheorySessionWithReview(page, "Direito Administrativo");

  await page.goto("/revisoes");
  await expect(page.getByText("Nenhuma revisão para hoje.")).toBeVisible();
  await page.getByRole("button", { name: /Próximas 7 dias/ }).click();
  await expect(page.getByText("Direito Administrativo")).toBeVisible();
  await expect(page.getByText("1ª · 24h")).toBeVisible();
});

test("revisão vence, aparece em Hoje e no calendário, concluir agenda step 2 (D+7)", async ({ page }) => {
  await page.clock.install({ time: DAY_1 });
  await createSubject(page, "Direito Constitucional");
  await createTheorySessionWithReview(page, "Direito Constitucional");

  await page.clock.setFixedTime(DAY_2);

  const today = format(DAY_2, "yyyy-MM-dd");
  await page.goto("/calendario");
  const strip = page.locator(`[data-testid="review-strip-${today}"]`);
  await expect(strip).toBeVisible();
  await strip.getByRole("button", { name: "Direito Constitucional", exact: true }).click();

  const sessionDialog = page.getByRole("dialog", { name: "Revisado — registrar sessão" });
  await expect(sessionDialog.getByRole("combobox").first()).toContainText("Direito Constitucional");
  await sessionDialog.getByRole("button", { name: "Salvar" }).click();

  await expect(strip).toHaveCount(0);

  await page.goto("/revisoes");
  await expect(page.getByText("Nenhuma revisão para hoje.")).toBeVisible();
  await page.getByRole("button", { name: /Próximas 7 dias/ }).click();
  await expect(page.getByText("2ª · 7d")).toBeVisible();
});

test("pular revisão remove da lista e desfazer no toast restaura", async ({ page }) => {
  await page.clock.install({ time: DAY_1 });
  await createSubject(page, "Português", );
  await createTheorySessionWithReview(page, "Português");

  await page.clock.setFixedTime(DAY_2);
  await page.goto("/revisoes");

  await expect(page.getByText("Hoje (1)")).toBeVisible();
  await page.getByRole("button", { name: "Pular" }).click();

  // Única revisão do store — ao pular, some e mostra o estado vazio.
  await expect(page.getByText("Nenhuma revisão pendente")).toBeVisible();
  await expect(page.getByText("Revisão pulada")).toBeVisible();

  await page.getByRole("button", { name: "Desfazer" }).click();
  await expect(page.getByText("Hoje (1)")).toBeVisible();
  await expect(page.getByText("Português")).toBeVisible();
});

test("badge de revisões pendentes aparece no item Revisões da sidebar", async ({ page }) => {
  await page.clock.install({ time: DAY_1 });
  await createSubject(page, "Raciocínio Lógico");
  await createTheorySessionWithReview(page, "Raciocínio Lógico");

  await page.clock.setFixedTime(DAY_2);
  await page.goto("/");

  const revisoesLink = page.getByRole("link", { name: /Revisões/ });
  await expect(revisoesLink.getByText("1", { exact: true })).toBeVisible();

  const reviewsCard = page.locator('[data-slot="card"]', { has: page.getByText("Revisões hoje") });
  await expect(reviewsCard.getByText("1", { exact: true })).toBeVisible();
});
