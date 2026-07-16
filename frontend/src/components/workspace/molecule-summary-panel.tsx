import { Analysis } from "@/types";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { ChemicalStructure } from "@/components/workspace/chemical-structure";
import Link from "next/link";
import { CheckCircle2, AlertTriangle, Atom, Layers, Activity, ArrowLeft, ShieldCheck, ExternalLink, HelpCircle } from "lucide-react";

export function MoleculeSummaryPanel({ analysis }: { analysis: Analysis }) {
  const { molecule } = analysis;
  const meta = molecule.metadata || {};

  // Deterministic Display Priority logic:
  // 1. Preferred Compound Name
  // 2. IUPAC Name
  // 3. Common Synonym
  // 4. Structural Description (Only used when no verified name exists)
  const preferredName = meta.preferred_name || meta.compound_name || molecule.name;
  const iupacName = meta.iupac_name;
  const synonyms: string[] = meta.synonyms || [];
  const resolutionStatus = meta.compound_resolution_status || "VERIFIED";
  const confidence = meta.resolution_confidence ?? 95;
  const confidenceSummary = meta.resolution_summary || "Verified by Public Databases";

  const riskCounts = analysis.patents.reduce(
    (acc, p) => {
      acc[p.riskLevel]++;
      return acc;
    },
    { low: 0, moderate: 0, high: 0 } as Record<string, number>
  );
  const total = analysis.patents.length || 1;

  return (
    <div className="w-full shrink-0 border-b lg:border-b-0 lg:border-r border-border bg-surface p-4 sm:p-5 lg:w-80 overflow-y-auto space-y-5">
      {/* Back Button */}
      <div>
        <Link 
          href="/dashboard" 
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors mb-2 font-medium group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>
      </div>

      {/* Compound Identity Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-1">
          <h2 className="text-lg font-bold text-text-primary leading-tight font-heading">
            {preferredName}
          </h2>
          {meta.molecular_formula && (
            <span className="inline-flex items-center rounded-md bg-primary/15 px-2 py-0.5 text-xs font-mono font-bold text-primary shrink-0 border border-primary/20">
              {meta.molecular_formula}
            </span>
          )}
        </div>

        {/* IUPAC Name */}
        {iupacName && iupacName !== preferredName && (
          <p className="text-xs text-text-secondary line-clamp-2 italic mb-1.5" title={iupacName}>
            {iupacName}
          </p>
        )}

        {/* Compound Resolution Confidence Badge */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
            confidence >= 90
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
          }`}>
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{confidence}% Confidence</span>
          </span>
          <span className="text-[10px] text-text-tertiary truncate" title={confidenceSummary}>
            {resolutionStatus === "VERIFIED" ? confidenceSummary : "Structural Fallback"}
          </span>
        </div>
      </div>

      {/* RDKit Structure Visualization */}
      <div className="rounded-lg border border-border bg-background p-2">
        <ChemicalStructure smiles={meta.canonical_smiles || molecule.smiles} height={160} className="w-full" />
      </div>

      {/* Database Cross-References & Identifiers */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <Atom className="h-3.5 w-3.5 text-primary" />
          Public Identifiers
        </h3>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          {meta.pubchem_cid && (
            <a
              href={`https://pubchem.ncbi.nlm.nih.gov/compound/${meta.pubchem_cid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded border border-border bg-background hover:bg-surface-hover transition-colors group"
            >
              <div>
                <span className="text-[9px] text-text-tertiary uppercase block">PubChem CID</span>
                <span className="text-text-primary font-bold">{meta.pubchem_cid}</span>
              </div>
              <ExternalLink className="h-3 w-3 text-text-tertiary group-hover:text-primary shrink-0" />
            </a>
          )}
          {meta.chembl_id && (
            <a
              href={`https://www.ebi.ac.uk/chembl/compound_report_card/${meta.chembl_id}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-2 rounded border border-border bg-background hover:bg-surface-hover transition-colors group"
            >
              <div>
                <span className="text-[9px] text-text-tertiary uppercase block">ChEMBL ID</span>
                <span className="text-text-primary font-bold">{meta.chembl_id}</span>
              </div>
              <ExternalLink className="h-3 w-3 text-text-tertiary group-hover:text-primary shrink-0" />
            </a>
          )}
          {meta.chemspider_id && (
            <div className="p-2 rounded border border-border bg-background">
              <span className="text-[9px] text-text-tertiary uppercase block">ChemSpider</span>
              <span className="text-text-primary font-bold">{meta.chemspider_id}</span>
            </div>
          )}
          {meta.compound_classification && (
            <div className="p-2 rounded border border-border bg-background">
              <span className="text-[9px] text-text-tertiary uppercase block">Class</span>
              <span className="text-text-primary font-bold truncate block" title={meta.compound_classification}>
                {meta.compound_classification}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Common Synonyms */}
      {synonyms.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">Synonyms</h3>
          <div className="flex flex-wrap gap-1">
            {synonyms.slice(0, 5).map((syn, idx) => (
              <span key={idx} className="text-[10px] text-text-secondary bg-surface-hover px-2 py-0.5 rounded border border-border">
                {syn}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Physicochemical Profile */}
      {meta.molecular_weight && (
        <div>
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5 text-primary" />
            Physicochemical Properties
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded border border-border/80 bg-background/50 p-2">
              <span className="text-text-tertiary block text-[9px] uppercase">Mol Weight</span>
              <span className="font-mono font-medium text-text-primary">{meta.molecular_weight} g/mol</span>
            </div>
            <div className="rounded border border-border/80 bg-background/50 p-2">
              <span className="text-text-tertiary block text-[9px] uppercase">Exact Mass</span>
              <span className="font-mono font-medium text-text-primary">{meta.exact_mass ?? "N/A"}</span>
            </div>
            <div className="rounded border border-border/80 bg-background/50 p-2">
              <span className="text-text-tertiary block text-[9px] uppercase">LogP / TPSA</span>
              <span className="font-mono font-medium text-text-primary">
                {meta.logp ?? "N/A"} / {meta.tpsa ?? "N/A"} Å²
              </span>
            </div>
            <div className="rounded border border-border/80 bg-background/50 p-2">
              <span className="text-text-tertiary block text-[9px] uppercase">HBD / HBA</span>
              <span className="font-mono font-medium text-text-primary">
                {meta.num_hbd ?? 0} / {meta.num_hba ?? 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* SMILES and InChI Details */}
      <div className="space-y-2 rounded-md border border-border bg-background p-3 text-xs">
        <div>
          <p className="text-[10px] font-semibold text-text-tertiary uppercase mb-0.5">Canonical SMILES</p>
          <p className="font-mono text-[11px] leading-relaxed break-all text-text-primary select-all">
            {meta.canonical_smiles || molecule.smiles}
          </p>
        </div>
        {meta.inchikey && (
          <div>
            <p className="text-[10px] font-semibold text-text-tertiary uppercase mb-0.5">InChIKey</p>
            <p className="font-mono text-[11px] break-all text-text-secondary select-all">
              {meta.inchikey}
            </p>
          </div>
        )}
      </div>

      {/* Target & Analysis Metadata */}
      <dl className="space-y-2 text-xs pt-1 border-t border-border">
        <div className="flex justify-between">
          <dt className="text-text-secondary">Resolution Status</dt>
          <dd className="font-semibold text-emerald-500">{resolutionStatus}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-text-secondary">Analysis Date</dt>
          <dd className="text-text-primary">{formatDate(analysis.createdAt)}</dd>
        </div>
      </dl>

      {/* Risk Distribution */}
      <div className="pt-2 border-t border-border">
        <p className="text-[11px] font-medium text-text-secondary mb-2 flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-primary" />
          FTO Risk Distribution
        </p>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-border mb-2.5">
          <div className="bg-danger transition-all duration-500" style={{ width: `${(riskCounts.high / total) * 100}%` }} />
          <div className="bg-warning transition-all duration-500" style={{ width: `${(riskCounts.moderate / total) * 100}%` }} />
          <div className="bg-success transition-all duration-500" style={{ width: `${(riskCounts.low / total) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="danger">{riskCounts.high} high risk</Badge>
          <Badge variant="warning">{riskCounts.moderate} moderate</Badge>
          <Badge variant="success">{riskCounts.low} low risk</Badge>
        </div>
      </div>
    </div>
  );
}

