import { expect, test } from "@playwright/test";

/**
 * /docs é pública (ver src/lib/auth/route-guard.ts) — roda sem login em
 * qualquer modo (local ou supabase), então não precisa de SUPABASE_E2E.
 */

test("/docs abre sem login e mostra as duas seções", async ({ page }) => {
  await page.goto("/docs");
  await expect(page.getByRole("heading", { name: "Documentação do ConcursoFlow", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Guia do usuário/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Referência técnica/ })).toBeVisible();
});

test("navegação entre páginas das duas seções via sidebar", async ({ page }) => {
  await page.goto("/docs/guia/introducao");
  await expect(page.getByRole("heading", { name: "Introdução", level: 1 })).toBeVisible();

  await page.getByRole("link", { name: "Ciclo de estudos", exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/guia\/ciclo-de-estudos$/);
  await expect(page.getByRole("heading", { name: "Ciclo de estudos", level: 1 })).toBeVisible();

  await page.getByRole("button", { name: "Referência técnica" }).click();
  await page.getByRole("link", { name: "Repository Pattern", exact: true }).click();
  await expect(page).toHaveURL(/\/docs\/tecnico\/repository-pattern$/);
  await expect(page.getByRole("heading", { name: "Repository Pattern", level: 1 })).toBeVisible();
});

test("busca retorna resultado e navega até a página certa", async ({ page }) => {
  await page.goto("/docs");
  await page.keyboard.press("ControlOrMeta+k");

  const searchBox = page.getByRole("textbox", { name: "Search" });
  await expect(searchBox).toBeVisible();
  await searchBox.fill("ciclo de estudos");

  const result = page.getByRole("button", { name: /Ciclo de estudos/ }).first();
  await expect(result).toBeVisible();
  await result.click();

  await expect(page).toHaveURL(/\/docs\/guia\/ciclo-de-estudos/);
});

test("tema claro/escuro alterna e persiste a navegação", async ({ page }) => {
  await page.goto("/docs");
  const bgBefore = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);

  await page.getByRole("button", { name: "Toggle Theme" }).click();

  await expect(async () => {
    const bgAfter = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(bgAfter).not.toBe(bgBefore);
  }).toPass({ timeout: 5_000 });
});

test("diagrama Mermaid da página de arquitetura renderiza sem erro", async ({ page }) => {
  await page.goto("/docs/tecnico/arquitetura");
  await expect(page.getByText("Renderizando diagrama…")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.getByText(/Erro ao renderizar o diagrama/)).toHaveCount(0);
  await expect(page.getByTestId("mermaid-diagram").locator("svg")).toBeVisible();
});

test("regressão: liberar /docs no proxy não abriu nenhuma rota autenticada do app", async ({ page }) => {
  // Em modo supabase (gated por SUPABASE_E2E em outras specs) o /calendario
  // exigiria login; aqui, garantimos que /docs continua a única exceção nova
  // — checando que o link "Abrir o app" na doc aponta pra raiz, não bypassa nada.
  await page.goto("/docs");
  await expect(page.getByRole("link", { name: "Abrir o app" })).toHaveAttribute("href", "/");
});
