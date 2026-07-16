"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { CheckCircle2, Loader2, Clock, FileText, Beaker, ArrowLeft, Activity } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { searchService } from "@/services/search.service";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAiPipelineSimulator } from "./useAiPipelineSimulator";

export default function RetrievalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    if (id === "a1") {
      router.push("/dashboard");
    }
  }, [id, router]);

  const { data: statusData } = useQuery({
    queryKey: ["searchStatus", id],
    queryFn: () => searchService.getSearchStatus(id),
    enabled: id !== "a1",
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "COMPLETED" || status === "FAILED") {
        return false;
      }
      return 3500;
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const backendDone = statusData?.status === "COMPLETED";

  const {
    stages,
    activeStageIndex,
    stageLogs,
    isComplete,
    elapsedTime,
    metrics
  } = useAiPipelineSimulator(backendDone);

  useEffect(() => {
    if (isComplete) {
      const t = setTimeout(() => {
        router.push(`/analysis/${id}/workspace`);
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [isComplete, id, router]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <AppShell
      crumbs={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Analysis" },
        { label: "Retrieval" },
      ]}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors mb-4 font-medium group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight font-heading text-text-primary">Executing AI Freedom-to-Operate Pipeline</h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Multi-agent synthesis searching patents, chemical structures, and literature.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20 shadow-glow">
              <Activity className="h-3.5 w-3.5 animate-pulse" />
              <span>{isComplete ? "Analysis Complete" : "Pipeline Active"}</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Stage Timeline */}
          <div className="lg:col-span-2 space-y-3">
            <ul className="space-y-2.5">
              {stages.map((stage, i) => {
                const isActive = i === activeStageIndex && !isComplete;
                const isPast = i < activeStageIndex || isComplete;
                const isFuture = i > activeStageIndex && !isComplete;
                const logs = stageLogs[stage.id] || [];

                return (
                  <motion.li
                    key={stage.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isFuture ? 0.45 : 1 }}
                    transition={{ duration: 0.3 }}
                    className={cn(
                      "rounded-xl border p-4 transition-all duration-300",
                      isActive
                        ? "border-primary bg-primary/10 shadow-glow ring-1 ring-primary/30"
                        : isPast
                        ? "border-border/80 bg-surface/90"
                        : "border-border/40 bg-surface/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-surface-raised border border-border text-xs font-semibold">
                        {isPast ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : isActive ? (
                          <Loader2 className="w-4 h-4 text-primary animate-spin" />
                        ) : (
                          <span className="text-[11px] text-text-tertiary">{stage.id}</span>
                        )}
                      </div>
                      <h3 className={cn(
                        "font-semibold text-sm sm:text-base font-heading flex-1",
                        isActive ? "text-text-primary font-bold" : isPast ? "text-text-secondary" : "text-text-tertiary"
                      )}>
                        {stage.name}
                      </h3>
                      {isPast && (
                        <span className="text-[10px] font-semibold text-success bg-success/15 px-2 py-0.5 rounded border border-success/20">
                          Complete
                        </span>
                      )}
                      {isActive && (
                        <span className="text-[10px] font-semibold text-primary bg-primary/15 px-2 py-0.5 rounded border border-primary/20 animate-pulse">
                          Running
                        </span>
                      )}
                    </div>

                    <AnimatePresence>
                      {isActive && logs.length > 0 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 pl-10 space-y-1.5 overflow-hidden"
                        >
                          {logs.map((log, logIdx) => (
                            <div
                              key={logIdx}
                              className="text-xs font-mono text-text-secondary flex items-start gap-2"
                            >
                              <span className="text-primary shrink-0">{`>`}</span>
                              <span className="leading-tight">{log}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ul>

            <AnimatePresence>
              {isComplete && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-xl border border-success/30 bg-success/10 text-center flex flex-col items-center gap-2 shadow-soft mt-4"
                >
                  <CheckCircle2 className="w-8 h-8 text-success" />
                  <h3 className="text-lg font-bold font-heading text-text-primary">Analysis Completed</h3>
                  <p className="text-success text-xs font-medium">Opening interactive analysis workspace...</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Telemetry Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-5 border-border bg-surface/90 shadow-soft space-y-4">
              <h3 className="font-semibold text-sm font-heading text-text-primary flex items-center justify-between border-b border-border pb-3">
                <span className="flex items-center gap-2">
                  <Activity className={cn("w-4 h-4", !isComplete && "text-primary animate-pulse")} />
                  Live Telemetry
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-surface-hover text-text-tertiary">Real-time</span>
              </h3>
              
              <div className="space-y-4 text-xs">
                <div>
                  <p className="text-[11px] text-text-tertiary mb-1 font-semibold uppercase tracking-wider">Elapsed Time</p>
                  <div className="flex items-center text-text-primary font-mono text-base font-bold">
                    <Clock className="w-4 h-4 mr-2 text-primary" />
                    {formatTime(elapsedTime)}
                  </div>
                </div>

                <div className="h-px w-full bg-border/60" />

                <div>
                  <p className="text-[11px] text-text-tertiary mb-1 font-semibold uppercase tracking-wider">Molecules Analyzed</p>
                  <div className="flex items-center text-text-primary font-mono text-base font-bold">
                    <Beaker className="w-4 h-4 mr-2 text-royal" />
                    {metrics.molecules.toLocaleString()}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-text-tertiary mb-1 font-semibold uppercase tracking-wider">Patents Retrieved</p>
                  <div className="flex items-center text-text-primary font-mono text-base font-bold">
                    <FileText className="w-4 h-4 mr-2 text-primary" />
                    {metrics.patents.toLocaleString()}
                  </div>
                </div>

                <div>
                  <p className="text-[11px] text-text-tertiary mb-1 font-semibold uppercase tracking-wider">Prior Art Papers</p>
                  <div className="flex items-center text-text-primary font-mono text-base font-bold">
                    <FileText className="w-4 h-4 mr-2 text-success" />
                    {metrics.papers.toLocaleString()}
                  </div>
                </div>

                <div className="h-px w-full bg-border/60" />

                <div>
                  <p className="text-[11px] text-text-tertiary mb-1 font-semibold uppercase tracking-wider">Current Stage</p>
                  <div className="flex items-start text-primary font-semibold leading-tight min-h-[32px]">
                    {isComplete ? "Analysis Complete" : stages[Math.min(activeStageIndex, stages.length - 1)]?.name}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

