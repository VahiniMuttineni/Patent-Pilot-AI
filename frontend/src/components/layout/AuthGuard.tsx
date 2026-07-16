"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If not loading and not authenticated, and we are not on a public page
    if (!isLoading && !isAuthenticated) {
      if (pathname !== "/login" && pathname !== "/") {
        // Save the attempted URL (can be retrieved after login)
        sessionStorage.setItem("redirectUrl", pathname);
        router.push("/login");
      }
    } else if (!isLoading && isAuthenticated) {
      // If we are authenticated but on a login/signup/landing page, redirect away
      if (pathname === "/login" || pathname === "/") {
        const redirectUrl = sessionStorage.getItem("redirectUrl") || "/dashboard";
        sessionStorage.removeItem("redirectUrl");
        router.push(redirectUrl);
      }
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // We are waiting to redirect, don't show the protected content
  if (!isAuthenticated && pathname !== "/login" && pathname !== "/") {
    return null;
  }

  // Waiting to redirect away from public pages
  if (isAuthenticated && (pathname === "/login" || pathname === "/")) {
    return null; 
  }

  return <>{children}</>;
}
