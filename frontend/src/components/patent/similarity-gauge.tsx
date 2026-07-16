import { RiskLevel } from "@/types";
import { cn } from "@/lib/utils";

const COLOR_BY_RISK: Record<RiskLevel, string> = {
  low: "hsl(var(--success))",
  moderate: "hsl(var(--warning))",
  high: "hsl(var(--danger))",
};

export function SimilarityGauge({
  score,
  risk,
  size = 56,
}: {
  score: number;
  risk: RiskLevel;
  size?: number;
}) {
  const normalizedScore = score <= 1.0 && score > 0 ? Math.round(score * 100) : Math.round(score);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - normalizedScore / 100);
  const color = COLOR_BY_RISK[risk];

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Similarity score ${normalizedScore} out of 100, ${risk} risk`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth={4}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
      </svg>
      <div
        className={cn("absolute inset-0 flex items-center justify-center text-xs font-semibold")}
        style={{ color }}
      >
        {normalizedScore}%
      </div>
    </div>
  );
}
