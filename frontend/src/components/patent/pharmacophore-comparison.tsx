"use client";

import { useEffect, useState } from "react";
import { Sparkles, Check, X, ShieldAlert, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComparisonResult {
  query_smiles: string;
  target_smiles: string;
  tanimoto_similarity: number;
  mcs_smarts: string;
  matched_atoms: number;
  matched_bonds: number;
  total_query_atoms: number;
  total_target_atoms: number;
  mcs_coverage_pct: number;
  matched_features: string[];
  unmatched_features: string[];
}

interface PharmacophoreComparisonProps {
  querySmiles?: string;
  targetSmiles?: string;
  className?: string;
  onComputed?: (tanimoto: number, mcs: number) => void;
}

export function PharmacophoreFeatureComparison({
  querySmiles,
  targetSmiles,
  className,
  onComputed,
}: PharmacophoreComparisonProps) {
  const [data, setData] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!querySmiles) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const tSmiles = targetSmiles || querySmiles;

    fetch(
      `${apiUrl}/molecules/compare?query_smiles=${encodeURIComponent(
        querySmiles
      )}&target_smiles=${encodeURIComponent(tSmiles)}`
    )
      .then((res) => res.json())
      .then((resData) => {
        const result = resData.data || resData;
        setData(result);
        setLoading(false);
        if (onComputed && result) {
          onComputed(result.tanimoto_similarity ?? 0, result.mcs_coverage_pct ?? 0);
        }
      })
      .catch(() => {
        setLoading(false);
      });
  }, [querySmiles, targetSmiles, onComputed]);

  if (loading || !data) {
    return (
      <div className={cn("mt-4 animate-pulse rounded-lg border border-border bg-background p-4 text-xs text-text-tertiary", className)}>
        Computing RDKit Maximum Common Substructure (MCS) & Pharmacophore Match...
      </div>
    );
  }

  // Safe destructuring with defaults to prevent runtime crashes if API fields are missing
  const {
    mcs_coverage_pct = 0,
    tanimoto_similarity = 0,
    matched_features = [],
    unmatched_features = [],
    matched_atoms = 0,
    total_query_atoms = 0,
    matched_bonds = 0
  } = data;

  return (
    <div className={cn("mt-4 rounded-lg border border-border bg-background p-4 text-left", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3 mb-3.5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
          Matched Features & RDKit Substructure Diagnostics
        </h4>
        <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
          <span className="rounded bg-primary/10 px-2 py-0.5 font-medium text-primary border border-primary/20">
            MCS Coverage: {mcs_coverage_pct}%
          </span>
          <span className="rounded bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-400 border border-emerald-500/20">
            Tanimoto Sim: {tanimoto_similarity.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        {/* Left Column: Pharmacophore Matches */}
        <div className="space-y-2">
          <p className="font-medium text-text-secondary flex items-center gap-1">
            <Layers className="h-3.5 w-3.5 text-text-tertiary" />
            Pharmacophore Scaffolds & Functional Groups
          </p>
          
          <ul className="space-y-1.5 font-mono text-[11px]">
            {matched_features.map((feat: string, idx: number) => (
              <li key={idx} className="flex items-center gap-2 text-text-primary">
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>{feat}</span>
              </li>
            ))}
            {unmatched_features.map((feat: string, idx: number) => (
              <li key={`un-${idx}`} className="flex items-center gap-2 text-text-tertiary">
                <X className="h-3.5 w-3.5 text-warning/70 shrink-0" />
                <span className="line-through">{feat}</span>
                <span className="text-[10px] text-warning/70">(Missing in target)</span>
              </li>
            ))}
            {matched_features.length === 0 && unmatched_features.length === 0 && (
              <li className="text-text-tertiary italic">No standard pharmacophore rings detected.</li>
            )}
          </ul>
        </div>

        {/* Right Column: Quantitative Metrics */}
        <div className="space-y-2 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-5">
          <p className="font-medium text-text-secondary">Quantitative Substructure Match</p>
          
          <div className="space-y-2 text-text-secondary pt-0.5">
            <div className="flex justify-between items-center">
              <span>Matched Heavy Atoms:</span>
              <span className="font-mono font-medium text-text-primary">
                {matched_atoms} / {total_query_atoms} ({mcs_coverage_pct}%)
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span>Matched Bonds:</span>
              <span className="font-mono font-medium text-text-primary">{matched_bonds}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Morgan Fingerprint Sim (2048-bit):</span>
              <span className="font-mono font-bold text-emerald-400">{tanimoto_similarity.toFixed(3)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Markush Claim Compatibility:</span>
              <span className="font-mono font-medium text-primary">
                {tanimoto_similarity >= 0.8 ? "High (Direct Scaffold)" : tanimoto_similarity >= 0.5 ? "Moderate (Substructure)" : "Low (Distinct Scaffold)"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
