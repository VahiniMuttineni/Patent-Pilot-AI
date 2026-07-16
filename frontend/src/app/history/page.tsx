"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Search, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Input } from "@/components/ui/input";
import { RiskBadge } from "@/components/patent/risk-badge";
import { formatDate } from "@/lib/utils";
import { RiskLevel } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { searchService } from "@/services/search.service";

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["allSearches"],
    queryFn: ({ signal }) => searchService.getAllSearches(signal)
  });

  const [inputValue, setInputValue] = useState("");
  const [query, setQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");

  useEffect(() => {
    const handler = setTimeout(() => {
      setQuery(inputValue);
    }, 400);
    return () => clearTimeout(handler);
  }, [inputValue]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => searchService.deleteSearch(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allSearches"] });
    },
    onError: (error: any) => {
      alert(`Could not delete analysis: ${error?.message || "Server error"}`);
    }
  });

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this analysis from your history?")) {
      deleteMutation.mutate(id);
    }
  };


  const filtered = useMemo(() => {
    return analyses.filter((a) => {
      const nameMatch = a.molecule?.name?.toLowerCase().includes(query.toLowerCase()) || false;
      const smilesMatch = a.molecule?.smiles?.toLowerCase().includes(query.toLowerCase()) || false;
      const matchesQuery = nameMatch || smilesMatch;
      const matchesRisk = riskFilter === "all" || a.overallRisk === riskFilter;
      return (query === "" || matchesQuery) && matchesRisk;
    });
  }, [analyses, query, riskFilter]);

  return (
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "History" }]}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors mb-4 font-medium group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>
        <h1 className="mb-1 text-xl font-semibold">Analysis History</h1>
        <p className="mb-6 text-sm text-text-secondary">Search and revisit any past analysis.</p>

        <div className="mb-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Search by molecule, SMILES, or target…"
              className="pl-9"
            />
          </div>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as RiskLevel | "all")}
            className="rounded-md border border-border bg-surface px-3 py-2 text-xs text-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary w-full sm:w-auto"
          >
            <option value="all">All risk levels</option>
            <option value="low">Low risk</option>
            <option value="moderate">Moderate</option>
            <option value="high">High risk</option>
          </select>
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-surface text-xs text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">Molecule</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Patents</th>
                <th className="px-4 py-3 font-medium">Risk</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                  </td>
                </tr>
              ) : filtered.map((a) => (
                <tr
                  key={a.id}
                  className="group border-b border-border last:border-0 hover:bg-surface-hover transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link href={a.status === "COMPLETED" ? `/analysis/${a.id}/workspace` : `/analysis/${a.id}/retrieval`} className="font-mono text-xs text-text-primary group-hover:text-primary">
                      {a.molecule.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{a.molecule.target ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-text-secondary tabular-nums">—</td>
                  <td className="px-4 py-3">{a.overallRisk && <RiskBadge level={a.overallRisk} />}</td>
                  <td className="px-4 py-3 text-xs text-text-secondary">{a.updatedAt ? formatDate(a.updatedAt) : "Recently"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => handleDelete(e, a.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-tertiary hover:bg-red-500/10 hover:text-red-400 transition-colors"
                      title="Delete analysis"
                    >
                      {deleteMutation.isPending && deleteMutation.variables === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-xs text-text-secondary">
                    No analyses match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
