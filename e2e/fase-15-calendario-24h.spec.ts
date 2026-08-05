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

/** Y (em px) do topo da grade até o horário informado (grade começa às 00:00, 28px por slot de 30min). */
function yForTime(hour: number, minute = 0) {
  return (hour * 60 + minute) * (28 / 30);
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

/** Cria uma sessão AVULSA (sem bloco) via página Sessões, num horário de hoje. */
async function createStandaloneSession(page: Page, subjectName: string, hour: number) {
  await page.goto("/sessoes");
  await page.getByRole("button", { name: "Nova sessão" }).click();
  const dialog = page.getByRole("dialog", { name: "Nova sessão" });
  await dialog.getByRole("combobox").first().click();
  await page.getByRole("option", { name: subjectName }).click();
  const startedAtLocal = `${format(new Date(), "yyyy-MM-dd")}T${String(hour).padStart(2, "0")}:00`;
  await dialog.locator("#session-started-at").fill(startedAtLocal);
  await dialog.locator("#session-duration").fill("45");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog).not.toBeVisible();
}

test("grade mostra as 24h completas (00:00 a 23:00)", async ({ page }) => {
  await createSubject(page, "Grade24h");
  await page.goto("/calendario");
  await expect(page.getByText("00:00", { exact: true })).toBeAttached();
  await expect(page.getByText("23:00", { exact: true })).toBeAttached();
});

test("criar bloco às 02h (madrugada) funciona", async ({ page }) => {
  await createSubject(page, "Madrugada");
  await createBlockAt(page, "Madrugada", 2);
  await expect(page.getByRole("button", { name: /Madrugada/ })).toBeVisible();
});

test("sessão avulsa aparece no horário certo, com estilo distinto, e não duplica quando vinculada a bloco", async ({ page }) => {
  await createSubject(page, "SessaoAvulsa");
  await createStandaloneSession(page, "SessaoAvulsa", 3);

  await page.goto("/calendario");
  const sessionItem = page.getByRole("button", { name: /SessaoAvulsa \(sessão realizada\)/ });
  await expect(sessionItem).toBeVisible();

  // Clique abre detalhes com ações de editar/excluir.
  await sessionItem.click();
  const detailsDialog = page.getByRole("dialog");
  await expect(detailsDialog).toBeVisible();
  await expect(detailsDialog.getByText("Editar")).toBeVisible();
  await expect(detailsDialog.getByText("Excluir")).toBeVisible();
  await page.keyboard.press("Escape");

  // Sessão vinculada a bloco (fluxo "Concluído") NÃO ganha item próprio —
  // o bloco concluído já a representa, sem duplicar visualmente.
  await createBlockAt(page, "SessaoAvulsa", 6);
  await page.getByRole("button", { name: "SessaoAvulsa Teoria" }).click();
  await page.getByRole("button", { name: "Concluído" }).click();
  const sessionFormDialog = page.getByRole("dialog", { name: "Concluir bloco — registrar sessão" });
  await sessionFormDialog.getByRole("button", { name: "Salvar" }).click();

  // Só a sessão AVULSA original aparece com o estilo "sessão realizada" — a
  // nova sessão (vinculada ao bloco das 06h) não gera um segundo item.
  await expect(page.getByRole("button", { name: /SessaoAvulsa \(sessão realizada\)/ })).toHaveCount(1);
});

test("toggle 'mostrar sessões realizadas' esconde e mostra, e persiste a preferência", async ({ page }) => {
  await createSubject(page, "ToggleSessao");
  await createStandaloneSession(page, "ToggleSessao", 4);

  await page.goto("/calendario");
  const sessionItem = page.getByRole("button", { name: /ToggleSessao \(sessão realizada\)/ });
  await expect(sessionItem).toBeVisible();

  await page.getByRole("switch", { name: "Mostrar sessões realizadas" }).click();
  await expect(sessionItem).toHaveCount(0);

  // Persiste: reload mantém escondido.
  await page.reload();
  await expect(page.getByRole("button", { name: /ToggleSessao \(sessão realizada\)/ })).toHaveCount(0);
  await expect(page.getByRole("switch", { name: "Mostrar sessões realizadas" })).toHaveAttribute("aria-checked", "false");
});

test("arrastar sessão avulsa corrige o horário (started_at), sem passar por detectOverlap", async ({ page }) => {
  await createSubject(page, "DragSessao");
  // Bloco criado ANTES da sessão: clicar na grade pra criar o bloco precisa
  // de uma célula livre — se a sessão (que cobre parte da célula) já
  // existisse, o clique cairia nela em vez de abrir "Novo bloco de estudo".
  await createBlockAt(page, "DragSessao", 5);
  // Sessão avulsa no MESMO horário do bloco — deve conviver lado a lado, sem
  // erro de sobreposição (sessão não é planejamento).
  await createStandaloneSession(page, "DragSessao", 5);

  await page.goto("/calendario");
  const sessionItem = page.getByRole("button", { name: /DragSessao \(sessão realizada\)/ });
  await expect(sessionItem).toBeVisible();
  await expect(page.getByRole("button", { name: "DragSessao Teoria" })).toBeVisible();

  const box = await sessionItem.boundingBox();
  if (!box) throw new Error("sessão não encontrada");

  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX, startY + 10, { steps: 5 });
  await page.mouse.move(startX, startY + yForTime(2), { steps: 10 }); // desloca ~2h pra baixo
  await page.mouse.up();

  await page.waitForTimeout(300);
  await page.reload();
  // Depois do reload, a sessão continua existindo (persistiu no repo local) e
  // o bloco original das 05h permanece intacto (drag de sessão não mexe em bloco).
  await expect(page.getByRole("button", { name: /DragSessao \(sessão realizada\)/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "DragSessao Teoria" })).toBeVisible();
});
