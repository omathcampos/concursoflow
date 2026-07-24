import { Check } from "lucide-react";

import { SUBJECT_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUBJECT_COLORS.map((color) => {
        const selected = color.value.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={color.value}
            type="button"
            aria-label={color.name}
            aria-pressed={selected}
            onClick={() => onChange(color.value)}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition-all",
              selected && "ring-2 ring-foreground",
            )}
            style={{ backgroundColor: color.value }}
          >
            {selected ? <Check className="h-4 w-4 text-white drop-shadow" /> : null}
          </button>
        );
      })}
    </div>
  );
}
