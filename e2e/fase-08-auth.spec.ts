import { expect, test, type Page } from "@playwright/test";

/**
 * Specs desta fase rodam contra o Supabase REAL (ref apceuvnqnrxfoongjvxq).
 * O projeto tem `mailer_autoconfirm` desligado, então um cadastro feito pelo
 * teste não pode ser confirmado por email dentro do e2e — por isso login,
 * logout e isolamento entre usuários dependem de 2 contas JÁ confirmadas
 * (criadas via SQL, mesmo padrão usado para os usuários técnicos das fases
 * 7/8 — ver auth.users/auth.identities). Não fazem parte de `npm run e2e`/CI
 * por padrão.
 *
 * Para rodar manualmente:
 *   1. .env.local: NEXT_PUBLIC_DATA_SOURCE=supabase
 *   2. Crie 2 usuários confirmados via SQL e exporte:
 *      E2E_USER_A_EMAIL, E2E_USER_A_PASSWORD, E2E_USER_B_EMAIL, E2E_USER_B_PASSWORD
 *   3. SUPABASE_E2E=1 npx playwright test e2e/fase-08-auth.spec.ts
 *
 * Os testes de redirecionamento e cadastro rodam apenas com SUPABASE_E2E=1
 * (não precisam das contas). Login/logout/isolamento também exigem as 4 env
 * vars acima.
 *
 * Nota: o teste de cadastro envia um email real (mailer_autoconfirm=false) e
 * pode falhar com "email rate limit exceeded" se rodado repetidamente em
 * pouco tempo — cota do serviço de email compartilhado do projeto (mesma
 * limitação documentada na fase 7), não um defeito no código.
 */
test.skip(!process.env.SUPABASE_E2E, "Requer NEXT_PUBLIC_DATA_SOURCE=supabase e projeto Supabase real — não roda em CI. Ver comentário no topo do arquivo.");

test("visitante deslogado é redirecionado para /login em rota protegida", async ({ page }) => {
  await page.goto("/materias");
  await expect(page).toHaveURL(/\/login$/);
});

test("cadastro envia o formulário e mostra a confirmação por email", async ({ page }) => {
  await page.goto("/cadastro");
  const uniqueEmail = `e2e-${Date.now()}@concursoflow.internal`;

  await page.getByLabel("Nome").fill("Usuária E2E");
  await page.getByLabel("Email").fill(uniqueEmail);
  await page.getByLabel("Senha").fill("SenhaForte123!");
  await page.getByRole("button", { name: "Criar conta" }).click();

  await expect(page.getByText("Confira seu email")).toBeVisible({ timeout: 15_000 });
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
}

async function createSubject(page: Page, name: string) {
  await page.goto("/materias");
  await page.getByRole("button", { name: "Nova matéria" }).first().click();
  await page.getByLabel("Nome").fill(name);
  await page.getByRole("button", { name: "Criar matéria" }).click();
  // Round-trip real contra o Supabase (não local) — dá mais folga que o timeout padrão.
  await expect(page.getByRole("heading", { name, level: 3 })).toBeVisible({ timeout: 15_000 });
}

const userAEmail = process.env.E2E_USER_A_EMAIL;
const userAPassword = process.env.E2E_USER_A_PASSWORD;
const userBEmail = process.env.E2E_USER_B_EMAIL;
const userBPassword = process.env.E2E_USER_B_PASSWORD;
const hasTestAccounts = Boolean(userAEmail && userAPassword && userBEmail && userBPassword);

test.describe("login, logout e isolamento entre usuários", () => {
  test.skip(!hasTestAccounts, "Requer E2E_USER_A_EMAIL/PASSWORD e E2E_USER_B_EMAIL/PASSWORD (contas já confirmadas).");

  test("login e logout redirecionam corretamente", async ({ page }) => {
    await login(page, userAEmail!, userAPassword!);

    await page.getByRole("button", { name: "Menu do usuário" }).click();
    await page.getByRole("menuitem", { name: "Sair" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.goto("/materias");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("menu do usuário: iniciais, submenu de tema e /perfil salvando com feedback", async ({ page }) => {
    await login(page, userAEmail!, userAPassword!);

    const menuTrigger = page.getByRole("button", { name: "Menu do usuário" });
    await menuTrigger.click();
    await expect(page.getByText(userAEmail!)).toBeVisible();

    await page.getByRole("menuitem", { name: "Tema" }).click();
    await page.getByRole("menuitem", { name: "Escuro" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    await menuTrigger.click();
    await page.getByRole("menuitem", { name: "Perfil" }).click();
    await expect(page).toHaveURL(/\/perfil$/);

    const uniqueName = `QA Menu ${Date.now()}`;
    await page.getByLabel("Nome de exibição").fill(uniqueName);
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Perfil atualizado.")).toBeVisible({ timeout: 10_000 });

    const initials = uniqueName
      .split(" ")
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase();
    await expect(menuTrigger.getByText(initials, { exact: true })).toBeVisible();
  });

  test("revalidação por foco da janela é silenciosa: não remonta o app nem fecha dialog aberto", async ({ page }) => {
    await login(page, userAEmail!, userAPassword!);
    await page.goto("/materias");

    await page.getByRole("button", { name: "Nova matéria" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.getByLabel("Nome").fill("Não deve sumir no refetch");

    // Simula o app perdendo e recuperando o foco (ex.: alt-tab) — dispara o
    // listener de "focus" do DataProvider, que deve revalidar em segundo
    // plano sem desmontar a árvore (ver data-provider.tsx).
    await page.evaluate(() => {
      window.dispatchEvent(new Event("blur"));
      window.dispatchEvent(new Event("focus"));
    });

    // Nem a tela de boot aparece, nem o dialog fecha, nem o valor digitado some.
    await expect(page.getByText("Carregando seus dados…")).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(page.getByLabel("Nome")).toHaveValue("Não deve sumir no refetch");
  });

  test("dados de um usuário não aparecem para o outro (RLS)", async ({ browser }) => {
    const subjectA = `Matéria E2E A ${Date.now()}`;
    const subjectB = `Matéria E2E B ${Date.now()}`;

    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();
    await login(pageA, userAEmail!, userAPassword!);
    await createSubject(pageA, subjectA);

    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();
    await login(pageB, userBEmail!, userBPassword!);
    await pageB.goto("/materias");
    await expect(pageB.getByRole("heading", { name: subjectA, level: 3 })).toHaveCount(0);
    await createSubject(pageB, subjectB);

    await pageA.goto("/materias");
    await expect(pageA.getByRole("heading", { name: subjectB, level: 3 })).toHaveCount(0);
    await expect(pageA.getByRole("heading", { name: subjectA, level: 3 })).toBeVisible();

    await contextA.close();
    await contextB.close();
  });
});
