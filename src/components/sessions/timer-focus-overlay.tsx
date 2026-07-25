"use client";

import { Minimize2, Pause, Play, Square } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TimerFocusOverlayProps {
  subjectName: string;
  subjectColor: string;
  elapsedLabel: string;
  status: "running" | "paused";
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onExit: () => void;
}

/** Overlay em tela cheia do cronômetro — sem distrações, tempo legível de longe. Sair não para a contagem. */
export function TimerFocusOverlay({ subjectName, subjectColor, elapsedLabel, status, onPause, onResume, onStop, onExit }: TimerFocusOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-background">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onExit}
        aria-label="Minimizar modo foco"
        className="absolute top-4 right-4 text-muted-foreground"
      >
        <Minimize2 className="h-5 w-5" />
      </Button>

      <div data-testid="focus-mode-subject" className="flex items-center gap-2 text-lg text-muted-foreground">
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subjectColor }} />
        {subjectName}
      </div>

      <p className="font-mono text-7xl font-semibold tabular-nums sm:text-8xl md:text-9xl">{elapsedLabel}</p>

      <div className="flex items-center gap-3 opacity-70 transition-opacity hover:opacity-100">
        {status === "running" ? (
          <Button variant="outline" size="lg" onClick={onPause}>
            <Pause className="h-5 w-5" />
            Pausar
          </Button>
        ) : (
          <Button variant="outline" size="lg" onClick={onResume}>
            <Play className="h-5 w-5" />
            Retomar
          </Button>
        )}
        <Button variant="outline" size="lg" onClick={onStop}>
          <Square className="h-5 w-5" />
          Parar
        </Button>
      </div>
    </div>
  );
}
