export interface SeedSubject {
  name: string;
  color: string;
  weight: number;
  topics: string[];
}

/** 5 matérias típicas de concurso, usadas pelo botão "carregar dados de exemplo" (local e Supabase). */
export const SEED_SUBJECTS: SeedSubject[] = [
  { name: "Português", color: "#8b5cf6", weight: 4, topics: ["Crase", "Concordância verbal", "Regência nominal"] },
  { name: "Direito Constitucional", color: "#3b82f6", weight: 5, topics: ["Direitos fundamentais", "Organização do Estado"] },
  { name: "Direito Administrativo", color: "#10b981", weight: 5, topics: ["Atos administrativos", "Licitações"] },
  { name: "Raciocínio Lógico-Matemático", color: "#f59e0b", weight: 3, topics: ["Proposições", "Probabilidade"] },
  { name: "Informática", color: "#ec4899", weight: 2, topics: ["Segurança da informação", "Planilhas"] },
];
