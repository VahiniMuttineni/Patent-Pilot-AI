"use client";

import { useState, useMemo } from "react";


import { useParams } from "next/navigation";
import Link from "next/link";
import { Download, FileDown, Pencil, ArrowLeft, Loader2, Eye, LayoutTemplate } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { RiskBadge } from "@/components/patent/risk-badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { searchService } from "@/services/search.service";
import { ChemicalStructure } from "@/components/workspace/chemical-structure";
import { buildStructuredReportModel, generateEnterpriseDocxReport } from "@/services/report-generator";
import { EnterprisePrintableReport } from "@/components/report/EnterprisePrintableReport";

const SECTIONS = [
  { id: "compound-identity", label: "Compound Analysis & Identity" },
  { id: "summary", label: "Executive Summary" },
  { id: "key-patents", label: "Key Similar Patents" },
  { id: "novelty", label: "Novelty Concerns" },
  { id: "manual-review", label: "Patents Requiring Manual Review" },
  { id: "recommendation", label: "Overall Recommendation" },
  { id: "appendix", label: "Appendix" },
];

export default function PatentReportPage() {
  const { id } = useParams<{ id: string }>();
  
  const { data, isLoading } = useQuery({
    queryKey: ["searchResults", id],
    queryFn: () => searchService.getSearchResults(id)
  });

  const [active, setActive] = useState(SECTIONS[0].id);
  const [edited, setEdited] = useState<Record<string, boolean>>({});
  const [exportingDocx, setExportingDocx] = useState(false);
  const [viewMode, setViewMode] = useState<"interactive" | "enterprise">("interactive");

  const structuredModel = useMemo(() => {
    if (!data) return null;
    return buildStructuredReportModel(data);
  }, [data]);

  if (isLoading) {
    return (
      <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Loading..." }]}>
        <div className="flex h-[calc(100vh-56px)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const report = data?.report;
  const analyses = report?.analyses || [];
  const meta: any = data?.molecule_metadata || {};
  
  const highRisk = analyses.filter((p) => p.risk_level.toLowerCase() === "high");
  const moderate = analyses.filter((p) => p.risk_level.toLowerCase() === "moderate");
  const rawRisk = analyses[0]?.risk_level.toLowerCase() || "moderate";
  const risk = (rawRisk === "medium" ? "moderate" : rawRisk) as "low" | "moderate" | "high";

  const handleExportDocx = async () => {
    if (!structuredModel) return;
    try {
      setExportingDocx(true);
      const blob = await generateEnterpriseDocxReport(structuredModel);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${structuredModel.reportId}_${structuredModel.compoundName.replace(/[^a-zA-Z0-9]/g, '_')}_Report.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to generate DOCX", e);
      alert("Failed to generate enterprise DOCX report.");
    } finally {
      setExportingDocx(false);
    }
  };

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: data?.compound_name || "AI Analysis", href: `/analysis/${id}/workspace` },
        { label: "Report" },
      ]}
    >
      <div className="flex flex-col md:flex-row h-auto md:h-[calc(100vh-56px)] print:hidden">
        {/* Mobile Section Nav & Actions */}
        <div className="md:hidden flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface p-3 sticky top-14 z-20">
          <select
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              const el = document.getElementById(e.target.value);
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary flex-1"
          >
            {SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                Jump to: {s.label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="secondary" className="px-2.5 py-1 text-xs h-8" onClick={() => window.print()}>
              <FileDown className="h-3.5 w-3.5" /> PDF
            </Button>
            <Button size="sm" variant="secondary" className="px-2.5 py-1 text-xs h-8" disabled={exportingDocx} onClick={handleExportDocx}>
              <Download className="h-3.5 w-3.5" /> {exportingDocx ? "DOCX..." : "DOCX"}
            </Button>
          </div>
        </div>

        {/* Desktop Section nav */}
        <div className="hidden w-64 shrink-0 border-r border-border bg-surface p-4 md:block overflow-y-auto">
          <p className="mb-3 px-2 text-[11px] font-medium uppercase tracking-wide text-text-tertiary font-heading">
            Report sections
          </p>
          <nav className="space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setActive(s.id);
                  const el = document.getElementById(s.id);
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }}
                className={cn(
                  "block w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                  active === s.id
                    ? "bg-surface-hover text-text-primary font-medium"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {s.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 space-y-2 border-t border-border pt-4">
            <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-text-tertiary mb-2">
              Enterprise Deliverables
            </p>
            <Button
              size="sm"
              variant={viewMode === "enterprise" ? "primary" : "secondary"}
              className="w-full justify-start text-xs font-medium"
              onClick={() => setViewMode(viewMode === "enterprise" ? "interactive" : "enterprise")}
            >
              <LayoutTemplate className="h-3.5 w-3.5 mr-2 shrink-0" />
              {viewMode === "enterprise" ? "Interactive Web View" : "A4 Print / PDF Preview"}
            </Button>
            <Button size="sm" variant="secondary" className="w-full justify-start text-xs font-medium" onClick={() => window.print()}>
              <FileDown className="h-3.5 w-3.5 mr-2 shrink-0" /> Export Enterprise PDF
            </Button>
            <Button size="sm" variant="secondary" className="w-full justify-start text-xs font-medium" disabled={exportingDocx} onClick={handleExportDocx}>
              {exportingDocx ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-2 shrink-0" />}
              {exportingDocx ? "Generating DOCX..." : "Export Native DOCX"}
            </Button>
          </div>
        </div>

        {/* Document preview */}
        <div className="flex-1 overflow-y-auto bg-background min-w-0">
          {viewMode === "enterprise" && structuredModel ? (
            <div className="py-8 bg-slate-100 min-h-full">
              <div className="mx-auto max-w-[210mm] px-4 mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div>
                  <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                    <LayoutTemplate className="w-4 h-4 text-indigo-600" /> Enterprise A4 Print Layout Preview
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    This exact layout renders cleanly into PDF without web navigation, sidebars, or scrollbars when exported.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="secondary" className="h-8 text-xs" onClick={() => setViewMode("interactive")}>
                    <Eye className="w-3.5 h-3.5 mr-1" /> Web View
                  </Button>
                  <Button size="sm" className="h-8 text-xs bg-indigo-900 hover:bg-indigo-800 text-white" onClick={() => window.print()}>
                    <FileDown className="h-3.5 w-3.5 mr-1" /> Print PDF
                  </Button>
                  <Button size="sm" variant="secondary" className="h-8 text-xs border border-indigo-200 text-indigo-900 hover:bg-indigo-50" disabled={exportingDocx} onClick={handleExportDocx}>
                    <Download className="w-3.5 h-3.5 mr-1" /> DOCX
                  </Button>
                </div>
              </div>
              <EnterprisePrintableReport model={structuredModel} />
            </div>
          ) : (
            <div id="report-content" className="mx-auto max-w-2xl px-4 sm:px-8 py-8 sm:py-10 font-serif text-text-primary">
            <div className="mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border pb-6">
              <div>
                <Link
                  href={`/analysis/${id}/workspace`}
                  className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors mb-3 font-sans font-medium group"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  Back to Workspace
                </Link>
                <h1 className="text-xl sm:text-2xl font-semibold">Patentability Report</h1>
                <p className="mt-1 font-sans text-xs text-text-secondary">
                  {data?.compound_name || "Compound Analysis"} · Generated Report
                </p>
              </div>
              <div className="self-start sm:self-auto">
                <RiskBadge level={risk} />
              </div>
            </div>

            <EditableSection
              id="compound-identity"
              title="Molecule Summary & Deterministic Identity Resolution"
              edited={edited}
              setEdited={setEdited}
            >
              <div className="font-sans space-y-4 text-sm">
                {/* Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface p-4 rounded-xl border border-border shadow-soft">
                  <div>
                    <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider block">Preferred Compound Name</span>
                    <h2 className="text-xl font-bold text-text-primary">
                      {meta.preferred_name || meta.compound_name || data?.compound_name || "Compound Analysis"}
                    </h2>
                    {meta.iupac_name && meta.iupac_name !== (meta.preferred_name || meta.compound_name) && (
                      <p className="text-xs text-text-secondary italic mt-0.5" title={meta.iupac_name}>
                        IUPAC: {meta.iupac_name}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1 font-mono text-xs">
                    <span className="inline-flex items-center rounded-md bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary border border-primary/20">
                      {meta.molecular_formula}
                    </span>
                    <span className="text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {meta.resolution_confidence ?? 95}% Confidence ({meta.compound_resolution_status || "VERIFIED"})
                    </span>
                  </div>
                </div>

                {/* Structure and Public Database Identifiers Table */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                  <div className="rounded-xl border border-border bg-background p-3 flex justify-center items-center">
                    <ChemicalStructure smiles={meta.canonical_smiles || data?.input_smiles || ""} height={200} />
                  </div>

                  <div className="rounded-xl border border-border bg-surface p-4 space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-text-tertiary uppercase block mb-1">Public Database Identifiers</span>
                      <dl className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div className="bg-background p-2 rounded border border-border">
                          <dt className="text-[9px] text-text-tertiary uppercase">PubChem CID</dt>
                          <dd className="font-bold text-text-primary">{meta.pubchem_cid ?? "N/A"}</dd>
                        </div>
                        <div className="bg-background p-2 rounded border border-border">
                          <dt className="text-[9px] text-text-tertiary uppercase">ChEMBL ID</dt>
                          <dd className="font-bold text-text-primary">{meta.chembl_id ?? "N/A"}</dd>
                        </div>
                        <div className="bg-background p-2 rounded border border-border">
                          <dt className="text-[9px] text-text-tertiary uppercase">ChemSpider ID</dt>
                          <dd className="font-bold text-text-primary">{meta.chemspider_id ?? "N/A"}</dd>
                        </div>
                        <div className="bg-background p-2 rounded border border-border">
                          <dt className="text-[9px] text-text-tertiary uppercase">Classification</dt>
                          <dd className="font-bold text-text-primary truncate" title={meta.compound_classification}>
                            {meta.compound_classification || "Small Molecule"}
                          </dd>
                        </div>
                      </dl>
                    </div>

                    {meta.synonyms && meta.synonyms.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-text-tertiary uppercase block mb-1">Common Synonyms</span>
                        <div className="flex flex-wrap gap-1">
                          {meta.synonyms.slice(0, 4).map((syn: string, i: number) => (
                            <span key={i} className="text-[10px] text-text-secondary bg-background px-2 py-0.5 rounded border border-border">
                              {syn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Physicochemical & Descriptors Table */}
                <div className="rounded-xl border border-border bg-surface p-4">
                  <span className="text-xs font-bold text-text-tertiary uppercase tracking-wider block mb-3">Physicochemical Descriptors</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                    <div className="bg-background p-2.5 rounded border border-border">
                      <span className="text-[9px] text-text-tertiary uppercase block">Molecular Weight</span>
                      <span className="font-semibold text-text-primary">{meta.molecular_weight} g/mol</span>
                    </div>
                    <div className="bg-background p-2.5 rounded border border-border">
                      <span className="text-[9px] text-text-tertiary uppercase block">Exact Mass</span>
                      <span className="font-semibold text-text-primary">{meta.exact_mass ?? meta.molecular_weight}</span>
                    </div>
                    <div className="bg-background p-2.5 rounded border border-border">
                      <span className="text-[9px] text-text-tertiary uppercase block">LogP</span>
                      <span className="font-semibold text-text-primary">{meta.logp ?? "N/A"}</span>
                    </div>
                    <div className="bg-background p-2.5 rounded border border-border">
                      <span className="text-[9px] text-text-tertiary uppercase block">TPSA</span>
                      <span className="font-semibold text-text-primary">{meta.tpsa ?? "N/A"} Å²</span>
                    </div>
                    <div className="bg-background p-2.5 rounded border border-border">
                      <span className="text-[9px] text-text-tertiary uppercase block">Heavy Atoms</span>
                      <span className="font-semibold text-text-primary">{meta.heavy_atom_count ?? "N/A"}</span>
                    </div>
                    <div className="bg-background p-2.5 rounded border border-border">
                      <span className="text-[9px] text-text-tertiary uppercase block">Ring Count</span>
                      <span className="font-semibold text-text-primary">{meta.ring_count ?? "N/A"}</span>
                    </div>
                    <div className="bg-background p-2.5 rounded border border-border">
                      <span className="text-[9px] text-text-tertiary uppercase block">Rotatable Bonds</span>
                      <span className="font-semibold text-text-primary">{meta.num_rotatable_bonds ?? 0}</span>
                    </div>
                    <div className="bg-background p-2.5 rounded border border-border">
                      <span className="text-[9px] text-text-tertiary uppercase block">HBD / HBA</span>
                      <span className="font-semibold text-text-primary">{meta.num_hbd ?? 0} / {meta.num_hba ?? 0}</span>
                    </div>
                  </div>
                </div>

                {/* Structure Notation Specs */}
                <div className="space-y-2 rounded-xl border border-border bg-background p-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-text-tertiary uppercase block mb-0.5">Canonical SMILES</span>
                    <p className="font-mono text-xs break-all text-text-primary select-all">
                      {meta.canonical_smiles || data?.input_smiles}
                    </p>
                  </div>
                  {meta.isomeric_smiles && (
                    <div>
                      <span className="text-[10px] font-bold text-text-tertiary uppercase block mb-0.5">Isomeric SMILES</span>
                      <p className="font-mono text-xs break-all text-text-secondary select-all">
                        {meta.isomeric_smiles}
                      </p>
                    </div>
                  )}
                  {meta.inchi && (
                    <div>
                      <span className="text-[10px] font-bold text-text-tertiary uppercase block mb-0.5">InChI</span>
                      <p className="font-mono text-xs break-all text-text-secondary select-all">
                        {meta.inchi}
                      </p>
                    </div>
                  )}
                  {meta.inchikey && (
                    <div>
                      <span className="text-[10px] font-bold text-text-tertiary uppercase block mb-0.5">InChIKey</span>
                      <p className="font-mono text-xs break-all text-text-primary select-all">
                        {meta.inchikey}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </EditableSection>


            <EditableSection
              id="summary"
              title="Executive Summary"
              edited={edited}
              setEdited={setEdited}
            >
              <p>
                {report?.executive_summary || "No executive summary available."}
              </p>
            </EditableSection>

            <EditableSection id="key-patents" title="Key Similar Patents" edited={edited} setEdited={setEdited}>
              <ul className="list-disc pl-5 space-y-2 font-sans text-sm">
                {analyses
                  .slice()
                  .sort((a, b) => b.confidence - a.confidence)
                  .slice(0, 3)
                  .map((p, idx) => (
                    <li key={idx}>
                      <span className="font-mono text-xs">{p.patent_number}</span> — (
                      {p.confidence}% similarity, {p.risk_level.toLowerCase()} risk)
                      <p className="text-text-secondary text-xs mt-1">{p.relevance_reason}</p>
                    </li>
                  ))}
              </ul>
            </EditableSection>

            <EditableSection id="novelty" title="Potential Novelty Concerns" edited={edited} setEdited={setEdited}>
              <ul className="list-disc pl-5 space-y-2 font-sans text-sm">
                {analyses.length === 0 ? (
                  <li>No significant novelty concerns identified across retrieved patents.</li>
                ) : (
                  analyses.map((p, idx) => (
                    <li key={idx}>
                      <span className="font-mono text-xs">{p.patent_number}</span>:{" "}
                      {p.novelty_concerns}
                    </li>
                  ))
                )}
              </ul>
            </EditableSection>

            <EditableSection
              id="manual-review"
              title="Patents Requiring Manual Review"
              edited={edited}
              setEdited={setEdited}
            >
              <ul className="list-disc pl-5 space-y-2 font-sans text-sm">
                {moderate.length === 0 ? (
                  <li>No patents were flagged as boundary cases.</li>
                ) : (
                  moderate.map((p, idx) => (
                    <li key={idx}>
                      <span className="font-mono text-xs">{p.patent_number}</span> — Potential Claim Overlap: {p.potential_claim_overlap}
                    </li>
                  ))
                )}
              </ul>
            </EditableSection>

            <EditableSection id="recommendation" title="Overall Recommendation" edited={edited} setEdited={setEdited}>
              <div className="flex items-center gap-3 font-sans">
                <RiskBadge level={risk} />
              </div>
              <p className="mt-3">
                {report?.recommendation || "No overall recommendation provided."}
              </p>
            </EditableSection>

            <EditableSection id="appendix" title="Appendix" edited={edited} setEdited={setEdited}>
              <p className="font-sans text-xs text-text-secondary">
                Full claim text, similarity methodology, and citation trail for all{" "}
                {analyses.length} retrieved patents are available in the Analysis
                Workspace and are preserved with this report's permanent record.
              </p>
            </EditableSection>
          </div>
          )}
        </div>
      </div>

      {/* Dedicated Print-Only Section (Always exact A4 enterprise layout when printed) */}
      {structuredModel && (
        <div className="hidden print:block print:w-full print:m-0 print:p-0">
          <EnterprisePrintableReport model={structuredModel} />
        </div>
      )}
    </AppShell>
  );
}

function EditableSection({
  id,
  title,
  children,
  edited,
  setEdited,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  edited: Record<string, boolean>;
  setEdited: (fn: (prev: Record<string, boolean>) => Record<string, boolean>) => void;
}) {
  return (
    <section id={id} className="mb-8 group">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <div className="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          {edited[id] && (
            <span className="rounded-[6px] border border-border bg-surface px-1.5 py-0.5 font-sans text-[10px] text-text-tertiary">
              Edited by you
            </span>
          )}
          <button
            onClick={() => setEdited((p) => ({ ...p, [id]: true }))}
            className="rounded-md p-1 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
            aria-label={`Edit ${title}`}
          >
            <Pencil className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </section>
  );
}
