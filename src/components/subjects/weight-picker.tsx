import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

const WEIGHTS = [1, 2, 3, 4, 5] as const;

export function WeightPicker({
  value,
  onChange,
  readOnly = false,
}: {
  value: number;
  onChange?: (weight: number) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex items-center gap-0.5" role={readOnly ? undefined : "radiogroup"} aria-label="Peso">
      {WEIGHTS.map((weight) => {
        const filled = weight <= value;
        if (readOnly) {
          return (
            <Star
              key={weight}
              className={cn("h-3.5 w-3.5", filled ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40")}
            />
          );
        }
        return (
          <button
            key={weight}
            type="button"
            role="radio"
            aria-checked={weight === value}
            aria-label={`Peso ${weight}`}
            onClick={() => onChange?.(weight)}
            className="p-0.5"
          >
            <Star className={cn("h-5 w-5", filled ? "fill-amber-500 text-amber-500" : "text-muted-foreground/40")} />
          </button>
        );
      })}
    </div>
  );
}
