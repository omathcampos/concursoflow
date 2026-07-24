// Paleta fixa de cores para matérias (blocos do calendário, gráficos, badges).

export interface SubjectColor {
  name: string;
  value: string;
}

export const SUBJECT_COLORS: SubjectColor[] = [
  { name: "violet", value: "#8b5cf6" },
  { name: "blue", value: "#3b82f6" },
  { name: "cyan", value: "#06b6d4" },
  { name: "emerald", value: "#10b981" },
  { name: "lime", value: "#84cc16" },
  { name: "amber", value: "#f59e0b" },
  { name: "orange", value: "#f97316" },
  { name: "red", value: "#ef4444" },
  { name: "pink", value: "#ec4899" },
  { name: "fuchsia", value: "#d946ef" },
  { name: "indigo", value: "#6366f1" },
  { name: "teal", value: "#14b8a6" },
];

export const DEFAULT_SUBJECT_COLOR = SUBJECT_COLORS[0].value;
