"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronRight,
  User as UserIcon,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  X,
  LayoutDashboard,
  FlaskConical,
  History as HistoryIcon,
  Microscope,
  Sun,
  Moon,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";

interface Crumb {
  label: string;
  href?: string;
}

const MOBILE_NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analysis/new", label: "New Analysis", icon: FlaskConical },
  { href: "/history", label: "History", icon: HistoryIcon },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navbar({ crumbs = [] }: { crumbs?: Crumb[] }) {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [userRole, setUserRole] = useState("Research Scientist");
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function updateRole() {
      if (user?.email) {
        const stored = localStorage.getItem(`pp_profile_role_${user.email}`);
        if (stored) setUserRole(stored);
        else setUserRole("Research Scientist");
      }
    }
    updateRole();
    window.addEventListener("profile_updated", updateRole);
    return () => window.removeEventListener("profile_updated", updateRole);
  }, [user]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) {
        setShowMobileNav(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute initials dynamically from user email
  let initials = "U";
  if (user?.email) {
    const parts = user.email.split("@")[0].split(/[._-]/);
    if (parts.length >= 2 && parts[1].length > 0) {
      initials = (parts[0][0] + parts[1][0]).toUpperCase();
    } else {
      initials = parts[0].substring(0, 2).toUpperCase();
    }
  }

  return (
    <header className="flex items-center justify-between h-14 px-4 sm:px-6 border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-2">
        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setShowMobileNav((prev) => !prev)}
          className="flex md:hidden items-center justify-center rounded-md p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors focus:outline-none"
          title="Toggle Navigation Menu"
        >
          {showMobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        {/* Universal Back Button for non-root pages */}
        {pathname !== "/dashboard" && pathname !== "/" && (
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface/90 hover:bg-surface-hover border border-border rounded-lg transition-all shadow-sm shrink-0 mr-1 group"
            title="Go back to previous page"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}

        <div className="flex items-center gap-1.5 text-xs sm:text-sm text-text-secondary overflow-hidden">
          {crumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5 truncate">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-text-tertiary shrink-0" />}
              {crumb.href ? (
                <Link href={crumb.href} className="hover:text-text-primary transition-colors truncate">
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-text-primary font-medium truncate">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
      </div>

      
      <div className="relative flex items-center gap-2 sm:gap-3" ref={menuRef}>
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          title={`Switch to ${resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}`}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-4 w-4 text-warning animate-in fade-in duration-200" />
          ) : (
            <Moon className="h-4 w-4 text-primary animate-in fade-in duration-200" />
          )}
        </button>

        <button
          onClick={() => setShowMenu((prev) => !prev)}
          className="flex items-center gap-2 rounded-full p-1 hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
          title="Account profile & settings"
        >
          <div className="h-8 w-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center text-xs font-medium text-primary shadow-sm">
            {initials}
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-surface shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
            <div className="px-3.5 py-2.5 border-b border-border/60">
              <p className="text-xs font-semibold text-text-primary truncate">
                {user?.email || "Account Profile"}
              </p>
              <p className="text-[11px] text-text-tertiary mt-0.5 truncate">
                {userRole}
              </p>
            </div>

            <div className="py-1">
              <button
                onClick={() => {
                  toggleTheme();
                }}
                className="flex w-full items-center justify-between px-3.5 py-2 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors text-left"
              >
                <span className="flex items-center gap-2.5">
                  {resolvedTheme === "dark" ? (
                    <Sun className="h-4 w-4 text-warning" />
                  ) : (
                    <Moon className="h-4 w-4 text-primary" />
                  )}
                  <span>Appearance</span>
                </span>
                <span className="text-[10px] font-medium uppercase px-1.5 py-0.5 rounded bg-surface-hover text-text-primary">
                  {resolvedTheme === "dark" ? "Dark" : "Light"}
                </span>
              </button>

              <Link
                href="/settings"
                onClick={() => setShowMenu(false)}
                className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
              >
                <Settings className="h-4 w-4 text-primary" />
                <span>Profile & Settings</span>
              </Link>
            </div>

            <div className="h-px bg-border/60 my-1" />

            <div className="py-1">
              <button
                onClick={() => {
                  setShowMenu(false);
                  logout();
                }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs text-danger hover:bg-danger/10 transition-colors text-left"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Navigation Drawer */}
      {showMobileNav && (
        <div
          ref={mobileNavRef}
          className="md:hidden absolute left-0 top-14 w-64 bg-surface border-b border-r border-border shadow-xl rounded-br-xl py-3 px-2 z-50 animate-in slide-in-from-left-5 duration-150"
        >
          <div className="flex items-center gap-2 px-3 pb-3 mb-2 border-b border-border text-sm font-semibold text-text-primary">
            <Microscope className="h-4 w-4 text-primary" />
            <span>PatentPilot</span>
          </div>

          <nav className="space-y-1">
            {MOBILE_NAV_ITEMS.map((item) => {
              const active = pathname?.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setShowMobileNav(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
