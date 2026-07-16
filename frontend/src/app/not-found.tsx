import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
      <FlaskConical className="h-8 w-8 text-text-tertiary" />
      <h1 className="text-lg font-semibold">This analysis doesn't exist or was removed</h1>
      <p className="max-w-sm text-sm text-text-secondary">
        Check the link, or head back to your dashboard to find what you're looking for.
      </p>
      <Link href="/dashboard">
        <Button size="sm" className="mt-2">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
