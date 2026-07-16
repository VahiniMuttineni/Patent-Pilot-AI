import React from 'react';
import { ReportStructuredModel } from '@/services/report-generator';
import { ShieldAlert, CheckCircle2, AlertTriangle, FileText, Beaker, Layers, Award, Scale, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  model: ReportStructuredModel;
}

export function EnterprisePrintableReport({ model }: Props) {
  const isLowRisk = model.overallRisk === "Low";
  const isModRisk = model.overallRisk === "Moderate";

  return (
    <div id="enterprise-report-container" className="mx-auto max-w-[210mm] bg-white text-slate-900 shadow-xl print:shadow-none print:max-w-none print:w-full font-sans leading-relaxed">
      
      {/* =========================================================
          PAGE 1: COVER PAGE
      ========================================================= */}
      <div className="min-h-[297mm] p-10 sm:p-14 flex flex-col justify-between border-b-2 border-slate-200 print:border-none print:break-after-page relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b pb-6 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-900 flex items-center justify-center text-white font-bold text-xl tracking-wider">
              PP
            </div>
            <div>
              <span className="font-heading font-bold text-xl text-indigo-950 tracking-tight block">PatentPilot AI</span>
              <span className="text-xs uppercase tracking-widest text-slate-500 font-semibold">Enterprise IP Intelligence Platform</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block bg-red-100 text-red-800 font-bold text-xs px-3 py-1 rounded border border-red-200 uppercase tracking-wider">
              Confidential Client Deliverable
            </span>
          </div>
        </div>

        {/* Center Title & Molecule Highlights */}
        <div className="my-auto py-12 space-y-8">
          <div className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-600">Patentability &amp; Freedom-to-Operate (FTO) Assessment</p>
            <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-slate-950 tracking-tight leading-tight">
              {model.compoundName}
            </h1>
            <p className="text-base text-slate-600 font-medium">
              Comprehensive structural, Markush claim boundary, and legal landscape report generated via FAISS vector retrieval &amp; RDKit exact structural parsing.
            </p>
          </div>

          {/* Molecule Highlight Box */}
          <div className="rounded-xl border-2 border-slate-200 bg-slate-50/80 p-6 space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-1">Canonical SMILES String</span>
              <p className="font-mono text-sm sm:text-base text-slate-900 break-all select-all font-semibold bg-white p-3 rounded border border-slate-200 shadow-inner">
                {model.canonicalSmiles || "N/A"}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block font-medium">Formula</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{model.moleculeDetails.formula}</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Exact Mass</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{model.moleculeDetails.exactMass} g/mol</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">TPSA</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{model.moleculeDetails.tpsa} Å²</span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Lipinski Rule of 5</span>
                <span className={cn("font-bold text-sm", model.moleculeDetails.lipinskiCompliant ? "text-emerald-700" : "text-amber-700")}>
                  {model.moleculeDetails.lipinskiCompliant ? "COMPLIANT (0 Violations)" : "VIOLATIONS DETECTED"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Metadata Bar */}
        <div className="border-t border-slate-200 pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider block">Report ID</span>
            <span className="font-mono font-bold text-slate-800">{model.reportId}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider block">Analysis ID</span>
            <span className="font-mono font-bold text-slate-800">{model.analysisId.slice(0, 12)}...</span>
          </div>
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider block">Generated Date</span>
            <span className="font-bold text-slate-800">{model.generatedDate}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-400 uppercase tracking-wider block">Analysis Engine</span>
            <span className="font-bold text-slate-800">{model.version}</span>
          </div>
        </div>
      </div>

      {/* =========================================================
          PAGE 2+: EXECUTIVE SUMMARY & COMPOUND DETAILS
      ========================================================= */}
      <div className="p-10 sm:p-14 space-y-12 print:break-after-page">
        {/* Print Running Header */}
        <PrintHeader reportId={model.reportId} />

        {/* Section 1: Executive Summary */}
        <section className="space-y-6">
          <div className="border-b-2 border-indigo-950 pb-2">
            <h2 className="text-2xl font-heading font-bold text-indigo-950 flex items-center gap-2">
              <span className="text-indigo-600 font-mono">01.</span> Executive Summary &amp; Strategic Risk Profile
            </h2>
          </div>

          {/* Highlighted Summary Card */}
          <div className={cn(
            "rounded-xl border-2 p-6 space-y-6 shadow-sm",
            isLowRisk ? "bg-emerald-50/60 border-emerald-300" : isModRisk ? "bg-amber-50/60 border-amber-300" : "bg-red-50/60 border-red-300"
          )}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-black/10 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Overall Freedom-to-Operate (FTO) Status</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "text-2xl sm:text-3xl font-heading font-extrabold tracking-tight",
                    isLowRisk ? "text-emerald-900" : isModRisk ? "text-amber-900" : "text-red-900"
                  )}>
                    {model.overallRisk.toUpperCase()} FTO RISK
                  </span>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">Patentability Rating</span>
                <span className="text-sm font-bold text-slate-900 block mt-1">{model.overallRating}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium">
              <div className="bg-white/80 p-3 rounded border border-black/5">
                <span className="text-slate-500 block uppercase font-bold">Patents Analyzed</span>
                <span className="text-lg font-bold text-slate-900">{model.patentsAnalyzedCount} prior art families</span>
              </div>
              <div className="bg-white/80 p-3 rounded border border-black/5">
                <span className="text-slate-500 block uppercase font-bold">Highest Similarity</span>
                <span className="text-lg font-bold text-slate-900">{model.highestSimilarity}% Tanimoto match</span>
              </div>
              <div className="bg-white/80 p-3 rounded border border-black/5">
                <span className="text-slate-500 block uppercase font-bold">Primary Action Required</span>
                <span className="text-xs font-bold text-indigo-900 leading-tight block mt-0.5">Check Markush boundaries &amp; Claim 1 R-groups</span>
              </div>
            </div>

            {/* Key Findings List */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">Key Strategic Findings</span>
              <ul className="space-y-2 text-sm text-slate-800">
                {model.keyFindings.map((finding, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-700 shrink-0 mt-0.5" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Section 2: Compound & Chemical Feature Analysis */}
        <section className="space-y-6">
          <div className="border-b-2 border-indigo-950 pb-2">
            <h2 className="text-2xl font-heading font-bold text-indigo-950 flex items-center gap-2">
              <span className="text-indigo-600 font-mono">02.</span> Compound &amp; Physicochemical Feature Analysis
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Physicochemical Table */}
            <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
              <div className="bg-slate-100 px-4 py-2.5 font-bold text-slate-800 border-b border-slate-200 uppercase tracking-wider">
                Physicochemical &amp; Drug-Likeness Parameters
              </div>
              <table className="w-full text-left divide-y divide-slate-200">
                <tbody className="divide-y divide-slate-200 bg-white">
                  <tr>
                    <th className="px-4 py-2 text-slate-500 font-medium">Molecular Weight</th>
                    <td className="px-4 py-2 font-mono font-bold text-slate-900">{model.moleculeDetails.molecularWeight} g/mol</td>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 text-slate-500 font-medium">Exact Mass</th>
                    <td className="px-4 py-2 font-mono font-bold text-slate-900">{model.moleculeDetails.exactMass}</td>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 text-slate-500 font-medium">Topological Polar Surface Area (TPSA)</th>
                    <td className="px-4 py-2 font-mono font-bold text-slate-900">{model.moleculeDetails.tpsa} Å²</td>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 text-slate-500 font-medium">Calculated LogP (Lipophilicity)</th>
                    <td className="px-4 py-2 font-mono font-bold text-slate-900">{model.moleculeDetails.logP}</td>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 text-slate-500 font-medium">Rotatable Bonds</th>
                    <td className="px-4 py-2 font-mono font-bold text-slate-900">{model.moleculeDetails.rotatableBonds}</td>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 text-slate-500 font-medium">H-Bond Donors / Acceptors</th>
                    <td className="px-4 py-2 font-mono font-bold text-slate-900">{model.moleculeDetails.hBondDonors} Donors / {model.moleculeDetails.hBondAcceptors} Acceptors</td>
                  </tr>
                  <tr>
                    <th className="px-4 py-2 text-slate-500 font-medium">Formal Charge / Stereocenters</th>
                    <td className="px-4 py-2 font-mono font-bold text-slate-900">{model.moleculeDetails.formalCharge} / {model.moleculeDetails.stereoCenters}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Chemical Feature Cards */}
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Detected Functional Groups</span>
                <div className="flex flex-wrap gap-1.5">
                  {model.chemicalFeatures.functionalGroups.map((grp, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-white border border-slate-300 text-xs font-semibold text-slate-800 shadow-2xs">
                      {grp}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Pharmacophore &amp; Ring Systems</span>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  <strong>Ring Motifs:</strong> {model.chemicalFeatures.ringSystems.join(", ")}<br />
                  <strong>Core Scaffold:</strong> {model.chemicalFeatures.scaffold}<br />
                  <strong>Heterocycles:</strong> {model.chemicalFeatures.heterocycles.join(", ")}
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Physicochemical Summary</span>
                <p className="text-xs text-slate-700 leading-relaxed">
                  {model.chemicalFeatures.physicochemicalSummary}
                </p>
              </div>
            </div>
          </div>
        </section>

        <PrintFooter reportId={model.reportId} />
      </div>

      {/* =========================================================
          PAGE 3: SIMILARITY & MULTI-SIGNAL SCORING
      ========================================================= */}
      <div className="p-10 sm:p-14 space-y-12 print:break-after-page">
        <PrintHeader reportId={model.reportId} />

        {/* Section 3: Multi-Signal Scoring Breakdown */}
        <section className="space-y-6">
          <div className="border-b-2 border-indigo-950 pb-2">
            <h2 className="text-2xl font-heading font-bold text-indigo-950 flex items-center gap-2">
              <span className="text-indigo-600 font-mono">03.</span> Similarity Analysis &amp; Explainable Multi-Signal Scoring
            </h2>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            To eliminate the false-positive risks of raw chemical similarity, our AI evaluation engine computes five weighted signals combining exact graph substructure matching, transformer semantic embeddings, and legal claim boundaries.
          </p>

          {/* Multi-Signal Table */}
          <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-indigo-950 text-white font-bold tracking-wider uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Signal Vector</th>
                  <th className="px-4 py-3 w-20 text-center">Weight</th>
                  <th className="px-4 py-3 w-28 text-center">Score / 100</th>
                  <th className="px-4 py-3">Scientific Contribution &amp; Legal Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-800">
                {model.multiSignalScoring.map((sig, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-4 py-3 font-bold text-slate-900">{sig.signalName}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-indigo-700">{sig.weightPercentage}%</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${sig.score}%` }} />
                        </div>
                        <span className="shrink-0">{sig.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 leading-relaxed">{sig.contributionExplanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Similarity Breakdown Interpretation Card */}
          <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-5 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 block">Chemical &amp; Substructure Interpretation</span>
            <p className="text-xs sm:text-sm text-indigo-950 leading-relaxed">
              <strong>MCS Coverage ({model.similarityBreakdown.mcsCoverage}%):</strong> {model.similarityBreakdown.interpretation} <br />
              <strong>Unique Structural Differences:</strong> {model.similarityBreakdown.uniqueDifferences}
            </p>
          </div>
        </section>

        {/* Section 4: Patent Search Summary & Scope */}
        <section className="space-y-6">
          <div className="border-b-2 border-indigo-950 pb-2">
            <h2 className="text-2xl font-heading font-bold text-indigo-950 flex items-center gap-2">
              <span className="text-indigo-600 font-mono">04.</span> Patent Search Landscape &amp; Retrieval Metrics
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium">
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-slate-500 uppercase font-bold block mb-1">Databases Searched</span>
              <span className="font-bold text-slate-900 text-sm leading-tight block">{model.searchSummary.databasesSearched.slice(0, 3).join(", ")}</span>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-slate-500 uppercase font-bold block mb-1">Retrieval Funnel</span>
              <span className="font-mono font-bold text-slate-900 text-sm block">{model.searchSummary.totalRetrieved} → {model.searchSummary.afterFiltering} → {model.searchSummary.finalAnalyzed} analyzed</span>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-slate-500 uppercase font-bold block mb-1">Jurisdictions</span>
              <span className="font-bold text-slate-900 text-sm block">{model.searchSummary.countries.join(", ")} ({model.searchSummary.publicationYears})</span>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50">
              <span className="text-slate-500 uppercase font-bold block mb-1">Primary IPC/CPC</span>
              <span className="font-mono font-bold text-indigo-800 text-xs block">{model.searchSummary.ipcClassifications.join(", ")}</span>
            </div>
          </div>
        </section>

        <PrintFooter reportId={model.reportId} />
      </div>

      {/* =========================================================
          PAGE 4: PATENT RANKING TABLE
      ========================================================= */}
      <div className="p-10 sm:p-14 space-y-12 print:break-after-page">
        <PrintHeader reportId={model.reportId} />

        <section className="space-y-6">
          <div className="border-b-2 border-indigo-950 pb-2">
            <h2 className="text-2xl font-heading font-bold text-indigo-950 flex items-center gap-2">
              <span className="text-indigo-600 font-mono">05.</span> Ranked Patent Prior Art Matrix
            </h2>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            The following references represent the highest structural and legal relevance scores across our global patent index. Each candidate underwent exact Markush claim overlap screening.
          </p>

          <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
            <table className="w-full text-left divide-y divide-slate-200">
              <thead className="bg-slate-900 text-white font-bold tracking-wider uppercase text-[11px]">
                <tr>
                  <th className="px-3 py-3 text-center">Rank</th>
                  <th className="px-4 py-3">Patent / Pub Date</th>
                  <th className="px-4 py-3">Assignee &amp; Jurisdiction</th>
                  <th className="px-4 py-3 text-center">Similarity</th>
                  <th className="px-4 py-3">Claim Strength</th>
                  <th className="px-4 py-3 text-center">FTO Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white font-medium text-slate-800">
                {model.rankedPatents.map((pat) => (
                  <tr key={pat.rank} className="hover:bg-slate-50/80">
                    <td className="px-3 py-3 text-center font-bold font-mono text-slate-900">#{pat.rank}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-indigo-900 block">{pat.patentNumber}</span>
                      <span className="text-[11px] text-slate-500">{pat.publicationDate}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-slate-900 block leading-tight">{pat.assignee}</span>
                      <span className="text-[11px] text-slate-500 font-semibold">{pat.country} Patent Authority</span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-900">
                      {pat.similarityScore}%
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-[11px]">
                      {pat.claimStrength}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider inline-block",
                        pat.noveltyRisk.toLowerCase() === "low" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                        pat.noveltyRisk.toLowerCase() === "moderate" ? "bg-amber-100 text-amber-800 border border-amber-300" :
                        "bg-red-100 text-red-800 border border-red-300"
                      )}>
                        {pat.noveltyRisk}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <PrintFooter reportId={model.reportId} />
      </div>

      {/* =========================================================
          PAGE 5+: DETAILED PATENT SUBSECTIONS & AI INTERPRETATIONS
      ========================================================= */}
      <div className="p-10 sm:p-14 space-y-12 print:break-after-page">
        <PrintHeader reportId={model.reportId} />

        <section className="space-y-8">
          <div className="border-b-2 border-indigo-950 pb-2">
            <h2 className="text-2xl font-heading font-bold text-indigo-950 flex items-center gap-2">
              <span className="text-indigo-600 font-mono">06.</span> Detailed Prior Art Subsections &amp; Conservative Legal AI Interpretations
            </h2>
          </div>

          <div className="space-y-8">
            {model.rankedPatents.slice(0, 4).map((pat) => (
              <div key={pat.rank} className="rounded-xl border border-slate-300 p-6 bg-white space-y-4 shadow-2xs break-inside-avoid">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-xs font-mono font-bold text-indigo-600 uppercase">Prior Art Reference #{pat.rank}</span>
                    <h3 className="text-lg font-heading font-bold text-slate-950 leading-tight mt-0.5">{pat.patentNumber} — {pat.assignee}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2.5 py-1 rounded bg-slate-100 border border-slate-300 text-slate-800">
                      {pat.similarityScore}% Tanimoto
                    </span>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-700">
                  <div>
                    <span className="font-bold text-slate-900 block mb-0.5 uppercase text-[11px] tracking-wider text-slate-500">Key Claim Recitations</span>
                    <ul className="list-disc pl-4 space-y-1 text-slate-800 font-medium leading-relaxed">
                      {pat.keyClaims.map((cl, idx) => (
                        <li key={idx}>{cl}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <span className="font-bold text-slate-900 block mb-0.5 uppercase text-[11px] tracking-wider text-slate-500">Claim Overlap &amp; Substructure Discussion</span>
                    <p className="leading-relaxed bg-slate-50 p-3 rounded border border-slate-200 text-slate-800">
                      {pat.claimOverlapDiscussion}
                    </p>
                  </div>

                  {/* Conservative AI Interpretation */}
                  <div className="rounded-lg border-l-4 border-indigo-700 bg-indigo-50/60 p-3.5 space-y-1">
                    <span className="font-bold text-indigo-950 uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <Scale className="h-3.5 w-3.5 text-indigo-700" /> Conservative AI Legal &amp; Scientific Opinion
                    </span>
                    <p className="text-xs text-indigo-950 font-medium italic leading-relaxed">
                      "{pat.conservativeAiInterpretation}"
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <PrintFooter reportId={model.reportId} />
      </div>

      {/* =========================================================
          PAGE 6: RISK ASSESSMENT, NOVELTY & RECOMMENDATIONS
      ========================================================= */}
      <div className="p-10 sm:p-14 space-y-12">
        <PrintHeader reportId={model.reportId} />

        {/* Risk & Novelty Assessment */}
        <section className="space-y-6">
          <div className="border-b-2 border-indigo-950 pb-2">
            <h2 className="text-2xl font-heading font-bold text-indigo-950 flex items-center gap-2">
              <span className="text-indigo-600 font-mono">07.</span> Risk &amp; Novelty Assessment
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
            {/* Risk Box */}
            <div className="rounded-xl border border-slate-300 p-5 bg-white space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="font-bold text-slate-900 text-sm">Overall FTO Risk Profile</span>
                <span className="font-bold text-slate-600 text-xs uppercase">Confidence: {model.riskAssessment.confidence}</span>
              </div>
              <p className="text-slate-800 leading-relaxed font-medium">
                {model.riskAssessment.reasoning}
              </p>
              <div className="pt-2 border-t space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">Supporting Evidence</span>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  {model.riskAssessment.supportingEvidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Novelty Box */}
            <div className="rounded-xl border border-slate-300 p-5 bg-white space-y-3">
              <div className="border-b pb-2">
                <span className="font-bold text-slate-900 text-sm">Composition-of-Matter Novelty</span>
              </div>
              <p className="text-slate-800 leading-relaxed font-medium">
                <strong>Scaffold Uniqueness:</strong> {model.noveltyAssessment.scaffoldUniqueness}<br />
                <strong>Distinctive Chemistry:</strong> {model.noveltyAssessment.distinctiveChemistry}
              </p>
              <div className="pt-2 border-t space-y-1">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block">Potential Patentability Outlook</span>
                <p className="text-indigo-950 font-semibold leading-relaxed bg-indigo-50/50 p-2.5 rounded border border-indigo-100">
                  {model.noveltyAssessment.potentialPatentability}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Recommendations */}
        <section className="space-y-6">
          <div className="border-b-2 border-indigo-950 pb-2">
            <h2 className="text-2xl font-heading font-bold text-indigo-950 flex items-center gap-2">
              <span className="text-indigo-600 font-mono">08.</span> Actionable Strategic Recommendations
            </h2>
          </div>

          <div className="rounded-xl border-2 border-indigo-900/20 bg-slate-50 p-6 space-y-4">
            <ol className="space-y-3 text-sm text-slate-800">
              {model.recommendations.map((rec, idx) => {
                const [title, ...desc] = rec.split(":");
                return (
                  <li key={idx} className="flex items-start gap-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs font-medium">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-900 text-xs font-bold text-white">
                      {idx + 1}
                    </span>
                    <div className="leading-relaxed">
                      {desc.length > 0 ? (
                        <>
                          <strong className="text-indigo-950 font-bold">{title}:</strong> {desc.join(":")}
                        </>
                      ) : (
                        <span>{rec}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <PrintFooter reportId={model.reportId} />
      </div>

    </div>
  );
}

function PrintHeader({ reportId }: { reportId: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-3 mb-6 border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
      <span>PatentPilot Enterprise IP Intelligence — CONFIDENTIAL</span>
      <span>Report ID: {reportId}</span>
    </div>
  );
}

function PrintFooter({ reportId }: { reportId: string }) {
  return (
    <div className="flex items-center justify-between border-t pt-4 mt-8 border-slate-200 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
      <span>PatentPilot Confidential Deliverable</span>
      <span>Generated via FAISS Vector RAG &amp; RDKit Engine</span>
    </div>
  );
}
