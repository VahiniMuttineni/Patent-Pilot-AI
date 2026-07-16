"use client";

import { useState } from "react";
import { NotebookText, ChevronRight, ChevronLeft } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export function NotesPanel({ initialNotes }: { initialNotes?: string }) {
  const [open, setOpen] = useState(true);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function handleChange(v: string) {
    setNotes(v);
    // Debounced auto-save in a real implementation — TODO: PATCH /api/analyses/{id}
    setSavedAt(new Date());
  }

  return (
    <div
      className={cn(
        "hidden xl:flex shrink-0 flex-col border-l border-border bg-surface transition-[width] duration-200",
        open ? "w-72" : "w-11"
      )}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 h-12 px-3 border-b border-border text-text-secondary hover:text-text-primary transition-colors shrink-0"
        aria-label={open ? "Collapse notes panel" : "Expand notes panel"}
      >
        {open ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        {open && (
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <NotebookText className="h-3.5 w-3.5" /> Research Notes
          </span>
        )}
      </button>

      {open && (
        <div className="flex-1 flex flex-col p-3">
          <Textarea
            value={notes}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Jot reasoning as you review patents — this feeds directly into your report."
            className="flex-1 resize-none text-xs"
          />
          <p className="mt-2 text-[11px] text-text-tertiary">
            {savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : "Auto-saves as you type"}
          </p>
        </div>
      )}
    </div>
  );
}
