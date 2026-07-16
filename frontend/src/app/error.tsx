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
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <AlertTriangle className="h-8 w-8 text-danger" />
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        Your last saved draft is safe. This was a display error, not a data-loss error — try again.
      </p>
      <Button size="sm" className="mt-2" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
