import { expect, test, type Page } from "@playwright/test";

async function createSubject(page: Page, name: string) {
  await page.goto("/materias");
  await page.getByRole("button", { name: "Nova matéria" }).first().click();
  await page.getByLabel("Nome").fill(name);
  await page.getByRole("button", { name: "Criar matéria" }).click();
  await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
}

async function startTimer(page: Page, subjectName: string) {
  await page.getByRole("combobox", { name: "Matéria do cronômetro" }).click();
  await page.getByRole("option", { name: subjectName }).click();
  await page.getByRole("button", { name: "Iniciar" }).click();
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
}

test("modo foco: entra em tela cheia, tempo continua e ESC volta sem perder a contagem", async ({ page }) => {
  await createSubject(page, "Português E2E");
  await startTimer(page, "Português E2E");

  await page.getByRole("button", { name: "Modo foco" }).click();

  // Overlay: matéria + controles grandes, sem o widget compacto por trás.
  await expect(page.getByTestId("focus-mode-subject")).toContainText("Português E2E");
  await expect(page.getByRole("button", { name: "Pausar", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Minimizar modo foco" })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Matéria do cronômetro" })).toHaveCount(0);

  await page.waitForTimeout(1_200);

  await page.keyboard.press("Escape");

  // Volta pro widget compacto, cronômetro ainda rodando (não voltou pra "Iniciar").
  await expect(page.getByRole("button", { name: "Minimizar modo foco" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar" })).toHaveCount(0);
});

test("modo foco: botão minimizar também volta ao widget sem parar o cronômetro", async ({ page }) => {
  await createSubject(page, "Matemática E2E");
  await startTimer(page, "Matemática E2E");

  await page.getByRole("button", { name: "Modo foco" }).click();
  await expect(page.getByRole("button", { name: "Minimizar modo foco" })).toBeVisible();

  await page.getByRole("button", { name: "Minimizar modo foco" }).click();

  await expect(page.getByRole("button", { name: "Minimizar modo foco" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pausar" })).toBeVisible();
});

test("modo foco: parar de dentro do overlay abre o formulário de registro da sessão", async ({ page }) => {
  await createSubject(page, "História E2E");
  await startTimer(page, "História E2E");

  await page.getByRole("button", { name: "Modo foco" }).click();
  await page.waitForTimeout(1_200);
  await page.getByRole("button", { name: "Parar", exact: true }).click();

  await expect(page.getByRole("button", { name: "Minimizar modo foco" })).toHaveCount(0);
  const dialog = page.getByRole("dialog", { name: "Registrar sessão do cronômetro" });
  await expect(dialog.getByRole("combobox").first()).toContainText("História E2E");
});
