import { User } from "../../domain/entities/User";
import { IAuthService } from "../../domain/services/IAuthService";
import { IAuthRepository } from "../../domain/repositories/IAuthRepository";
import {
  ChangePasswordRequestDTO,
  LoginInputDTO,
  SetActiveBranchRequestDTO,
} from "../dtos/AuthDTO";

/** The backend accepts new passwords of 8 to 20 characters. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 20;

/**
 * Auth Service implementation
 * Contains business logic for authentication-related operations
 */
export class AuthService implements IAuthService {
  private authRepository: IAuthRepository;

  constructor(authRepository: IAuthRepository) {
    this.authRepository = authRepository;
  }

  /**
   * Login a user with User ID and password
   */
  async checkSession(): Promise<void> {
    await this.authRepository.checkSession();
  }

  async login(input: LoginInputDTO): Promise<User> {
    const userId = input.userId?.trim();
    const password = input.password;

    if (!userId || !password) {
      throw new Error("User ID and password are required");
    }

    try {
      const result = await this.authRepository.login({
        userId,
        password,
        type: "user",
        app: "pos",
      });
      return result.user;
    } catch (error: unknown) {
      console.error("Login failed:", error);
      if (error instanceof Error && error.message) {
        throw error;
      }
      throw new Error("Login failed. Please try again.");
    }
  }

  async setActiveBranch(payload: SetActiveBranchRequestDTO): Promise<User> {
    if (!payload.branchId?.trim()) {
      throw new Error("Branch is required");
    }

    const result = await this.authRepository.setActiveBranch({
      branchId: payload.branchId.trim(),
    });

    return result.user;
  }

  /**
   * Change the signed-in person's own password. The rules mirror the backend:
   * the current password is required, and the new one is 8 to 20 characters and
   * must differ from the current one. A wrong current password comes back as a
   * validation error (400) — it must never look like a lapsed session.
   */
  async changePassword(payload: ChangePasswordRequestDTO): Promise<void> {
    const currentPassword = payload.currentPassword || "";
    const newPassword = payload.newPassword || "";

    if (!currentPassword) {
      throw new Error("Enter your current password.");
    }
    if (
      newPassword.length < PASSWORD_MIN_LENGTH ||
      newPassword.length > PASSWORD_MAX_LENGTH
    ) {
      throw new Error(
        `The new password must be ${PASSWORD_MIN_LENGTH} to ${PASSWORD_MAX_LENGTH} characters long.`
      );
    }
    if (newPassword === currentPassword) {
      throw new Error("The new password must be different from the current one.");
    }

    try {
      const changed = await this.authRepository.changePassword({
        currentPassword,
        newPassword,
      });
      if (!changed) {
        throw new Error("The password was not changed. Please try again.");
      }
    } catch (error) {
      console.error("Change password failed:", error);
      if (error instanceof Error && error.message) {
        throw error;
      }
      throw new Error("Unable to change the password. Please try again.");
    }
  }

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      await this.authRepository.logout();
    } catch (error) {
      console.error("Error during logout:", error);
    }
  }

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      return await this.authRepository.getCurrentUser();
    } catch (error) {
      console.error("Error retrieving current user:", error);
      return null;
    }
  }

  /**
   * Check if the user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return !!user;
  }
}
