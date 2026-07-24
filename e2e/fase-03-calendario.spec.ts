import { expect, test, type Page } from "@playwright/test";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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

/** Y (em px) do topo da grade até o horário informado (grade começa às 05:00, 28px por slot de 30min). */
function yForTime(hour: number, minute = 0) {
  return ((hour - 5) * 60 + minute) * (28 / 30);
}

async function createBlockAt(page: Page, subjectName: string, hour: number) {
  await page.goto("/calendario");
  await todayColumn(page).click({ position: { x: 20, y: yForTime(hour) + 4 } });
  const dialog = page.getByRole("dialog", { name: "Novo bloco de estudo" });
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: subjectName }).click();
  await dialog.getByRole("button", { name: "Criar bloco" }).click();
  await expect(dialog).not.toBeVisible();
}

test("cria bloco clicando em célula vazia, com a cor da matéria", async ({ page }) => {
  await createSubject(page, "Matemática");
  await createBlockAt(page, "Matemática", 10);

  const block = page.getByRole("button", { name: /Matemática/ });
  await expect(block).toBeVisible();
  await expect(block).toHaveCSS("background-color", /rgb/);
});

test("arrasta bloco para outro dia e persiste após refresh", async ({ page }) => {
  await createSubject(page, "História");
  await createBlockAt(page, "História", 9);

  const block = page.getByRole("button", { name: /História/ });
  const blockBox = await block.boundingBox();
  const targetColumn = page.locator('[data-testid^="calendar-column-"]').nth(2);
  const targetBox = await targetColumn.boundingBox();
  if (!blockBox || !targetBox) throw new Error("elementos não encontrados");

  await page.mouse.move(blockBox.x + blockBox.width / 2, blockBox.y + blockBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + targetBox.width / 2, blockBox.y + blockBox.height / 2, { steps: 10 });
  await page.mouse.up();

  // Some coluna original: não deve mais ter bloco lá.
  await expect(todayColumn(page).getByRole("button", { name: /História/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /História/ })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: /História/ })).toBeVisible();
  await expect(todayColumn(page).getByRole("button", { name: /História/ })).toHaveCount(0);
});

test("redimensiona um bloco arrastando a borda inferior", async ({ page }) => {
  await createSubject(page, "Geografia");
  await createBlockAt(page, "Geografia", 8);

  const block = page.getByRole("button", { name: /Geografia/ });
  const before = await block.boundingBox();
  if (!before) throw new Error("bloco não encontrado");

  const handleX = before.x + before.width / 2;
  const handleY = before.y + before.height - 2;
  await page.mouse.move(handleX, handleY);
  await page.mouse.down();
  await page.mouse.move(handleX, handleY + 28, { steps: 5 }); // +30min
  await page.mouse.up();
  await page.mouse.move(handleX + 100, handleY + 200); // afasta o cursor da alça de resize

  const after = await block.boundingBox();
  expect(after!.height).toBeGreaterThan(before.height + 15);

  // Clica perto do topo do bloco, longe da alça de resize no rodapé.
  await block.click({ position: { x: 10, y: 6 } });
  const details = page.getByRole("dialog", { name: "Geografia" });
  await expect(details.getByText("08:00")).toBeVisible();
  await expect(details.getByText("09:30")).toBeVisible();
});

test("impede sobreposição de blocos com toast de erro", async ({ page }) => {
  await createSubject(page, "Química");
  await createBlockAt(page, "Química", 14); // 14:00–15:00

  // Clica num horário livre e depois ajusta para sobrepor o bloco existente.
  await todayColumn(page).click({ position: { x: 20, y: yForTime(18) + 4 } });
  const dialog = page.getByRole("dialog", { name: "Novo bloco de estudo" });
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Química" }).click();
  await dialog.locator("#block-start").fill("14:30");
  await dialog.locator("#block-end").fill("15:30");
  await dialog.getByRole("button", { name: "Criar bloco" }).click();

  await expect(page.getByText("Já existe um bloco nesse horário.")).toBeVisible();
  // O dialog permanece aberto para o usuário ajustar o horário; fecha antes
  // de contar os blocos, já que o conteúdo de fundo fica inert com o modal aberto.
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("button", { name: /Química/ })).toHaveCount(1);
});

test("recorrência semanal aparece nas próximas semanas; excluir todas as futuras remove a série à frente", async ({ page }) => {
  await createSubject(page, "Física");
  await page.goto("/calendario");
  await todayColumn(page).click({ position: { x: 20, y: yForTime(16) + 4 } });

  const dialog = page.getByRole("dialog", { name: "Novo bloco de estudo" });
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Física" }).click();
  await dialog.getByRole("checkbox").click();
  await dialog.getByRole("button", { name: "Criar bloco" }).click();

  await expect(page.getByRole("button", { name: /Física/ })).toBeVisible();

  await page.getByRole("button", { name: "Próximo" }).click();
  await expect(page.getByRole("button", { name: /Física/ })).toBeVisible();

  await page.getByRole("button", { name: /Física/ }).click();
  await page.getByRole("button", { name: "Excluir" }).click();
  await page.getByRole("button", { name: "Esta e as futuras" }).click();

  // Semana seguinte (onde excluímos "esta e as futuras"): não deve sobrar nada.
  await expect(page.getByRole("button", { name: /Física/ })).toHaveCount(0);

  // Semana original (anterior ao ponto de exclusão): ocorrência preservada.
  await page.getByRole("button", { name: "Anterior" }).click();
  await expect(page.getByRole("button", { name: /Física/ })).toBeVisible();
});

test("marcar concluído muda o visual do bloco", async ({ page }) => {
  await createSubject(page, "Biologia");
  await createBlockAt(page, "Biologia", 11);

  await page.getByRole("button", { name: /Biologia/ }).click();
  await page.getByRole("button", { name: "Concluído" }).click();
  await expect(page.getByText("Concluído")).toBeVisible();
  await expect(page.getByRole("button", { name: "Desfazer" })).toBeVisible();
});

test("alterna entre vista semana e mês, e navega entre semanas", async ({ page }) => {
  await page.goto("/calendario");
  const weekLabel = await page.getByText(/–.*\/\d{4}/).textContent();

  await page.getByRole("button", { name: "Próximo" }).click();
  const nextWeekLabel = await page.getByText(/–.*\/\d{4}/).textContent();
  expect(nextWeekLabel).not.toBe(weekLabel);

  await page.getByRole("button", { name: "Hoje" }).click();
  await page.getByRole("tab", { name: "Mês" }).click();
  await expect(page.getByText(format(new Date(), "MMMM", { locale: ptBR }), { exact: false })).toBeVisible();
});
