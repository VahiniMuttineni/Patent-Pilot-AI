"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { searchService } from "@/services/search.service";
import axios from "axios";

const STEPS = ["Molecule", "Scope", "Review"] as const;
const JURISDICTIONS = ["US", "EP", "WO", "CN", "JP", "IN"];

// Lightweight sanity check — real validation happens server-side via RDKit
const SMILES_PATTERN = /^[A-Za-z0-9@+\-\[\]()=#$:/\\%.]+$/;

export default function NewAnalysisPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [smiles, setSmiles] = useState("Cc1ccc(cc1)Nc2ncnc3[nH]ccc23");
  const [jurisdictions, setJurisdictions] = useState<string[]>(["US", "EP"]);
  const [includePending, setIncludePending] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const smilesValid = useMemo(
    () => smiles.length > 0 && SMILES_PATTERN.test(smiles),
    [smiles]
  );

  function toggleJurisdiction(code: string) {
    setJurisdictions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  async function handleCreate() {
    try {
      setSubmitting(true);
      const res = await searchService.createSearch({
        molecule_smiles: smiles,
      });
      router.push(`/analysis/${res.search_id}/retrieval`);
    } catch (error) {
      console.error(error);
      if (axios.isAxiosError(error) && error.response?.data) {
        const detail = error.response.data.detail || JSON.stringify(error.response.data);
        alert(`Validation Error: ${detail}`);
      } else if (error instanceof Error) {
        alert(`Failed to start search: ${error.message}`);
      } else {
        alert("Failed to start search. Please try again.");
      }
      setSubmitting(false);
    }
  }

  return (
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "New Analysis" }]}>
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors mb-6 font-medium group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>
        {/* Stepper */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  i < step && "border-primary bg-primary text-primary-foreground",
                  i === step && "border-primary text-primary",
                  i > step && "border-border text-text-tertiary"
                )}
              >
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-xs", i === step ? "text-text-primary" : "text-text-tertiary")}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
            </div>
          ))}
        </div>

        {step === 0 && (
          <Card className="p-4 sm:p-6">
            <h2 className="text-sm font-medium mb-1">Submit your molecule</h2>
            <p className="text-xs text-text-secondary mb-5">
              Enter a chemical structure (SMILES) to begin patent retrieval and AI-powered Freedom-to-Operate analysis.
            </p>

            <div>
              <Label htmlFor="smiles">SMILES string</Label>
              <Input
                id="smiles"
                mono
                value={smiles}
                onChange={(e) => setSmiles(e.target.value)}
                placeholder="e.g. Cc1ccc(cc1)Nc2ncnc3[nH]ccc23"
                aria-invalid={!smilesValid}
              />
              {!smilesValid && smiles.length > 0 && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-danger">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" /> This doesn't look like a valid SMILES string.
                </p>
              )}
              {smilesValid && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-success">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> Structure recognized — full validation runs on submit.
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <Button disabled={!smilesValid} onClick={() => setStep(1)} className="w-full sm:w-auto">
                Continue
              </Button>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card className="p-4 sm:p-6">
            <h2 className="text-sm font-medium mb-1">Configure search scope</h2>
            <p className="text-xs text-text-secondary mb-5">
              Defaults are pre-selected from your most common prior configuration.
            </p>

            <Label>Jurisdictions</Label>
            <div className="flex flex-wrap gap-2 mb-5">
              {JURISDICTIONS.map((code) => (
                <button
                  key={code}
                  onClick={() => toggleJurisdiction(code)}
                  type="button"
                >
                  <Badge variant={jurisdictions.includes(code) ? "primary" : "neutral"} className="cursor-pointer">
                    {code}
                  </Badge>
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary mb-1 cursor-pointer">
              <input
                type="checkbox"
                checked={includePending}
                onChange={(e) => setIncludePending(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary shrink-0"
              />
              <span>Include pending patent applications</span>
            </label>

            <div className="mt-6 flex flex-col-reverse sm:flex-row justify-between gap-3">
              <Button variant="secondary" onClick={() => setStep(0)} className="w-full sm:w-auto">Back</Button>
              <Button onClick={() => setStep(2)} className="w-full sm:w-auto">Continue</Button>
            </div>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-4 sm:p-6">
            <h2 className="text-sm font-medium mb-4">Review &amp; start retrieval</h2>
            <dl className="space-y-3 text-sm">
              <Row label="SMILES" value={smiles} mono />
              <Row label="Jurisdictions" value={jurisdictions.join(", ") || "None selected"} />
              <Row label="Include pending applications" value={includePending ? "Yes" : "No"} />
            </dl>

            <div className="mt-6 flex flex-col-reverse sm:flex-row justify-between gap-3">
              <Button variant="secondary" onClick={() => setStep(1)} className="w-full sm:w-auto">Back</Button>
              <Button onClick={handleCreate} disabled={submitting} className="w-full sm:w-auto">
                {submitting ? "Starting…" : "Start Retrieval"}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
      <dt className="text-text-secondary shrink-0">{label}</dt>
      <dd className={cn("text-right text-text-primary", mono && "font-mono text-xs")}>{value}</dd>
    </div>
  );
}
