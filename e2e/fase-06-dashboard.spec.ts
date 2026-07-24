import { addDays } from "date-fns";
import { expect, test, type Page } from "@playwright/test";

const STORAGE_KEY = "concursoflow-v1";

interface SeedSubject {
  id: string;
  name: string;
  color: string;
}

interface SeedSession {
  id: string;
  subjectId: string;
  type: "teoria" | "questoes" | "revisao" | "lei_seca" | "aula";
  startedAt: string;
  durationMin: number;
  questionsTotal?: number | null;
  questionsCorrect?: number | null;
}

/** Escreve subjects/sessions direto no localStorage antes da primeira navegação — evita montar dezenas de sessões via UI. */
async function seed(page: Page, subjects: SeedSubject[], sessions: SeedSession[]) {
  const state = {
    subjects: subjects.map((s) => ({ id: s.id, name: s.name, color: s.color, weight: 3, notes: null, createdAt: new Date().toISOString() })),
    sessions: sessions.map((s) => ({
      id: s.id,
      subjectId: s.subjectId,
      topicId: null,
      blockId: null,
      cycleId: null,
      cycleRound: null,
      type: s.type,
      startedAt: s.startedAt,
      durationMin: s.durationMin,
      questionsTotal: s.questionsTotal ?? null,
      questionsCorrect: s.questionsCorrect ?? null,
      pagesRead: null,
      notes: null,
      scheduleReview: false,
      createdAt: s.startedAt,
    })),
  };

  await page.addInitScript(
    ({ key, value }) => {
      localStorage.setItem(key, JSON.stringify({ state: value, version: 0 }));
    },
    { key: STORAGE_KEY, value: state },
  );
}

test("dashboard vazio mostra estados vazios em todos os gráficos, sem quebrar", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByTestId("stat-hours-today")).toHaveText("0.0h");
  await expect(page.getByTestId("stat-accuracy")).toHaveText("—");
  await expect(page.getByTestId("stat-streak")).toHaveText("0");
  await expect(page.getByRole("link", { name: "Registrar sessão" })).toHaveCount(5);
});

test("cards refletem sessões registradas: horas hoje, % de acerto e streak", async ({ page }) => {
  const now = new Date();

  await seed(
    page,
    [{ id: "s1", name: "Direito", color: "#3b82f6" }],
    [
      { id: "sess-hoje", subjectId: "s1", type: "teoria", startedAt: now.toISOString(), durationMin: 60 },
      {
        id: "sess-ontem",
        subjectId: "s1",
        type: "questoes",
        startedAt: addDays(now, -1).toISOString(),
        durationMin: 30,
        questionsTotal: 10,
        questionsCorrect: 8,
      },
      { id: "sess-anteontem", subjectId: "s1", type: "teoria", startedAt: addDays(now, -2).toISOString(), durationMin: 45 },
    ],
  );

  await page.goto("/");

  await expect(page.getByTestId("stat-hours-today")).toHaveText("1.0h");
  await expect(page.getByTestId("stat-accuracy")).toHaveText("80%");
  await expect(page.getByTestId("stat-streak")).toHaveText("3");
});

test("seletor de período altera o gráfico de horas por matéria", async ({ page }) => {
  const now = new Date();

  await seed(
    page,
    [
      { id: "s1", name: "Alfa", color: "#3b82f6" },
      { id: "s2", name: "Beta", color: "#f59e0b" },
    ],
    [
      { id: "sess-perto", subjectId: "s1", type: "teoria", startedAt: addDays(now, -2).toISOString(), durationMin: 60 },
      { id: "sess-longe", subjectId: "s2", type: "teoria", startedAt: addDays(now, -40).toISOString(), durationMin: 60 },
    ],
  );

  await page.goto("/");
  const chart = page.getByTestId("chart-hours-by-subject");

  // Padrão é 30 dias: só a sessão de 2 dias atrás entra.
  await expect(chart.getByText("Alfa")).toBeVisible();
  await expect(chart.getByText("Beta")).toHaveCount(0);

  await chart.getByRole("tab", { name: "90 dias" }).click();
  await expect(chart.getByText("Alfa")).toBeVisible();
  await expect(chart.getByText("Beta")).toBeVisible();

  await chart.getByRole("tab", { name: "7 dias" }).click();
  await expect(chart.getByText("Alfa")).toBeVisible();
  await expect(chart.getByText("Beta")).toHaveCount(0);
});
