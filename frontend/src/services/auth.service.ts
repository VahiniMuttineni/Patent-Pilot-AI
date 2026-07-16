import { apiClient } from "@/lib/api-client";
import { AuthTokenResponse, LoginCredentials, RegisterCredentials, User } from "@/types/auth";

export const authService = {
  async register(credentials: RegisterCredentials): Promise<AuthTokenResponse> {
    const response = await apiClient.post<AuthTokenResponse>("/auth/register", credentials);
    return response.data;
  },

  async login(credentials: LoginCredentials): Promise<AuthTokenResponse> {
    // FastAPI OAuth2PasswordRequestForm requires form data
    const formData = new URLSearchParams();
    formData.append("username", credentials.email);
    formData.append("password", credentials.password);
    
    const response = await apiClient.post<AuthTokenResponse>("/auth/login", formData, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    return response.data;
  },

  async loginWithGoogle(token: string): Promise<AuthTokenResponse> {
    const response = await apiClient.post<AuthTokenResponse>("/auth/google", { token });
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>("/auth/me");
    return response.data;
  },

  logout(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
  },
  
  setTokens(response: AuthTokenResponse): void {
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
    }
  }
};
