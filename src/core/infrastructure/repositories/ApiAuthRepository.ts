import axios from "axios";
import { User } from "../../domain/entities/User";
import { HttpClient } from "../api/HttpClient";
import { API_ENDPOINTS, API_CONFIG } from "../api/constants";
import { decodeJWT, isTokenExpired, tokenCookies } from "@/lib/cookies";

/**
 * API response types for auth endpoints
 */
interface LoginResponse {
  token?: string;
  accessToken?: string;
  user?: RegisterResponse;
  admin?: RegisterResponse;
}

interface RegisterResponse {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  phone: string;
  role: string;
  adminRoleId?: string;
  adminRoleName?: string;
  permissions?: unknown[];
  adminRole?: {
    id?: string;
    name?: string;
    permissions?: unknown[];
  };
  profileImageUrl?: string;
  createdDate: string;
  updatedDate: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ApiResponse<T> {
  message: string;
  code: number;
  data: T;
}

/**
 * Auth Repository implementation for API calls
 * Handles authentication through HTTP API
 */
export class ApiAuthRepository {
  private httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  /**
   * Login user with email and password
   */
  async login(
    identifier: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    try {
      this.clearPersistedAuthenticatedSession();
      const loginPayload = this.buildLoginPayload(identifier, password);

      const response = await this.httpClient.post<ApiResponse<LoginResponse>>(
        API_ENDPOINTS.AUTH.LOGIN,
        loginPayload
      );

      const token = this.extractToken(response);
      if (!token) {
        throw new Error("Login response did not include a token");
      }

      const responseUser = this.extractUser(response, identifier, token);
      if (!responseUser) {
        throw new Error("Login response did not include a user");
      }

      const user = this.mapApiResponseToUser(responseUser);

      this.persistAuthenticatedSession(token, user);

      return { user, token };
    } catch (error: unknown) {
      console.error("Error during login:", error);

      if (axios.isAxiosError(error)) {
        const msg = error.response?.data?.message;
        if (msg) throw new Error(String(msg));
      }
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Invalid credentials");
    }
  }

  private buildLoginPayload(
    identifier: string,
    password: string
  ): Record<string, string> {
    if (identifier.includes("@")) {
      return { email: identifier, password };
    }

    return { phone: identifier, password };
  }

  private persistAuthenticatedSession(token: string, user: User): void {
    sessionStorage.setItem("wms_token", token);
    sessionStorage.setItem("wms_user", JSON.stringify(user));

    // Keep existing tokenCookies integration so the current app auth restore
    // flow continues to work without wider repository changes.
    tokenCookies.setToken(token);
    tokenCookies.setUser(JSON.stringify(user));
  }

  private clearPersistedAuthenticatedSession(): void {
    sessionStorage.removeItem("wms_token");
    sessionStorage.removeItem("wms_user");
    tokenCookies.clearAll();
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      // Clear CSRF token
      this.httpClient.clearCsrfToken();

      // Clear stored data from all client-side auth storage
      this.clearPersistedAuthenticatedSession();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }

  /**
   * Get current user from secure cookie
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const token = tokenCookies.getToken();
      const userJson = tokenCookies.getUser();
      if (!token || !userJson) {
        tokenCookies.clearAll();
        return null;
      }

      if (isTokenExpired(token)) {
        tokenCookies.clearAll();
        return null;
      }

      const userData = JSON.parse(userJson);
      const user = this.mapApiResponseToUser(userData);

      return user;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Map API response to User entity
   */
  private mapApiResponseToUser(apiUser: RegisterResponse): User {
    const normalizedRole = this.normalizeRole(apiUser.role);
    const rolePermissions = this.normalizePermissions(
      apiUser.permissions ??
        apiUser.adminRole?.permissions ??
        []
    );

    return new User({
      id: String(apiUser.id),
      name: apiUser.name || apiUser.nickname || "",
      nickname: apiUser.nickname || apiUser.name || "",
      email: apiUser.email || "",
      phone: apiUser.phone,
      role: normalizedRole,
      adminRoleId: apiUser.adminRoleId || apiUser.adminRole?.id,
      adminRoleName: apiUser.adminRoleName || apiUser.adminRole?.name,
      permissions: rolePermissions,
      profileImageUrl: this.convertToFullUrl(apiUser.profileImageUrl),
      createdDate: new Date(apiUser.createdDate || apiUser.createdAt || Date.now()),
      updatedDate: new Date(apiUser.updatedDate || apiUser.updatedAt || Date.now()),
    });
  }

  /**
   * Convert relative URL to full URL
   */
  private convertToFullUrl(url?: string): string | undefined {
    if (!url) {
      return undefined;
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }
    return `${API_CONFIG.BASE_URL}${url}`;
  }

  private extractToken(response: unknown): string | null {
    if (!response || typeof response !== "object") return null;
    const root = response as Record<string, unknown>;
    const data =
      root.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : null;
    const nestedTokens =
      data?.tokens && typeof data.tokens === "object"
        ? (data.tokens as Record<string, unknown>)
        : null;

    const candidates = [
      root.token,
      root.accessToken,
      data?.token,
      data?.accessToken,
      data?.jwt,
      nestedTokens?.accessToken,
      nestedTokens?.token,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate;
      }
    }
    return null;
  }

  private extractUser(
    response: unknown,
    identifier?: string,
    token?: string
  ): RegisterResponse | null {
    if (!response || typeof response !== "object") return null;
    const root = response as Record<string, unknown>;
    const data =
      root.data && typeof root.data === "object"
        ? (root.data as Record<string, unknown>)
        : null;
    const nestedData =
      data?.data && typeof data.data === "object"
        ? (data.data as Record<string, unknown>)
        : null;

    const candidates = [
      nestedData?.user,
      nestedData?.admin,
      data?.user,
      data?.admin,
      root.user,
      root.admin,
    ].filter(
      (candidate): candidate is Record<string, unknown> =>
        !!candidate && typeof candidate === "object"
    );

    if (candidates.length === 0) return null;

    const normalizedIdentifier = String(identifier || "").trim().toLowerCase();
    const tokenPayload = token ? decodeJWT(token) : null;
    const tokenEmail = String(tokenPayload?.email || "").trim().toLowerCase();
    const tokenUserId = String(tokenPayload?.sub || "").trim();

    const matchedCandidate = candidates.find((candidate) => {
      const candidateEmail = String(candidate.email || "").trim().toLowerCase();
      const candidatePhone = String(candidate.phone || "").trim().toLowerCase();
      const candidateId = String(candidate.id || "").trim();

      return (
        (!!normalizedIdentifier &&
          (candidateEmail === normalizedIdentifier ||
            candidatePhone === normalizedIdentifier)) ||
        (!!tokenEmail && candidateEmail === tokenEmail) ||
        (!!tokenUserId && candidateId === tokenUserId)
      );
    });

    return (matchedCandidate || candidates[0]) as unknown as RegisterResponse;
  }

  private normalizeRole(rawRole: unknown): "ADMIN" | "STAFF" {
    const value = String(rawRole || "").trim().toUpperCase();
    return value === "ADMIN" ? "ADMIN" : "STAFF";
  }

  private normalizePermissions(rawPermissions: unknown[]): string[] {
    if (!Array.isArray(rawPermissions)) return [];

    return rawPermissions
      .map((entry) => {
        if (typeof entry === "string") return entry.trim();
        if (entry && typeof entry === "object") {
          const permission = entry as Record<string, unknown>;
          return String(
            permission.key ||
              permission.name ||
              permission.id ||
              ""
          ).trim();
        }
        return "";
      })
      .filter(Boolean);
  }
}
