"use client";

import { differenceInCalendarDays, parseISO } from "date-fns";
import { Hourglass } from "lucide-react";
import { useState } from "react";

import { ProfileDialog } from "@/components/layout/profile-dialog";
import { useRepo } from "@/lib/data/use-repo";

export function ExamCountdown() {
  const repo = useRepo();
  const profile = repo.profile.get();
  const [open, setOpen] = useState(false);

  const daysLeft = profile.examDate ? Math.max(0, differenceInCalendarDays(parseISO(profile.examDate), new Date())) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground transition-theme hover:text-foreground sm:flex"
      >
        <Hourglass className="h-4 w-4" />
        {daysLeft !== null ? (
          <span>
            Faltam <strong className="font-semibold text-foreground">{daysLeft}</strong> {daysLeft === 1 ? "dia" : "dias"}
            {profile.targetExam ? ` para ${profile.targetExam}` : ""}
          </span>
        ) : (
          <span>Defina a data da prova</span>
        )}
      </button>

      <ProfileDialog
        open={open}
        onOpenChange={setOpen}
        profile={profile}
        onSubmit={(patch) => {
          repo.profile.update(patch);
        }}
      />
    </>
  );
}
