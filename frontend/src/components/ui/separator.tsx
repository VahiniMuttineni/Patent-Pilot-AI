import { cn } from "@/lib/utils";

export function Separator({ className, vertical }: { className?: string; vertical?: boolean }) {
  return (
    <div
      className={cn(
        vertical ? "w-px h-full bg-border" : "h-px w-full bg-border",
        className
      )}
    />
  );
}
