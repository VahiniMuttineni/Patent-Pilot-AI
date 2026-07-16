"use client";

import React from "react";
import Link from "next/link";
import { CheckCircle2, MessageSquareWarning, Circle } from "lucide-react";
import { Patent, ReviewStatus } from "@/types";
import { Badge } from "@/components/ui/badge";
import { SimilarityGauge } from "./similarity-gauge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<ReviewStatus, { label: string; icon: React.ElementType; className: string }> = {
  unreviewed: { label: "Unreviewed", icon: Circle, className: "text-text-tertiary" },
  approved: { label: "Approved", icon: CheckCircle2, className: "text-success" },
  disputed: { label: "Disputed", icon: MessageSquareWarning, className: "text-warning" },
};

export const PatentCard = React.memo(function PatentCard({ patent, analysisId }: { patent: Patent; analysisId: string }) {
  const status = STATUS_CONFIG[patent.status];
  const StatusIcon = status.icon;

  return (
    <Link
      href={`/analysis/${analysisId}/patents/${patent.id}`}
      className="group block rounded-lg border border-border bg-surface p-4 sm:p-5 transition-colors duration-150 hover:bg-surface-hover hover:border-text-tertiary/40"
    >
      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
        <div className="flex flex-col items-center shrink-0 w-14">
          <SimilarityGauge score={patent.similarityScore} risk={patent.riskLevel} />
          <span
            className={cn(
              "mt-1 text-[9px] font-bold uppercase tracking-wider text-center",
              patent.riskLevel === "low"
                ? "text-emerald-400"
                : patent.riskLevel === "moderate"
                ? "text-amber-400"
                : "text-rose-400"
            )}
          >
            {patent.riskLevel === "low" ? "Low Risk" : patent.riskLevel === "moderate" ? "Mod Risk" : "High Risk"}
          </span>
        </div>

        <div className="min-w-0 flex-1 w-full">
          <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-3">
            <h3 className="text-sm font-medium text-text-primary leading-snug group-hover:text-primary transition-colors">
              {patent.title}
            </h3>
            <span className={cn("flex items-center gap-1 shrink-0 text-xs self-start sm:self-auto", status.className)}>
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
            <span className="font-mono">{patent.patentNumber}</span>
            <span>·</span>
            <span>{patent.assignee}</span>
            <span>·</span>
            <span>{formatDate(patent.publicationDate)}</span>
            <Badge variant="neutral">{patent.source}</Badge>
            <Badge variant="neutral">{patent.jurisdiction}</Badge>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-text-secondary line-clamp-2">
            {patent.aiRationale}
          </p>
        </div>
      </div>
    </Link>
  );
});
