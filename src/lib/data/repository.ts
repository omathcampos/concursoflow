import type { Annotation, Block, Cycle, CycleEntry, Subject, Topic } from "@/lib/data/types";

export interface CrudRepo<T, Managed extends keyof T> {
  list(): T[];
  get(id: string): T | undefined;
  create(input: Omit<T, Managed>): T;
  update(id: string, patch: Partial<Omit<T, Managed>>): T;
  remove(id: string): void;
}

export interface CycleSetupEntry {
  subjectId: string;
  targetMinutes: number;
}

export interface CycleRepo {
  getActive(): Cycle | undefined;
  entries(cycleId: string): CycleEntry[];
  setup(name: string, entries: CycleSetupEntry[]): Cycle;
  addProgress(cycleId: string, subjectId: string, minutes: number): void;
  startNewRound(cycleId: string): Cycle;
}

export type DeleteScope = "this" | "future";

export interface BlockRepo extends CrudRepo<Block, "id" | "createdAt"> {
  /** Cria uma série de blocos semanais (mesma matéria/horário, uma ocorrência por semana). */
  createSeries(input: Omit<Block, "id" | "createdAt" | "recurrenceRule">, weeksCount: number): Block[];
  /** Remove só esta ocorrência, ou esta e todas as futuras da mesma série. */
  removeSeries(id: string, scope: DeleteScope): void;
}

export interface Repository {
  subjects: CrudRepo<Subject, "id" | "createdAt">;
  topics: CrudRepo<Topic, "id" | "createdAt">;
  annotations: CrudRepo<Annotation, "id" | "createdAt" | "updatedAt">;
  cycle: CycleRepo;
  blocks: BlockRepo;
}
