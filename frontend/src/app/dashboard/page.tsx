"use client";

import Link from "next/link";
import { Plus, FlaskConical, AlertTriangle, FileText, ShieldCheck, Trash2, Loader2, Database, BrainCircuit, Activity, FileCheck, SearchCode, GitCommit, Workflow, Layers, CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { DiscoverySection } from "@/components/dashboard/DiscoverySection";
import { Card } from "@/components/ui/card";
import { RiskBadge } from "@/components/patent/risk-badge";
import { formatDate } from "@/lib/utils";
import { ChemicalStructure } from "@/components/workspace/chemical-structure";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchService } from "@/services/search.service";
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["allSearches"],
    queryFn: () => searchService.getAllSearches()
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => searchService.deleteSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSearches"] });
    }
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this analysis from your history?")) {
      deleteMutation.mutate(id);
    }
  };

  const getDisplayName = () => {
    if (typeof window !== "undefined") {
      if (user?.email) {
        const saved = localStorage.getItem(`pp_profile_name_${user.email}`);
        if (saved) return saved;
      }
      const lastSaved = localStorage.getItem("pp_profile_name_last");
      if (lastSaved) return lastSaved;
    }
    if (user?.email) {
      return user.email.split("@")[0]
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return "Researcher";
  };

  const highRiskCount = analyses.filter((a) => a.overallRisk === "high").length;
  const totalPriorArt = analyses.reduce((acc, a) => acc + (a.patents?.length || 5), 0);
  const clearToOperateCount = analyses.filter((a) => a.overallRisk === "low").length;

  const stats = [
    { 
      label: "High Risk Alerts", 
      value: highRiskCount, 
      icon: AlertTriangle,
      iconColor: "text-risk-high"
    },
    { 
      label: "Prior Art Overlaps", 
      value: totalPriorArt, 
      icon: FileText,
      iconColor: "text-primary"
    },
    { 
      label: "Clear to Operate (Low Risk)", 
      value: clearToOperateCount, 
      icon: ShieldCheck,
      iconColor: "text-risk-low"
    },
  ];

  return (
    <AppShell crumbs={[{ label: "Dashboard" }]}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-semibold">Welcome back, {getDisplayName()}</h1>
            <p className="text-sm text-text-secondary mt-1">Here's what needs your attention today.</p>
          </div>
          <Link href="/analysis/new" className="self-start sm:self-auto">
            <Button className="bg-gradient-accent text-white font-semibold shadow-glow hover:opacity-95 transition-all">
              <Plus className="h-4 w-4" /> New Analysis
            </Button>
          </Link>

        </div>

        {/* Discovery Section is now prominent at the top */}
        <div className="mb-12">
          <DiscoverySection />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-secondary font-medium">{s.label}</span>
                <s.icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
              <div className="mt-2 text-2xl font-semibold tabular-nums">{s.value}</div>
            </Card>
          ))}
        </div>

        <div className="w-full">
          <div>
            <h2 className="mb-3 text-sm font-medium text-text-secondary">Recent Analyses</h2>
            
            {isLoading ? (
              <Card className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </Card>
            ) : analyses.length === 0 ? (
              <EmptyAnalyses />
            ) : (
              <div className="space-y-3">
                {analyses.slice(0, 3).map((a) => (
                  <Link
                    key={a.id}
                    href={a.status === "COMPLETED" ? `/analysis/${a.id}/workspace` : `/analysis/${a.id}/retrieval`}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:bg-surface-hover hover:border-text-tertiary/40"
                  >
                    <div className="min-w-0 flex-1 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="shrink-0 rounded-md border border-border bg-background p-1.5 hidden sm:block">
                        <ChemicalStructure smiles={a.molecule.smiles} width={64} height={64} />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-sm text-text-primary break-all">{a.molecule.name}</span>
                          {a.molecule.target && (
                            <span className="text-xs text-text-tertiary">· {a.molecule.target}</span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs font-mono text-text-tertiary max-w-full sm:max-w-md">
                          {a.molecule.smiles}
                        </p>
                        <p className="mt-1 text-xs text-text-secondary">
                          {a.status === "COMPLETED" ? "Completed" : "Running"} · {a.updatedAt ? formatDate(a.updatedAt) : "Recently"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 self-end sm:self-center">
                      {a.overallRisk && <RiskBadge level={a.overallRisk} />}
                      <button
                        onClick={(e) => handleDelete(e, a.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete analysis"
                      >
                        {deleteMutation.isPending && deleteMutation.variables === a.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </Link>
                ))}
                {analyses.length > 3 && (
                  <Link href="/history" className="block mt-4">
                    <Button variant="secondary" className="w-full text-text-secondary hover:text-text-primary border border-border">
                      View All Recent Analyses
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function EmptyAnalyses() {
  return (
    <Card className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <FlaskConical className="h-8 w-8 text-text-tertiary" />
      <p className="text-sm text-text-secondary">You haven't run an analysis yet.</p>
      <Link href="/analysis/new">
        <Button size="sm" className="bg-gradient-accent text-white font-semibold shadow-glow hover:opacity-95 transition-all">
          <Plus className="h-4 w-4" /> Run your first analysis
        </Button>
      </Link>

    </Card>
  );
}
