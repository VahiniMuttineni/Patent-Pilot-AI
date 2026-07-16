"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services/auth.service";
import { User } from "@/types/auth";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (tokenData: any) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check initial token state on mount
  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const { data: user, isLoading, isError, isFetching } = useQuery({
    queryKey: ["user", "me"],
    queryFn: () => authService.getMe(),
    enabled: isAuthenticated, // Only fetch if we think we are authenticated
    retry: 0,
  });

  // Handle auto-logout if token becomes invalid and fetch fails
  useEffect(() => {
    if (isAuthenticated && !isLoading && !isFetching && isError) {
      // The fetch failed (e.g., 401), and api-client didn't recover it
      setIsAuthenticated(false);
      authService.logout();
    }
  }, [isError, isLoading, isFetching, isAuthenticated]);

  const login = (tokenData: any) => {
    authService.setTokens(tokenData);
    setIsAuthenticated(true);
    // Invalidate queries so that the user query refetches immediately
    queryClient.invalidateQueries({ queryKey: ["user", "me"] });
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    queryClient.setQueryData(["user", "me"], null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user: user || null, isLoading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
