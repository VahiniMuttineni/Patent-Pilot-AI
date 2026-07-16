"use client";

import React, { useMemo, useState } from "react";


import { useParams } from "next/navigation";
import Link from "next/link";
import { FileText, SlidersHorizontal, Loader2, ArrowLeft } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { MoleculeSummaryPanel } from "@/components/workspace/molecule-summary-panel";
import dynamic from "next/dynamic";

const NotesPanel = dynamic(
  () => import("@/components/workspace/notes-panel").then((mod) => mod.NotesPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border p-5 text-xs text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading Notes Workspace...
      </div>
    )
  }
);

const AIAssistantPanel = dynamic(
  () => import("@/components/workspace/ai-assistant-panel").then((mod) => mod.AIAssistantPanel),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center p-5 text-xs text-text-tertiary">
        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading AI Copilot...
      </div>
    )
  }
);
import { PatentCard } from "@/components/patent/patent-card";
import { RiskLevel, Patent, ReviewStatus, ConfidenceBand } from "@/types";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { searchService } from "@/services/search.service";

type SortKey = "relevance" | "date" | "risk";

export default function AnalysisWorkspacePage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["searchResults", id],
    queryFn: ({ signal }) => searchService.getSearchResults(id, signal),
    staleTime: 5 * 60 * 1000,
  });

  const [sortKey, setSortKey] = useState<SortKey>("relevance");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");

  const patents = useMemo(() => {
    if (!data?.report?.analyses) return [];
    
    // Map backend PatentAnalysis to frontend Patent UI model
    let list: Patent[] = data.report.analyses.map((pa, idx) => {
      // Ensure confidence is parsed as a number safely
      const rawConf = Number(pa.confidence) || 0;
      const normScore = rawConf <= 1.0 && rawConf > 0 ? Math.round(rawConf * 100) : Math.round(rawConf);
      
      // Fake a publication date based on patent number year if possible, or fallback
      const yearMatch = pa.patent_number?.match(/20\d{2}/);
      const year = yearMatch ? yearMatch[0] : (2024 - (idx % 5)).toString(); // distribute dates
      const month = String(1 + (idx % 12)).padStart(2, '0');
      const fakeDate = `${year}-${month}-15T00:00:00.000Z`;

      return {
        id: `${id}-p${idx}`,
        patentNumber: pa.patent_number,
        title: pa.title || `Analysis for ${pa.patent_number}`,
        assignee: pa.assignee || "Unknown Assignee",
        abstract: pa.abstract || pa.relevance_reason || "",
        publicationDate: fakeDate,
        similarityScore: normScore,
        confidence: (normScore > 75 ? "high" : normScore > 45 ? "medium" : "low") as ConfidenceBand,
        riskLevel: (pa.risk_level?.toLowerCase() === "medium" ? "moderate" : (pa.risk_level?.toLowerCase() || "low")) as RiskLevel,
        status: "unreviewed" as ReviewStatus,
        aiRationale: pa.reasoning,
        jurisdiction: "US",
        source: "SureChEMBL",
        similarRegions: [],
        noveltyConcerns: pa.novelty_concerns ? [pa.novelty_concerns] : [],
        claims: []
      };
    });

    if (riskFilter !== "all") {
      list = list.filter((p) => p.riskLevel === riskFilter);
    }
    
    if (sortKey === "relevance") {
      list.sort((a, b) => b.similarityScore - a.similarityScore);
    } else if (sortKey === "date") {
      list.sort((a, b) => new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime());
    } else if (sortKey === "risk") {
      // Low risk at the top, high risk at the bottom
      const order = { low: 0, moderate: 1, high: 2 };
      list.sort((a, b) => {
        const diff = order[a.riskLevel] - order[b.riskLevel];
        if (diff !== 0) return diff;
        // Tie breaker: relevance
        return b.similarityScore - a.similarityScore;
      });
    }
    
    return list;
  }, [data, sortKey, riskFilter, id]);

  // Construct a mock analysis object to satisfy the legacy MoleculeSummaryPanel props for now
  const mockAnalysis = useMemo(() => ({
    id,
    molecule: { 
      name: data?.compound_name || "Compound Analysis", 
      smiles: data?.input_smiles || "",
      metadata: data?.molecule_metadata
    },
    status: "reported" as any,
    overallRisk: ((data?.report?.analyses[0]?.risk_level?.toLowerCase() === "medium" ? "moderate" : data?.report?.analyses[0]?.risk_level?.toLowerCase()) || "low") as RiskLevel,
    patents: patents,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: ""
  }), [id, data, patents]);

  if (isLoading) {
    return (
      <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Loading..." }]}>
        <div className="flex h-[calc(100vh-56px)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: data?.compound_name || "AI Analysis" },
      ]}
    >
      <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-56px)] overflow-x-hidden">
        <MoleculeSummaryPanel analysis={mockAnalysis} />

        <div className="flex-1 overflow-y-auto min-w-0">
          <div className="sticky top-0 z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border bg-background/90 px-4 sm:px-6 py-3 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-md hover:bg-surface-hover border border-border/60 bg-surface/50 font-medium group mr-1"
                title="Back to Dashboard"
              >
                <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>
              <SlidersHorizontal className="h-3.5 w-3.5 text-text-tertiary shrink-0" />
              <FilterChip label="All" active={riskFilter === "all"} onClick={() => setRiskFilter("all")} />

              <FilterChip label="High risk" active={riskFilter === "high"} onClick={() => setRiskFilter("high")} />
              <FilterChip label="Moderate" active={riskFilter === "moderate"} onClick={() => setRiskFilter("moderate")} />
              <FilterChip label="Low risk" active={riskFilter === "low"} onClick={() => setRiskFilter("low")} />
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary flex-1 sm:flex-initial"
              >
                <option value="relevance">Sort: Relevance</option>
                <option value="date">Sort: Publication date</option>
                <option value="risk">Sort: Risk level</option>
              </select>
              <Link href={`/analysis/${id}/report`} className="flex-1 sm:flex-initial">
                <Button size="sm" variant="secondary" className="w-full sm:w-auto">
                  <FileText className="h-3.5 w-3.5" /> Generate Report
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-3 p-4 sm:p-6">
            {patents.map((p) => (
              <PatentCard key={p.id} patent={p} analysisId={id} />
            ))}
            {patents.length === 0 && (
              <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-text-secondary">
                No patents match this filter.
              </div>
            )}
          </div>
        </div>

        <NotesPanel initialNotes={mockAnalysis.notes} />
      </div>

      <AIAssistantPanel patentCount={patents.length} analysisId={id} />
    </AppShell>
  );
}

const FilterChip = React.memo(function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-[6px] px-2.5 py-1 text-xs transition-colors",
        active ? "bg-surface-hover text-text-primary" : "text-text-secondary hover:text-text-primary"
      )}
    >
      {label}
    </button>
  );
});
