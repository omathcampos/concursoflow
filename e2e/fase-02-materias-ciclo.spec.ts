import { expect, test } from "@playwright/test";

test("cria matéria com cor, peso e observações, adiciona tópicos e alterna status", async ({ page }) => {
  await page.goto("/materias");

  await page.getByRole("button", { name: "Nova matéria" }).first().click();
  await page.getByLabel("Nome").fill("Direito Penal");
  await page.getByRole("button", { name: "blue", exact: true }).click();
  await page.getByRole("radio", { name: "Peso 4" }).click();
  await page.getByLabel("Observações").fill("Cai muito na banca FGV");
  await page.getByRole("button", { name: "Criar matéria" }).click();

  await expect(page.getByRole("heading", { name: "Direito Penal", level: 3 })).toBeVisible();
  await expect(page.getByRole("main").getByText("Cai muito na banca FGV")).toBeVisible();

  await page.getByRole("button", { name: "Tópicos" }).click();
  await page.getByPlaceholder("Adicionar tópico...").fill("Tipicidade");
  await page.getByPlaceholder("Adicionar tópico...").press("Enter");

  await expect(page.getByRole("button", { name: "Tipicidade" })).toBeVisible();
  await page.getByRole("button", { name: /^Status:/ }).click();
  await expect(page.getByRole("button", { name: /Status: Estudando/ })).toBeVisible();
});

test("monta o ciclo, sugere a matéria certa, conclui a rodada e inicia uma nova", async ({ page }) => {
  await page.goto("/materias");

  for (const { name, weight } of [
    { name: "Alfa", weight: "Peso 5" },
    { name: "Beta", weight: "Peso 1" },
  ]) {
    await page.getByRole("button", { name: "Nova matéria" }).first().click();
    await page.getByLabel("Nome").fill(name);
    await page.getByRole("radio", { name: weight }).click();
    await page.getByRole("button", { name: "Criar matéria" }).click();
    await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible();
  }

  await page.goto("/ciclo");
  await page.getByRole("button", { name: "Montar ciclo" }).click();
  await page.getByRole("checkbox", { name: "Alfa" }).click();
  await page.getByRole("checkbox", { name: "Beta" }).click();
  const hourInputs = page.getByRole("spinbutton");
  await hourInputs.nth(0).fill("0.5");
  await hourInputs.nth(1).fill("0.5");
  await page.getByRole("button", { name: "Salvar ciclo" }).click();

  const main = page.getByRole("main");

  // Empate em 0%: a matéria de maior peso (Alfa) é sugerida primeiro.
  await expect(main.getByText("Estude agora")).toBeVisible();
  await expect(main.getByText("Alfa", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "30min" }).first().click();
  // Alfa concluiu a meta — Beta passa a ser a sugestão.
  await expect(main.getByText("Beta", { exact: true }).first()).toBeVisible();

  await page.getByRole("button", { name: "30min" }).last().click();
  await expect(page.getByText(/Rodada 1 concluída/)).toBeVisible();

  await page.getByRole("button", { name: "Nova rodada" }).click();
  await expect(page.getByText("Rodada 2")).toBeVisible();
  await expect(page.getByText("0.0h / 0.5h").first()).toBeVisible();
});

test("cria anotação vinculada a matéria, busca por texto e visualiza preview em markdown", async ({ page }) => {
  await page.goto("/materias");
  await page.getByRole("button", { name: "Nova matéria" }).first().click();
  await page.getByLabel("Nome").fill("Direito Civil");
  await page.getByRole("button", { name: "Criar matéria" }).click();

  await page.getByRole("button", { name: "Mais ações" }).click();
  await page.getByRole("menuitem", { name: "Nova anotação" }).click();

  await expect(page).toHaveURL(/\/anotacoes/);
  await page.getByPlaceholder("Título da anotação").fill("Prescrição");
  await page.getByPlaceholder("Escreva em markdown...").fill("# Prazo\n\n- 10 anos regra geral");

  await expect(page.getByRole("button", { name: /Prescrição/ })).toBeVisible();

  await page.getByRole("tab", { name: "Visualizar" }).click();
  await expect(page.getByRole("heading", { name: "Prazo" })).toBeVisible();

  await page.getByPlaceholder("Buscar anotações...").fill("Prescrição");
  await expect(page.getByRole("button", { name: /Prescrição/ })).toBeVisible();

  await page.getByPlaceholder("Buscar anotações...").fill("não existe nenhuma anotação com isso");
  await expect(page.getByText("Nenhuma anotação encontrada.")).toBeVisible();
});
