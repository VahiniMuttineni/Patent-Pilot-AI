import { AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RiskLevel } from "@/types";

const CONFIG: Record<RiskLevel, { label: string; variant: "success" | "warning" | "danger"; icon: React.ElementType }> = {
  low: { label: "Low Patent Risk", variant: "success", icon: ShieldCheck },
  moderate: { label: "Requires Expert Review", variant: "warning", icon: ShieldAlert },
  high: { label: "High Patent Risk", variant: "danger", icon: AlertTriangle },
};

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const { label, variant, icon: Icon } = CONFIG[level];
  return (
    <Badge variant={variant} className={className}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
