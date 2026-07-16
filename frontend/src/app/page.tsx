import Link from "next/link";
import { Microscope, ArrowRight, ScanSearch, Sparkles, FileCheck2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans antialiased">
      {/* Sticky Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border glass-dark">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Microscope className="h-5 w-5" />
            </div>
            <span className="text-lg font-bold tracking-tight font-heading">
              Patent<span className="text-royal">Pilot</span>
            </span>
          </div>

          <nav className="hidden items-center gap-8 text-sm font-medium text-text-secondary md:flex">
            <a href="#workflow" className="hover:text-text-primary transition-colors">Workflow</a>
            <a href="#trust" className="hover:text-text-primary transition-colors">Trust &amp; Rigor</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Sign in
            </Link>
            <Link href="/login">
              <Button size="sm" className="bg-gradient-accent text-white font-semibold shadow-glow hover:opacity-95 transition-all">
                Start free analysis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section — Clean Centered Hero without 3rd photo tile */}
      <section className="relative overflow-hidden pt-24 pb-20 bg-gradient-hero border-b border-border/60">
        <div className="mx-auto max-w-4xl px-6 text-center">
          
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-surface/80 px-4 py-1.5 text-xs font-medium text-text-secondary shadow-soft mb-6 backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-royal animate-pulse" />
            <span>Built for medicinal chemistry, not general search</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl font-extrabold tracking-tight font-heading leading-[1.15] sm:text-5xl md:text-6xl text-text-primary">
            Know if your molecule<br />
            is already patented —<br />
            <span className="bg-gradient-accent bg-clip-text text-transparent">
              before you synthesize it.
            </span>
          </h1>

          {/* Description */}
          <p className="mt-6 mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-text-secondary">
            PatentPilot retrieves, ranks, and explains the patents that matter for a molecule in minutes, with claim-level evidence attorneys can actually verify — not a black-box score.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto bg-gradient-accent hover:opacity-95 text-white font-semibold px-8 py-6 rounded-xl shadow-glow text-sm flex items-center justify-center gap-2 transition-all">
                <span>Start free analysis</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto border border-border bg-surface-raised/80 hover:bg-surface-hover text-text-primary font-medium px-8 py-6 rounded-xl text-sm transition-all">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Section 1: Workflow */}
      <section id="workflow" className="py-20 border-b border-border bg-surface/40">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary tracking-tight">
              From structure to defensible answer
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { 
                icon: ScanSearch, 
                title: "Submit & retrieve", 
                body: "Enter a SMILES string, optional target and indication. PatentPilot searches SureChEMBL, PubChem, and Google Patents in parallel." 
              },
              { 
                icon: Sparkles, 
                title: "AI ranks & explains", 
                body: "Every candidate patent is ranked by structural and semantic relevance, with claim-level rationale — never a bare score." 
              },
              { 
                icon: FileCheck2, 
                title: "You review & decide", 
                body: "Approve, dispute, or annotate each finding. The AI proposes; you and legal make the call." 
              },
              { 
                icon: Microscope, 
                title: "Export the report", 
                body: "A structured patentability report with your team's decisions preserved alongside the AI's original read." 
              },
            ].map((step, i) => (
              <div key={i} className="glass rounded-2xl border border-border p-6 shadow-soft hover:shadow-elegant transition-all flex flex-col justify-between">
                <div>
                  <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary border border-primary/20 mb-4">
                    <step.icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold font-heading text-text-primary mb-2">{step.title}</h3>
                  <p className="text-xs sm:text-sm leading-relaxed text-text-secondary">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: Trust & Rigor */}
      <section id="trust" className="py-20 mx-auto max-w-6xl px-6">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              <ShieldCheck className="h-4 w-4" />
              <span>Verifiable Evidence</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-heading text-text-primary tracking-tight leading-snug">
              Built to be re-checked, not just trusted
            </h2>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-text-secondary">
              Every AI similarity call links back to the exact claim language behind it. Confidence is shown in bands, not misleading decimals. Nothing is presented as a legal conclusion — PatentPilot narrows the search so your team can spend its time on judgment, not retrieval.
            </p>
          </div>

          <div className="glass rounded-2xl border border-border p-8 shadow-elegant">
            <ul className="space-y-4">
              {[
                "Claim-level citations on every AI explanation",
                "Confidence bands instead of false-precision percentages",
                "Human approvals and disputes preserved in the final report",
                "Full analysis history, versioned and re-runnable"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-text-primary">
                  <CheckCircle2 className="h-4 w-4 text-royal flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-surface/30">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between px-6 py-8 gap-4 text-xs text-text-tertiary">
          <span>© 2026 PatentPilot</span>
          <span>Freedom-to-Operate screening for pharmaceutical research</span>
        </div>
      </footer>
    </div>
  );
}
