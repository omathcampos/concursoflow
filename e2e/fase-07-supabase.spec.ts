import { expect, test, type Page } from "@playwright/test";

/**
 * Specs desta fase rodam contra o Supabase REAL (ref apceuvnqnrxfoongjvxq) —
 * não têm isolamento por teste como o modo local (localStorage por browser
 * context), então NÃO fazem parte de `npm run e2e`/CI por padrão.
 *
 * Para rodar manualmente:
 *   1. .env.local: NEXT_PUBLIC_DATA_SOURCE=supabase
 *   2. Garantir que o projeto não tem matérias (a importação é idempotente e
 *      recusa se já houver dados — rode `delete from public.subjects ...`
 *      via MCP/SQL antes se necessário).
 *   3. SUPABASE_E2E=1 npx playwright test e2e/fase-07-supabase.spec.ts
 */
test.skip(!process.env.SUPABASE_E2E, "Requer NEXT_PUBLIC_DATA_SOURCE=supabase e projeto Supabase real vazio — não roda em CI. Ver comentário no topo do arquivo.");

async function seedLocalStorage(page: Page) {
  await page.addInitScript(() => {
    const state = {
      subjects: [{ id: "local-s1", name: "Matéria Importada", color: "#3b82f6", weight: 3, notes: null, createdAt: new Date().toISOString() }],
      topics: [],
      cycles: [],
      cycleEntries: [],
      blocks: [],
      sessions: [],
      reviews: [],
      annotations: [],
      timer: { status: "idle", subjectId: null, startedAt: null, accumulatedMs: 0 },
      profile: { id: "local", displayName: null, targetExam: null, examDate: null, createdAt: new Date().toISOString() },
    };
    localStorage.setItem("concursoflow-v1", JSON.stringify({ state, version: 0 }));
  });
}

test("importa dados locais para o Supabase e a importação é idempotente", async ({ page }) => {
  await seedLocalStorage(page);
  await page.goto("/");

  await expect(page.getByText("Dados de uma sessão local encontrados")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Importar dados locais" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Importar" }).click();

  await expect(page.getByText(/Importação concluída/)).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Dados de uma sessão local encontrados")).toHaveCount(0);

  await page.goto("/materias");
  await expect(page.getByRole("heading", { name: "Matéria Importada", level: 3 })).toBeVisible();

  // Idempotência: com a matéria já no servidor, o banner não deve mais aparecer
  // (mesmo que o localStorage ainda tenha o snapshot antigo).
  await page.goto("/");
  await expect(page.getByText("Dados de uma sessão local encontrados")).toHaveCount(0);
});
