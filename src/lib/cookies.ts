/**
 * Cookie utility functions for secure token storage
 * Provides methods to set, get, and remove cookies with proper security settings
 * Falls back to sessionStorage if cookies are not available
 */

interface CookieOptions {
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
  httpOnly?: boolean;
}

/**
 * JWT Token utilities for validation and expiration checking
 */
interface JWTPayload {
  sub: string; // Subject (user ID)
  email: string;
  role: string;
  iat: number; // Issued at
  exp: number; // Expires at
}

/**
 * Decode JWT token without verification (client-side only)
 * Note: This doesn't verify the signature, only decodes the payload
 */
export function decodeJWT(token: string): JWTPayload | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode JWT token:", error);
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
}

/**
 * Check if JWT token will expire soon (within 5 minutes)
 */
export function isTokenExpiringSoon(
  token: string,
  warningMinutes: number = 5
): boolean {
  const payload = decodeJWT(token);
  if (!payload) return true;

  const currentTime = Math.floor(Date.now() / 1000);
  const warningTime = warningMinutes * 60; // Convert to seconds
  return payload.exp - currentTime < warningTime;
}

/**
 * Get token expiration time as Date object
 */
export function getTokenExpiration(token: string): Date | null {
  const payload = decodeJWT(token);
  if (!payload) return null;

  return new Date(payload.exp * 1000);
}

/**
 * Get time until token expires in seconds
 */
export function getTimeUntilExpiration(token: string): number {
  const payload = decodeJWT(token);
  if (!payload) return 0;

  const currentTime = Math.floor(Date.now() / 1000);
  return Math.max(0, payload.exp - currentTime);
}

export function clearAuthAndRedirectToLogin(): void {
  tokenCookies.clearAll();

  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

/**
 * Set a cookie with secure defaults
 */
export function setCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): void {
  const {
    expires,
    maxAge,
    path = "/",
    domain,
    secure = true,
    sameSite = "Strict",
    httpOnly = false,
  } = options;

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (expires) {
    cookieString += `; expires=${expires.toUTCString()}`;
  }

  if (maxAge) {
    cookieString += `; max-age=${maxAge}`;
  }

  if (path) {
    cookieString += `; path=${path}`;
  }

  if (domain) {
    cookieString += `; domain=${domain}`;
  }

  if (secure) {
    cookieString += "; secure";
  }

  if (sameSite) {
    cookieString += `; samesite=${sameSite}`;
  }

  if (httpOnly) {
    cookieString += "; httponly";
  }

  // Note: httpOnly cookies can only be set by the server
  // For client-side cookies, we'll use secure defaults
  document.cookie = cookieString;
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  const nameEQ = `${encodeURIComponent(name)}=`;
  const cookies = document.cookie.split(";");

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }

  return null;
}

/**
 * Remove a cookie by setting it to expire in the past
 */
export function removeCookie(name: string, path: string = "/"): void {
  document.cookie = `${encodeURIComponent(
    name
  )}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
}

/**
 * Check if cookies are supported/enabled
 */
export function areCookiesEnabled(): boolean {
  try {
    const testCookie = "test_cookie";
    setCookie(testCookie, "test", { maxAge: 1 });
    const exists = getCookie(testCookie) !== null;
    removeCookie(testCookie);
    return exists;
  } catch {
    return false;
  }
}

/**
 * Secure storage interface that uses cookies when available, falls back to sessionStorage
 */
class SecureStorage {
  private useCookies: boolean;

  constructor() {
    this.useCookies = areCookiesEnabled();
  }

  setItem(key: string, value: string): void {
    if (this.useCookies) {
      setCookie(key, value, {
        maxAge: 24 * 60 * 60, // 24 hours
        path: "/",
        secure: true,
        sameSite: "Strict",
      });
    } else {
      // Fallback to sessionStorage (more secure than localStorage)
      sessionStorage.setItem(key, value);
    }
  }

  getItem(key: string): string | null {
    if (this.useCookies) {
      return getCookie(key);
    } else {
      return sessionStorage.getItem(key);
    }
  }

  removeItem(key: string): void {
    if (this.useCookies) {
      removeCookie(key);
    } else {
      sessionStorage.removeItem(key);
    }
  }

  clear(): void {
    if (this.useCookies) {
      removeCookie("wms_token");
      removeCookie("wms_user");
      removeCookie("wms_csrf_token");
    } else {
      sessionStorage.removeItem("wms_token");
      sessionStorage.removeItem("wms_user");
      sessionStorage.removeItem("wms_csrf_token");
    }
  }
}

// Create singleton instance
const secureStorage = new SecureStorage();

/**
 * Token-specific cookie functions with secure defaults
 */
export const tokenCookies = {
  /**
   * Set authentication token cookie
   */
  setToken: (token: string) => {
    secureStorage.setItem("wms_token", token);
  },

  /**
   * Get authentication token
   */
  getToken: (): string | null => {
    return secureStorage.getItem("wms_token");
  },

  /**
   * Remove authentication token
   */
  removeToken: () => {
    secureStorage.removeItem("wms_token");
  },

  /**
   * Set user data cookie (for non-sensitive user info)
   */
  setUser: (userData: string) => {
    secureStorage.setItem("wms_user", userData);
  },

  /**
   * Get user data
   */
  getUser: (): string | null => {
    return secureStorage.getItem("wms_user");
  },

  /**
   * Remove user data
   */
  removeUser: () => {
    secureStorage.removeItem("wms_user");
  },

  /**
   * Set CSRF token cookie
   */
  setCsrfToken: (token: string) => {
    secureStorage.setItem("wms_csrf_token", token);
  },

  /**
   * Get CSRF token
   */
  getCsrfToken: (): string | null => {
    return secureStorage.getItem("wms_csrf_token");
  },

  /**
   * Remove CSRF token
   */
  removeCsrfToken: () => {
    secureStorage.removeItem("wms_csrf_token");
  },

  /**
   * Clear all auth-related cookies
   */
  clearAll: () => {
    secureStorage.clear();
    // Also clear CSRF token
    secureStorage.removeItem("wms_csrf_token");
  },
};
