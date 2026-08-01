import { User } from "../entities/User";
import {
  CreateUserDTO,
  UpdateUserDTO,
  UpdateProfileDTO,
  UserListRequestDTO,
  UserDomainListResponseDTO,
} from "../../application/dtos/UserDTO";

/**
 * Interface for user service
 */
export interface IUserService {
  /**
   * Get current user
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Get user by ID
   */
  getUserById(id: string): Promise<User | null>;

  /**
   * Create a new user
   */
  createUser(userData: CreateUserDTO): Promise<User>;

  /**
   * Get users list with pagination and filtering
   */
  getUserList(params: UserListRequestDTO): Promise<UserDomainListResponseDTO>;

  /**
   * Update user
   */
  updateUser(id: string, userData: UpdateUserDTO): Promise<User>;

  /**
   * Update current user profile
   */
  updateProfile(userData: UpdateProfileDTO): Promise<User>;

  /**
   * Upload profile image
   */
  uploadProfileImage(profileImage: File): Promise<{
    profileImageUrl: string;
    message: string;
    refreshedUser?: User;
  }>;

  /**
   * Delete user
   */
  deleteUser(id: string): Promise<void>;

  /**
   * Check if user has admin permissions
   */
  checkAdminPermissions(userId: string): Promise<boolean>;

  /**
   * Get users by role
   */
  getUsersByRole(
    role: "ADMIN" | "STAFF",
    take?: number,
    skip?: number
  ): Promise<UserDomainListResponseDTO>;

  /**
   * Search users by name
   */
  searchUsersByName(
    name: string,
    take?: number,
    skip?: number
  ): Promise<UserDomainListResponseDTO>;

  /**
   * Search users by email
   */
  searchUsersByEmail(
    email: string,
    take?: number,
    skip?: number
  ): Promise<UserDomainListResponseDTO>;

  /**
   * Search users by phone
   */
  searchUsersByPhone(
    phone: string,
    take?: number,
    skip?: number
  ): Promise<UserDomainListResponseDTO>;

  /**
   * Get users with custom sorting
   */
  getUsersWithSorting(
    take?: number,
    skip?: number,
    sortBy?: "name" | "email" | "phone" | "role" | "createdAt" | "updatedAt",
    sortOrder?: "asc" | "desc"
  ): Promise<UserDomainListResponseDTO>;
}
