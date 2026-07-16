"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";
import { User, LogOut, ShieldCheck, CheckCircle2, Sun, Moon, Laptop, ArrowLeft, Mail, Briefcase, Building2, Save } from "lucide-react";
export default function SettingsPage() {

  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  // Profile Form States
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("Research Scientist");
  const [department, setDepartment] = useState("Intellectual Property & Drug Discovery");
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (user?.email) {
      const savedName = localStorage.getItem(`pp_profile_name_${user.email}`);
      const savedRole = localStorage.getItem(`pp_profile_role_${user.email}`);
      const savedDept = localStorage.getItem(`pp_profile_dept_${user.email}`);
      
      if (savedName) {
        setFullName(savedName);
      } else {
        const derived = user.email
          .split("@")[0]
          .replace(/[._-]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        setFullName(derived);
      }
      if (savedRole) setRole(savedRole);
      if (savedDept) setDepartment(savedDept);
    }
  }, [user]);

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (user?.email) {
      localStorage.setItem(`pp_profile_name_${user.email}`, fullName);
      localStorage.setItem(`pp_profile_role_${user.email}`, role);
      localStorage.setItem(`pp_profile_dept_${user.email}`, department);
      window.dispatchEvent(new Event("profile_updated"));
    }
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  }

  // Compute user initials
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
    <AppShell crumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Profile" }]}>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        {/* Back Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors mb-6 font-medium group"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to Dashboard
        </Link>

        {/* Page Title Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading text-text-primary">Profile & Account Settings</h1>
            <p className="text-xs text-text-secondary mt-1">Manage your identity details, research lab metadata, and workspace appearance</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              <span>Active Session</span>
            </span>
          </div>
        </div>

        <div className="space-y-6">
          {/* User Overview Banner */}
          <Card className="p-6 bg-surface/90 border border-border shadow-soft">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              <div className="h-16 w-16 rounded-2xl bg-gradient-accent p-0.5 shrink-0 shadow-glow">
                <div className="h-full w-full rounded-[14px] bg-surface flex items-center justify-center text-lg font-bold text-primary">
                  {initials}
                </div>
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h2 className="text-lg font-bold text-text-primary">{fullName || "Research Scientist"}</h2>
                  <span className="inline-flex text-[11px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20 self-center sm:self-auto">
                    {role}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1 flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-text-tertiary" />
                  {user?.email || "demo@example.com"}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5 flex items-center justify-center sm:justify-start gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-text-tertiary" />
                  {department}
                </p>
              </div>
            </div>
          </Card>

          {/* Profile Information Form */}
          <Card className="p-6 shadow-soft">
            <div className="flex items-center gap-2 mb-6 border-b border-border pb-4">
              <User className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-base font-semibold text-text-primary">Personal Information</h3>
                <p className="text-xs text-text-secondary">Update your name, job role, and department information visible across reports</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="fullName" className="text-xs font-semibold text-text-secondary mb-1.5 block">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs font-semibold text-text-secondary mb-1.5 block">Email Address (Primary Login)</Label>
                  <Input
                    id="email"
                    disabled
                    value={user?.email || "demo@example.com"}
                    className="bg-surface-hover/70 text-text-secondary cursor-not-allowed opacity-80"
                  />
                  <p className="text-[11px] text-text-tertiary mt-1">
                    Email is linked to your Google / OAuth SSO account.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <Label htmlFor="role" className="text-xs font-semibold text-text-secondary mb-1.5 block">
                    <span className="flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Job Title / Role</span>
                  </Label>
                  <Input
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="e.g. Senior Medicinal Chemist"
                  />
                </div>
                <div>
                  <Label htmlFor="dept" className="text-xs font-semibold text-text-secondary mb-1.5 block">
                    <span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Department / Lab</span>
                  </Label>
                  <Input
                    id="dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Oncology FTO Team"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-border/60">
                <Button type="submit" size="sm" className="bg-gradient-accent text-white font-semibold shadow-glow px-6 hover:opacity-95 transition-all">
                  <Save className="h-4 w-4 mr-1.5" /> Save Profile
                </Button>

                {profileSaved && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold animate-in fade-in">
                    <CheckCircle2 className="h-4 w-4" />
                    Profile changes saved successfully!
                  </span>
                )}
              </div>
            </form>
          </Card>

          {/* Appearance Preferences */}
          <Card className="p-6 shadow-soft space-y-4">
            <div>
              <h3 className="text-base font-semibold text-text-primary">Appearance &amp; Interface Theme</h3>
              <p className="text-xs text-text-secondary mt-1">
                Customize your workspace visual style for maximum focus and comfort.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {[
                { id: "dark" as const, label: "Dark Obsidian", icon: Moon, desc: "Deep slate low-glare mode" },
                { id: "light" as const, label: "Clean Light", icon: Sun, desc: "High contrast daylight mode" },
                { id: "system" as const, label: "System Auto", icon: Laptop, desc: "Sync with OS theme" },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTheme(opt.id)}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer",
                      active
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/40 shadow-soft font-semibold"
                        : "border-border bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-2">
                      <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-text-tertiary")} />
                      {active && <CheckCircle2 className="h-4 w-4 text-primary" />}
                    </div>
                    <span className="text-xs font-bold text-text-primary">{opt.label}</span>
                    <span className="text-[11px] text-text-tertiary mt-0.5">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Account Security & Sign Out */}
          <Card className="p-6 border border-danger/30 bg-danger/5 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-danger">Sign Out of Workspace</h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Terminate your current session on this device. Your saved searches and notes remain securely stored.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={logout} className="shrink-0">
              <LogOut className="h-4 w-4 mr-1.5" /> Sign out
            </Button>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

