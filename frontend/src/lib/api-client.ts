import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor for setting the auth token
apiClient.interceptors.request.use(
  (config) => {
    // In a real app with SSR, we might need a more robust token extraction method
    // For now, we'll read it from localStorage
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for handling 401s and refreshing tokens
apiClient.interceptors.response.use(
  (response) => {
    if (response.data && response.data.success === false) {
      return Promise.reject(response.data);
    }
    if (response.data && response.data.success === true && "data" in response.data) {
      response.data = response.data.data;
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Do not attempt refresh if the failed request was login, register, or refresh itself
    if (originalRequest?.url?.includes("/auth/login") || originalRequest?.url?.includes("/auth/register") || originalRequest?.url?.includes("/auth/refresh")) {
      return Promise.reject(error);
    }
    
    // If error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
        if (!refreshToken) {
          throw new Error("No refresh token");
        }
        
        // Use a generic axios instance to avoid circular interceptor loops
        const response = await axios.post(
          `${apiClient.defaults.baseURL}/auth/refresh?refresh_token=${refreshToken}`
        );
        
        const { access_token, refresh_token: new_refresh_token } = response.data;
        
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", new_refresh_token);
        }
        
        // Update header and retry
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        // Refresh token is invalid or expired
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          // Only redirect if not already on login/landing page
          const currentPath = window.location.pathname;
          if (currentPath !== "/login" && currentPath !== "/") {
            window.location.replace("/login");
          }
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
