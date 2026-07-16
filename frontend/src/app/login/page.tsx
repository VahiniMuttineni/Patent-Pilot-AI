"use client";

import { useState } from "react";
import Link from "next/link";
import { Microscope, Loader2, Search, FileText, Users, Lightbulb } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { useAuth } from "@/contexts/AuthContext";
import { useGoogleLogin } from "@react-oauth/google";

export default function LoginPage() {
  const { login } = useAuth();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      login(data);
      const redirectUrl = typeof window !== "undefined" ? (sessionStorage.getItem("redirectUrl") || "/dashboard") : "/dashboard";
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("redirectUrl");
        window.location.href = redirectUrl;
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || "Failed to sign in. Please try again.");
    }
  });

  const googleMutation = useMutation({
    mutationFn: authService.loginWithGoogle,
    onSuccess: (data: any) => {
      login(data);
      if (typeof window !== "undefined" && data.full_name) {
        localStorage.setItem("pp_profile_name_last", data.full_name.trim());
        if (data.email) {
          localStorage.setItem(`pp_profile_name_${data.email}`, data.full_name.trim());
        }
      }
      const redirectUrl = typeof window !== "undefined" ? (sessionStorage.getItem("redirectUrl") || "/dashboard") : "/dashboard";
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("redirectUrl");
        window.location.href = redirectUrl;
      }
    },
    onError: (err: any) => {
      setErrorMsg(err.response?.data?.detail || "Google sign-in failed.");
    }
  });

  const googleLogin = useGoogleLogin({
    onSuccess: async (codeResponse) => {
      try {
        const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${codeResponse.access_token}` },
        });
        if (res.ok) {
          const info = await res.json();
          if (info.name && typeof window !== "undefined") {
            localStorage.setItem("pp_profile_name_last", info.name.trim());
            if (info.email) {
              localStorage.setItem(`pp_profile_name_${info.email}`, info.name.trim());
            }
          }
        }
      } catch (e) {
        console.error("Failed client-side google info check", e);
      }
      googleMutation.mutate(codeResponse.access_token);
    },
    onError: (error) => setErrorMsg("Google Login Failed"),
  });


  return (
    <div className="flex min-h-screen font-sans antialiased bg-background text-text-primary">
      
      {/* LEFT SIDE: PatentPilot Info (Hidden on small screens, takes exactly 50% on large) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20 2xl:px-32 bg-surface/60 border-r border-border shadow-elegant relative z-10">
        
        {/* Subtle Background Glow/Gradient */}
        <div className="absolute top-0 left-0 right-0 h-[500px] bg-gradient-to-br from-primary/10 to-transparent opacity-50 pointer-events-none"></div>

        <div className="relative space-y-10">
          {/* Logo Section */}
          <div className="flex items-center space-x-3">
            <div className="text-primary text-4xl">
              <Microscope className="w-10 h-10" />
            </div>
            <span className="text-3xl font-bold font-heading tracking-tight text-text-primary">
              Patent<span className="text-primary">Pilot</span>
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl md:text-4xl font-semibold font-heading tracking-tight leading-snug text-text-primary">
            Meet PatentPilot: Your<br />Freedom-to-Operate Assistant
          </h1>

          {/* Features List (Updated to match actual capabilities) */}
          <div className="space-y-8 mt-12">
            <div className="flex items-start space-x-4">
              <div className="text-primary text-xl mt-1 w-6 flex justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg font-heading text-text-primary">Molecule Ingestion & Parsing</h3>
                <p className="text-text-secondary text-sm mt-1 leading-relaxed">Instantly standardize SMILES, targets, and molecular structures to map precise pharmaceutical boundaries.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="text-primary text-xl mt-1 w-6 flex justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg font-heading text-text-primary">FAISS Prior Art Retrieval</h3>
                <p className="text-text-secondary text-sm mt-1 leading-relaxed">Lightning-fast vector embedding searches across global patent databases to surface hidden prior art.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="text-primary text-xl mt-1 w-6 flex justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg font-heading text-text-primary">Markush Claim Overlap Analysis</h3>
                <p className="text-text-secondary text-sm mt-1 leading-relaxed">Automatically evaluate structural novelty and direct FTO infringement risks against complex patent claims.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="text-primary text-xl mt-1 w-6 flex justify-center">
                <Lightbulb className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg font-heading text-text-primary">RAG Report Synthesis</h3>
                <p className="text-text-secondary text-sm mt-1 leading-relaxed">Generate actionable, AI-driven executive summaries and comprehensive Freedom-to-Operate reports in seconds.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Card Container */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md border border-border rounded-2xl p-8 bg-surface/40 backdrop-blur-md shadow-elegant">
            {/* Inner Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold font-heading text-text-primary">Sign in to PatentPilot</h2>
              <p className="text-xs text-text-secondary mt-1 tracking-wide">Freedom-to-Operate workspace</p>
            </div>

            {/* Demo Credentials Box */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center mb-6 shadow-soft">
              <p className="text-xs text-primary font-medium mb-0.5">Demo credentials:</p>
              <p className="text-sm font-mono text-success">demo@example.com / password123</p>
            </div>

            {/* Main Form */}
            <div className="space-y-4">
              {/* Google Login (Primary) */}
              <button 
                type="button" 
                onClick={() => googleLogin()}
                disabled={googleMutation.isPending || loginMutation.isPending}
                className="w-full bg-gradient-accent text-white font-semibold rounded-xl py-3 text-sm flex items-center justify-center space-x-2 transition-all shadow-glow hover:opacity-95 disabled:opacity-70"
              >
                {googleMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                ) : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5 bg-white rounded-full p-0.5" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                <span>Continue with Google</span>
              </button>


              {/* Divider */}
              <div className="relative flex py-5 items-center">
                <div className="flex-grow border-t border-border"></div>
                <span className="flex-shrink mx-4 text-xs uppercase tracking-widest text-text-tertiary font-medium">OR</span>
                <div className="flex-grow border-t border-border"></div>
              </div>

              {/* Demo Login (Secondary) */}
              <button 
                type="button" 
                onClick={() => loginMutation.mutate({ email: "demo@example.com", password: "password123" })}
                disabled={loginMutation.isPending || googleMutation.isPending}
                className="w-full bg-surface-raised border border-border hover:bg-surface-hover text-text-primary font-medium rounded-xl py-3 text-sm flex items-center justify-center space-x-2 transition-all shadow-soft disabled:opacity-70"
              >
                {loginMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>Sign in as Demo User</span>
              </button>

              {errorMsg && (
                <p role="alert" className="text-xs text-danger mt-2 text-center">
                  {errorMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}
