import { Sparkles } from "lucide-react";
import { ConfidenceBand } from "@/types";
import { ConfidenceMeter } from "./confidence-meter";

export function AIInsightCard({
  rationale,
  confidence,
  sourceLabel,
}: {
  rationale: string;
  confidence: ConfidenceBand;
  sourceLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-primary/20 bg-primary/[0.06] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">AI Rationale</span>
      </div>
      <p className="text-sm leading-relaxed text-text-primary">{rationale}</p>
      <div className="mt-3 flex items-center justify-between">
        <ConfidenceMeter band={confidence} />
        {sourceLabel && <span className="text-xs font-mono text-text-tertiary">{sourceLabel}</span>}
      </div>
    </div>
  );
}
