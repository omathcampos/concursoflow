import ExcelJS from "exceljs";
import { expect, test, type Page } from "@playwright/test";

/**
 * Geração 100% client-side (SheetJS... na verdade ExcelJS, ver export-data-dialog.tsx)
 * a partir dos dados já no repo — não depende de backend, roda direto em modo local.
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
  await todayColumn(page).click({ position: { x: 20, y: hour * 60 * (28 / 30) + 4 } });
  const dialog = page.getByRole("dialog", { name: "Novo bloco de estudo" });
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: subjectName }).click();
  await dialog.getByRole("button", { name: "Criar bloco" }).click();
  await expect(dialog).not.toBeVisible();
}

test("dialog Exportar dados abre no Dashboard com as 6 abas marcadas", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Exportar dados" }).click();

  const dialog = page.getByRole("dialog", { name: "Exportar dados" });
  await expect(dialog).toBeVisible();
  for (const label of ["Resumo", "Sessões", "Blocos", "Revisões", "Evolução semanal", "Grade do calendário"]) {
    await expect(dialog.getByRole("checkbox", { name: label })).toBeChecked();
  }

  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).not.toBeVisible();
});

test("exportar .xlsx gera um arquivo válido com as 6 abas e o bloco criado aparece na grade", async ({ page }) => {
  await createSubject(page, "Português E2E Planilha");
  await createBlockAt(page, "Português E2E Planilha", 10);

  await page.goto("/");
  await page.getByRole("button", { name: "Exportar dados" }).click();
  const dialog = page.getByRole("dialog", { name: "Exportar dados" });
  await expect(dialog).toBeVisible();

  // "Tudo" garante que o bloco criado (pode ter caído fora dos últimos 30d
  // dependendo do relógio do sistema) sempre entra no período exportado.
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: "Tudo" }).click();

  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Exportar" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^concursoflow-export-\d{4}-\d{2}-\d{2}\.xlsx$/);

  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const buffer = Buffer.concat(chunks);

  const workbook = new ExcelJS.Workbook();
  // exceljs tipa `load` com o `Buffer` global "clássico"; Buffer.concat() no
  // @types/node atual retorna Buffer<ArrayBuffer>, estruturalmente idêntico
  // mas rejeitado pelo TS por variância de generics — cast local, sem risco.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ver comentário acima
  await workbook.xlsx.load(buffer as any);

  const sheetNames = workbook.worksheets.map((ws) => ws.name);
  expect(sheetNames).toEqual(["Resumo", "Sessões", "Blocos", "Revisões", "Evolução semanal", "Grade do calendário"]);

  const resumo = workbook.getWorksheet("Resumo")!;
  expect(resumo.getCell("A1").value).toBe("Período");
  expect(resumo.getCell("A1").font?.bold).toBe(true);

  const blocos = workbook.getWorksheet("Blocos")!;
  expect(blocos.getRow(1).getCell(1).value).toBe("Data");
  expect(blocos.getRow(1).getCell(1).font?.bold).toBe(true);
  const blocosValues = blocos.getSheetValues().flat();
  expect(blocosValues).toContain("Português E2E Planilha");

  const grade = workbook.getWorksheet("Grade do calendário")!;
  expect(grade.pageSetup.orientation).toBe("landscape");
  const gradeValues = grade
    .getSheetValues()
    .flat()
    .filter((v): v is string => typeof v === "string");
  expect(gradeValues.some((v) => v.includes("Português E2E Planilha"))).toBe(true);
});

test("exportar .csv gera um arquivo por aba selecionada", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Exportar dados" }).click();
  const dialog = page.getByRole("dialog", { name: "Exportar dados" });
  await expect(dialog).toBeVisible();

  await dialog.getByRole("combobox").nth(1).click();
  await page.getByRole("option", { name: ".csv (um arquivo por aba)" }).click();

  // Grade do calendário não existe em CSV — checkbox deve desabilitar.
  await expect(dialog.getByRole("checkbox", { name: /Grade do calendário/ })).toBeDisabled();

  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Exportar" }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^concursoflow-export-resumo-\d{4}-\d{2}-\d{2}\.csv$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const content = Buffer.concat(chunks).toString("utf-8");
  expect(content.split("\r\n")[0]).toContain("Matéria");
});
