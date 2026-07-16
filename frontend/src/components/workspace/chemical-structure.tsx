"use client";

import React, { useState } from "react";
import { Loader2, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChemicalStructureProps {
  smiles?: string;
  highlight?: string;
  title?: string;
  width?: number;
  height?: number;
  theme?: "dark" | "light";
  className?: string;
}

export const ChemicalStructure = React.memo(function ChemicalStructure({
  smiles,
  highlight,
  title,
  width = 340,
  height = 220,
  theme = "dark",
  className,
}: ChemicalStructureProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!smiles) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border border-border bg-background p-6 text-center text-xs text-text-tertiary",
          className
        )}
        style={{ minHeight: `${height}px` }}
      >
        <FlaskConical className="mb-2 h-6 w-6 text-text-tertiary opacity-40" />
        <span>No structure available</span>
      </div>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  const renderUrl = `${apiUrl}/molecules/render-svg?smiles=${encodeURIComponent(
    smiles
  )}${highlight ? `&highlight=${encodeURIComponent(highlight)}` : ""}&width=${width}&height=${height}&theme=${theme}`;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-[#14171f] p-3 transition-colors hover:border-border",
        className
      )}
      style={{ minHeight: `${height}px` }}
    >
      {title && (
        <div className="absolute top-2 left-3.5 z-10 text-[11px] font-medium text-text-secondary">
          {title}
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#14171f]/80 z-20">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      )}

      {error ? (
        <div className="flex flex-col items-center justify-center text-center text-xs text-text-tertiary py-8">
          <FlaskConical className="mb-2 h-6 w-6 text-warning/60" />
          <span>Could not render structure</span>
          <span className="mt-1 font-mono text-[10px] break-all max-w-[240px] text-text-secondary">
            {smiles}
          </span>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={renderUrl}
          alt={title || `Structure of ${smiles}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          className={cn(
            "max-w-full h-auto object-contain transition-opacity duration-200",
            loading ? "opacity-0" : "opacity-100",
            title ? "mt-4" : ""
          )}
          style={{ maxHeight: `${height - (title ? 28 : 10)}px` }}
        />
      )}
    </div>
  );
});
