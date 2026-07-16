"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-950 px-4 text-center text-slate-100">
        <AlertTriangle className="h-10 w-10 text-rose-500 animate-pulse" />
        <h1 className="text-xl font-bold">A critical error occurred</h1>
        <p className="max-w-sm text-sm text-slate-400">
          The workspace experienced an unexpected issue. Please click retry or reload the page.
        </p>
        <Button size="sm" className="mt-2 bg-[#529b84] text-slate-950 hover:bg-[#43826d] font-medium" onClick={reset}>
          Reload Application
        </Button>
      </body>
    </html>
  );
}
