"use client";

import { ImportLocalDataBanner } from "@/components/data/import-local-data-banner";
import { HoursByDayChart } from "@/components/dashboard/hours-by-day-chart";
import { HoursBySubjectChart } from "@/components/dashboard/hours-by-subject-chart";
import { QuestionsPerformanceTable } from "@/components/dashboard/questions-performance-table";
import { SidePanel } from "@/components/dashboard/side-panel";
import { StatCards } from "@/components/dashboard/stat-cards";
import { StudyTypeDonut } from "@/components/dashboard/study-type-donut";
import { WeeklyEvolutionChart } from "@/components/dashboard/weekly-evolution-chart";
import { useRepo } from "@/lib/data/use-repo";

export default function DashboardPage() {
  const repo = useRepo();
  const subjects = repo.subjects.list();
  const sessions = repo.sessions.list();
  const reviews = repo.reviews.list();
  const cycle = repo.cycle.getActive();
  const cycleEntries = cycle ? repo.cycle.entries(cycle.id) : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Visão geral do seu progresso.</p>
      </div>

      <ImportLocalDataBanner />

      <StatCards sessions={sessions} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <HoursBySubjectChart sessions={sessions} subjects={subjects} />
            <HoursByDayChart sessions={sessions} subjects={subjects} />
          </div>

          <WeeklyEvolutionChart sessions={sessions} />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <StudyTypeDonut sessions={sessions} />
            <QuestionsPerformanceTable sessions={sessions} subjects={subjects} />
          </div>
        </div>

        <SidePanel subjects={subjects} cycleEntries={cycleEntries} reviews={reviews} />
      </div>
    </div>
  );
}
