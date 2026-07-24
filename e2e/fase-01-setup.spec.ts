import { expect, test } from "@playwright/test";

const PAGES = [
  { href: "/", heading: "Dashboard" },
  { href: "/calendario", heading: "Calendário" },
  { href: "/ciclo", heading: "Ciclo" },
  { href: "/materias", heading: "Matérias" },
  { href: "/sessoes", heading: "Sessões" },
  { href: "/revisoes", heading: "Revisões" },
  { href: "/anotacoes", heading: "Anotações" },
];

test("app carrega e mostra o dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ConcursoFlow" }).first()).toBeVisible();
});

test("navega pelas 7 páginas pela sidebar", async ({ page }) => {
  await page.goto("/");

  for (const { href, heading } of PAGES) {
    await page.getByRole("navigation").getByRole("link", { name: heading }).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
  }
});

test("troca de tema funciona", async ({ page }) => {
  await page.goto("/");
  const html = page.locator("html");

  await page.getByRole("button", { name: "Alternar tema" }).click();
  await page.getByRole("menuitem", { name: "Escuro" }).click();
  await expect(html).toHaveClass(/dark/);

  await page.getByRole("button", { name: "Alternar tema" }).click();
  await page.getByRole("menuitem", { name: "Claro" }).click();
  await expect(html).not.toHaveClass(/dark/);
});
