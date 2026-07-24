import { z } from "zod";

export const sessionFormSchema = z
  .object({
    subjectId: z.string().min(1, "Selecione uma matéria"),
    topicId: z.string().nullable(),
    type: z.enum(["teoria", "questoes", "revisao", "lei_seca", "aula"]),
    startedAt: z.string().min(1, "Informe a data/hora de início"),
    durationMin: z.coerce.number().int("Duração deve ser um número inteiro de minutos").positive("Duração deve ser maior que zero"),
    questionsTotal: z.coerce.number().int().nonnegative().nullable(),
    questionsCorrect: z.coerce.number().int().nonnegative().nullable(),
    pagesRead: z.coerce.number().int().nonnegative().nullable(),
    notes: z.string().nullable(),
    scheduleReview: z.boolean(),
  })
  .refine(
    (data) =>
      data.questionsCorrect === null || data.questionsTotal === null || data.questionsCorrect <= data.questionsTotal,
    { message: "Acertos não pode ser maior que o total de questões", path: ["questionsCorrect"] },
  );

export type SessionFormData = z.infer<typeof sessionFormSchema>;
