import { User } from "../../domain/entities/User";
import { IAuthService } from "../../domain/services/IAuthService";
import { IAuthRepository } from "../../domain/repositories/IAuthRepository";
import {
  LoginInputDTO,
  SetActiveBranchRequestDTO,
} from "../dtos/AuthDTO";

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
   * Login a user with email and password
   */
  async login(input: LoginInputDTO): Promise<User> {
    const email = input.email?.trim();
    const password = input.password;

    if (!email || !password) {
      throw new Error("Email and password are required");
    }

    try {
      const result = await this.authRepository.login({
        email,
        password,
        type: "user",
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
