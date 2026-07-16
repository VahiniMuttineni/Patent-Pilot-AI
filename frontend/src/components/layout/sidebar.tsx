"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FlaskConical,
  History,
  Settings,
  Microscope,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analysis/new", label: "New Analysis", icon: FlaskConical },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 border-r border-border bg-surface transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex items-center gap-2.5 h-14 px-4 border-b border-border">
        <div className="p-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
          <Microscope className="h-4 w-4 shrink-0" />
        </div>
        {!collapsed && (
          <span className="text-sm font-bold tracking-tight font-heading">
            Patent<span className="text-royal">Pilot</span>
          </span>
        )}
      </div>

      <nav className="flex-1 py-4 px-2 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname?.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-all duration-150",
                active
                  ? "bg-primary/15 text-primary font-medium border border-primary/20"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              )}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-royal" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>


      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-2 px-4 h-12 text-text-tertiary hover:text-text-primary border-t border-border text-xs transition-colors"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        {!collapsed && "Collapse"}
      </button>
    </aside>
  );
}
