import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  type LucideIcon,
  RefreshCw,
  Repeat2,
  StickyNote,
  Timer,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendario", label: "Calendário", icon: CalendarDays },
  { href: "/ciclo", label: "Ciclo", icon: RefreshCw },
  { href: "/materias", label: "Matérias", icon: BookOpen },
  { href: "/sessoes", label: "Sessões", icon: Timer },
  { href: "/revisoes", label: "Revisões", icon: Repeat2 },
  { href: "/anotacoes", label: "Anotações", icon: StickyNote },
];
