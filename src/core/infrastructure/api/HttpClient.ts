import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { API_CONFIG, API_ENDPOINTS } from "./constants";
import {
  tokenCookies,
  isTokenExpired,
  isTokenExpiringSoon,
  getTimeUntilExpiration,
} from "@/lib/cookies";

/**
 * Base HTTP client using Axios
 * Handles common configuration and error handling for API requests
 * Implements CSRF protection for all non-GET requests (except login)
 * Includes JWT token expiration handling and automatic redirect
 */
export class HttpClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private csrfToken: string | null = null;
  private csrfSupported: boolean = true;
  private isRedirecting: boolean = false;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || API_CONFIG.BASE_URL;
    this.csrfToken = tokenCookies.getCsrfToken();

    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      withCredentials: true, // Important for cookies and CSRF
    });

    // Add request interceptor for auth token and CSRF protection
    this.client.interceptors.request.use(
      async (config) => {
        const token = tokenCookies.getToken();

        // Check if token exists and is valid
        if (token) {
          // Check if token is expired before making request
          if (isTokenExpired(token)) {
            console.warn("JWT token is expired, redirecting to login");
            this.handleTokenExpiration();
            return Promise.reject(new Error("Token expired"));
          }

          // Check if token is expiring soon (within 5 minutes)
          if (isTokenExpiringSoon(token, 5)) {
            console.warn("JWT token will expire soon, consider refreshing");
            // You could implement a refresh token mechanism here
            // For now, we'll just warn the user
          }

          config.headers.Authorization = `Bearer ${token}`;
        }

        // Handle FormData requests by removing Content-Type header
        // This allows the browser to set the proper multipart/form-data header with boundary
        if (config.data instanceof FormData) {
          delete config.headers["Content-Type"];
        }

        // CSRF Protection Logic
        // Skip CSRF for GET, HEAD, and OPTIONS requests
        if (
          ["GET", "HEAD", "OPTIONS"].includes(
            config.method?.toUpperCase() || ""
          )
        ) {
          return config;
        }

        // Skip CSRF for login endpoint
        if (config.url === API_ENDPOINTS.AUTH.LOGIN) {
          return config;
        }

        // Reuse an existing CSRF token if one was already established during
        // login or a previous session, but do not auto-fetch a new token here.
        // This prevents admin actions from triggering a fresh /csrf/token call
        // every time the first protected request is made.
        if (this.csrfSupported && this.csrfToken) {
          config.headers["X-CSRF-Token"] = this.csrfToken;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle token expiration or auth errors
        if (error.response?.status === 401) {
          console.warn("Received 401 Unauthorized, token may be expired");

          // Only redirect if we're not on the login page and not making a login request
          const isLoginRequest = error.config?.url === API_ENDPOINTS.AUTH.LOGIN;
          const isOnLoginPage = window.location.pathname === "/login";

          if (!isLoginRequest && !isOnLoginPage) {
            this.handleTokenExpiration();
            return Promise.reject(new Error("Authentication required"));
          }

          // For login requests, just reject with the original error
          return Promise.reject(error);
        }

        // Handle CSRF token errors
        if (
          error.response?.status === 403 &&
          error.response?.data?.message?.includes("CSRF")
        ) {
          // Clear CSRF token and retry
          this.csrfToken = null;
          this.csrfSupported = true;
          tokenCookies.removeCsrfToken();
          console.error("CSRF token invalid, please retry");
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Handle token expiration by clearing tokens and redirecting to login
   */
  private handleTokenExpiration(): void {
    if (this.isRedirecting) return; // Prevent multiple redirects

    this.isRedirecting = true;

    // Clear all tokens
    tokenCookies.clearAll();
    this.csrfToken = null;
    this.csrfSupported = true;

    // Show user-friendly message
    console.log("Your session has expired. Please log in again.");

    // Redirect to login page
    // Use window.location.href for a full page reload to clear any cached state
    window.location.href = "/login";
  }

  /**
   * Check if current token is valid (not expired)
   */
  public isTokenValid(): boolean {
    const token = tokenCookies.getToken();
    if (!token) return false;
    return !isTokenExpired(token);
  }

  /**
   * Check if current token is expiring soon
   */
  public isTokenExpiringSoon(warningMinutes: number = 5): boolean {
    const token = tokenCookies.getToken();
    if (!token) return false;
    return isTokenExpiringSoon(token, warningMinutes);
  }

  /**
   * Get time until token expires in seconds
   */
  public getTimeUntilExpiration(): number {
    const token = tokenCookies.getToken();
    if (!token) return 0;

    return getTimeUntilExpiration(token);
  }

  /**
   * Manually refresh CSRF token
   * Useful when token expires or becomes invalid
   */
  async refreshCsrfToken(): Promise<string | null> {
    try {
      const token = tokenCookies.getToken();
      if (!token) {
        throw new Error("No JWT token available");
      }

      if (!this.csrfSupported) {
        return null;
      }

      const response = await axios.get(
        `${this.baseUrl}${API_ENDPOINTS.CSRF.TOKEN}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      this.csrfToken = response.data.token;
      if (this.csrfToken) {
        tokenCookies.setCsrfToken(this.csrfToken);
      }
      return this.csrfToken;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        this.csrfSupported = false;
      } else {
        console.error("Failed to refresh CSRF token:", error);
      }
      this.csrfToken = null;
      tokenCookies.removeCsrfToken();
      return null;
    }
  }

  /**
   * Clear CSRF token (useful for logout)
   */
  clearCsrfToken(): void {
    this.csrfToken = null;
    this.csrfSupported = true;
    tokenCookies.removeCsrfToken();
  }

  /**
   * Make a GET request
   */
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  /**
   * Make a POST request
   */
  async post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(
      url,
      data,
      config
    );
    return response.data;
  }

  /**
   * Make a PUT request
   */
  async put<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(
      url,
      data,
      config
    );
    return response.data;
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }
}
