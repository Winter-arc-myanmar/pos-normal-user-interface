import {
  tokenCookies,
  isTokenExpired,
  isTokenExpiringSoon,
  getTimeUntilExpiration,
  getTokenExpiration,
} from "@/lib/cookies";

/**
 * Token Management Service
 * Handles JWT token validation, expiration checking, and token lifecycle management
 */
export class TokenManagementService {
  private static instance: TokenManagementService;
  private expirationCheckInterval: ReturnType<typeof setInterval> | null = null;
  private warningCallbacks: Array<(timeLeft: number) => void> = [];
  private expirationCallbacks: Array<() => void> = [];

  private constructor() {
    this.startExpirationMonitoring();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): TokenManagementService {
    if (!TokenManagementService.instance) {
      TokenManagementService.instance = new TokenManagementService();
    }
    return TokenManagementService.instance;
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
   * Get token expiration date
   */
  public getTokenExpirationDate(): Date | null {
    const token = tokenCookies.getToken();
    if (!token) return null;
    return getTokenExpiration(token);
  }

  /**
   * Format time until expiration as human-readable string
   */
  public getFormattedTimeUntilExpiration(): string {
    const seconds = this.getTimeUntilExpiration();
    if (seconds <= 0) return "Expired";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      return `${remainingSeconds}s`;
    }
  }

  /**
   * Register callback for token expiration warnings
   */
  public onExpirationWarning(callback: (timeLeft: number) => void): () => void {
    this.warningCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.warningCallbacks.indexOf(callback);
      if (index > -1) {
        this.warningCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Register callback for token expiration
   */
  public onExpiration(callback: () => void): () => void {
    this.expirationCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.expirationCallbacks.indexOf(callback);
      if (index > -1) {
        this.expirationCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Clear all tokens and notify expiration callbacks
   */
  public clearTokens(): void {
    tokenCookies.clearAll();
    this.notifyExpirationCallbacks();
  }

  /**
   * Start monitoring token expiration
   */
  private startExpirationMonitoring(): void {
    // Check every 30 seconds
    this.expirationCheckInterval = setInterval(() => {
      this.checkTokenExpiration();
    }, 30000);

    // Also check immediately
    this.checkTokenExpiration();
  }

  /**
   * Check token expiration and notify callbacks
   */
  private checkTokenExpiration(): void {
    const token = tokenCookies.getToken();
    if (!token) {
      this.notifyExpirationCallbacks();
      return;
    }

    const timeLeft = this.getTimeUntilExpiration();

    // Check if token is expired
    if (timeLeft <= 0) {
      this.notifyExpirationCallbacks();
      return;
    }

    // Check if token is expiring soon (within 5 minutes)
    if (timeLeft <= 300) {
      // 5 minutes = 300 seconds
      this.notifyWarningCallbacks(timeLeft);
    }
  }

  /**
   * Notify warning callbacks
   */
  private notifyWarningCallbacks(timeLeft: number): void {
    this.warningCallbacks.forEach((callback) => {
      try {
        callback(timeLeft);
      } catch (error) {
        console.error("Error in token warning callback:", error);
      }
    });
  }

  /**
   * Notify expiration callbacks
   */
  private notifyExpirationCallbacks(): void {
    this.expirationCallbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error("Error in token expiration callback:", error);
      }
    });
  }

  /**
   * Stop monitoring token expiration
   */
  public stopMonitoring(): void {
    if (this.expirationCheckInterval) {
      clearInterval(this.expirationCheckInterval);
      this.expirationCheckInterval = null;
    }
  }

  /**
   * Cleanup method for when service is no longer needed
   */
  public destroy(): void {
    this.stopMonitoring();
    this.warningCallbacks = [];
    this.expirationCallbacks = [];
  }
}

// Export singleton instance
export const tokenManagementService = TokenManagementService.getInstance();
