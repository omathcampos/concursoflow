import type { Annotation, Block, CalendarFeed, Cycle, CycleEntry, NotificationPrefs, Profile, Review, Session, Subject, Topic } from "@/lib/data/types";

// Leituras (list/get/entries/getActive) são síncronas: cada implementação de
// Repository é responsável por manter um cache local sempre atualizado (o
// LocalRepository é o próprio Zustand; o SupabaseRepository hidrata um
// cache Zustand a partir do banco). Mutações são assíncronas de verdade —
// fazem I/O real e só then atualizam o cache. Ver CLAUDE.md ("Arquitetura
// essencial") para a justificativa completa.
export interface CrudRepo<T, Managed extends keyof T> {
  list(): T[];
  get(id: string): T | undefined;
  create(input: Omit<T, Managed>): Promise<T>;
  update(id: string, patch: Partial<Omit<T, Managed>>): Promise<T>;
  remove(id: string): Promise<void>;
}

export interface CycleSetupEntry {
  subjectId: string;
  targetMinutes: number;
}

export interface CycleRepo {
  getActive(): Cycle | undefined;
  /** doneMinutes é derivado das sessões da rodada atual — nunca armazenado diretamente. */
  entries(cycleId: string): CycleEntry[];
  setup(name: string, entries: CycleSetupEntry[]): Promise<Cycle>;
  startNewRound(cycleId: string): Promise<Cycle>;
}

export type DeleteScope = "this" | "future";

export interface BlockRepo extends CrudRepo<Block, "id" | "createdAt"> {
  /** Cria uma série de blocos semanais (mesma matéria/horário, uma ocorrência por semana). */
  createSeries(input: Omit<Block, "id" | "createdAt" | "recurrenceRule">, weeksCount: number): Promise<Block[]>;
  /** Remove só esta ocorrência, ou esta e todas as futuras da mesma série. */
  removeSeries(id: string, scope: DeleteScope): Promise<void>;
}

export interface ReviewRepo extends CrudRepo<Review, "id" | "createdAt"> {
  /** Marca concluída e agenda a próxima do ciclo (D+7/D+30), se houver. */
  complete(id: string): Promise<void>;
  /** Marca pulada — não agenda a próxima. */
  skip(id: string): Promise<void>;
}

export interface ProfileRepo {
  get(): Profile;
  update(patch: Partial<Pick<Profile, "displayName" | "targetExam" | "examDate">>): Promise<Profile>;
}

export type NotificationTestResult = { skipped: string } | { email?: "sent"; telegram?: "sent" };

export interface NotificationsRepo {
  get(): NotificationPrefs | undefined;
  update(
    patch: Partial<Pick<NotificationPrefs, "dailyEnabled" | "dailyHour" | "weeklyEnabled" | "overdueEnabled" | "channelEmail" | "timezone">>,
  ): Promise<NotificationPrefs>;
  /** Gera código de uso único (10min) pro fluxo `/start CODIGO` do bot do Telegram. */
  generateTelegramLinkCode(): Promise<{ code: string; expiresAt: string }>;
  /** Confere se o vínculo já foi concluído (usuário clicou no link e mandou /start no bot) e atualiza o cache. */
  refreshTelegramLink(): Promise<NotificationPrefs>;
  unlinkTelegram(): Promise<void>;
  sendTest(type: "daily" | "weekly" | "overdue"): Promise<NotificationTestResult>;
}

export interface CalendarFeedRepo {
  get(): CalendarFeed | undefined;
  /** Invalida a URL antiga (nova UUID) — usado quando o usuário suspeita que a URL vazou. */
  regenerateToken(): Promise<CalendarFeed>;
  setIncludeReviews(value: boolean): Promise<CalendarFeed>;
}

export interface Repository {
  subjects: CrudRepo<Subject, "id" | "createdAt">;
  topics: CrudRepo<Topic, "id" | "createdAt">;
  annotations: CrudRepo<Annotation, "id" | "createdAt" | "updatedAt">;
  cycle: CycleRepo;
  blocks: BlockRepo;
  sessions: CrudRepo<Session, "id" | "createdAt">;
  reviews: ReviewRepo;
  profile: ProfileRepo;
  notifications: NotificationsRepo;
  calendarFeed: CalendarFeedRepo;
}
