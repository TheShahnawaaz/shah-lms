const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5001/api";

export interface ApiResponse<T> {
  code: number;
  details: string;
  data: T;
}

class ApiClient {
  private getToken(): string | null {
    return localStorage.getItem("az_auth_token");
  }

  setToken(token: string) {
    localStorage.setItem("az_auth_token", token);
  }

  clearToken() {
    localStorage.removeItem("az_auth_token");
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;

    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");

    const token = this.getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      const payload = await response.json();

      if (response.status === 401) {
        this.clearToken();
        // Redirect to login if in browser context
        if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
          window.location.href = "/login";
        }
      }

      if (!response.ok) {
        throw new Error(payload.details || "Request failed");
      }

      return payload as ApiResponse<T>;
    } catch (err: any) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  get<T>(endpoint: string, options: RequestInit = {}) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body?: any, options: RequestInit = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined
    });
  }

  delete<T>(endpoint: string, options: RequestInit = {}) {
    return this.request<T>(endpoint, {
      ...options,
      method: "DELETE"
    });
  }
}

export const api = new ApiClient();
export default api;
