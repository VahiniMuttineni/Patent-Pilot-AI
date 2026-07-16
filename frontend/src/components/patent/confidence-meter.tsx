import { ConfidenceBand } from "@/types";
import { cn } from "@/lib/utils";

const BANDS: ConfidenceBand[] = ["low", "medium", "high"];
const LABEL: Record<ConfidenceBand, string> = { low: "Low confidence", medium: "Medium confidence", high: "High confidence" };
const ACTIVE_COUNT: Record<ConfidenceBand, number> = { low: 1, medium: 2, high: 3 };

export function ConfidenceMeter({ band }: { band: ConfidenceBand }) {
  const active = ACTIVE_COUNT[band];
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1" role="img" aria-label={LABEL[band]}>
        {BANDS.map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 w-5 rounded-full transition-colors",
              i < active ? "bg-secondary" : "bg-border"
            )}
          />
        ))}
      </div>
      <span className="text-xs text-text-secondary">{LABEL[band]}</span>
    </div>
  );
}
