import { User } from "../../domain/entities/User";
import { IUserRepository } from "../../domain/repositories/IUserRepository";
import {
  UserListRequestDTO,
  UserDomainListResponseDTO,
  UpdateUserDTO,
  UpdateProfileDTO,
  CreateUserDTO,
  UserDTOMapper,
} from "../dtos/UserDTO";
import { IUserService } from "../../domain/services/IUserService";
import { calculatePasswordStrength } from "@/lib/utils/password";
import i18n from "@/lib/i18n";

/**
 * User Management Service
 * Contains business logic for user management operations
 */
export class UserManagementService implements IUserService {
  private userRepository: IUserRepository;

  constructor(userRepository: IUserRepository) {
    this.userRepository = userRepository;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      return await this.userRepository.getCurrentUser();
    } catch (error) {
      console.error("Error getting current user:", error);
      throw new Error("Failed to get current user");
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(id: string): Promise<User | null> {
    if (!id) {
      throw new Error("User ID is required");
    }

    try {
      return await this.userRepository.findById(id);
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw new Error("Failed to get user");
    }
  }

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserDTO): Promise<User> {
    // Validate required fields
    if (!userData.name.trim()) {
      throw new Error("Name is required");
    }

    if (!userData.email || !userData.email.includes("@")) {
      throw new Error("Valid email is required");
    }

    // Validate role if provided
    if (userData.role && !["ADMIN", "STAFF"].includes(userData.role)) {
      throw new Error("Invalid role. Must be ADMIN or STAFF");
    }

    try {
      return await this.userRepository.createUser(userData);
    } catch (error) {
      console.error("Error creating user:", error);
      throw new Error("Failed to create user");
    }
  }

  /**
   * Get users list with pagination and filtering
   */
  async getUserList(
    params: UserListRequestDTO
  ): Promise<UserDomainListResponseDTO> {
    // Validate pagination parameters
    if (params.take <= 0 || params.skip < 0) {
      throw new Error("Invalid pagination parameters");
    }

    try {
      const result = await this.userRepository.getUserList(params);
      return UserDTOMapper.toDomainListResponseDTO(
        result.users,
        result.totalCounts
      );
    } catch (error) {
      console.error("Error getting user list:", error);
      throw new Error("Failed to get user list");
    }
  }

  /**
   * Update user
   */
  async updateUser(id: string, userData: UpdateUserDTO): Promise<User> {
    if (!id) {
      throw new Error("User ID is required");
    }

    // Validate email format if provided
    if (userData.email && !userData.email.includes("@")) {
      throw new Error("Invalid email format");
    }

    // Validate role if provided
    if (userData.role && !["ADMIN", "STAFF"].includes(userData.role)) {
      throw new Error("Invalid role. Must be ADMIN or STAFF");
    }

    try {
      return await this.userRepository.updateUser(id, userData);
    } catch (error) {
      console.error("Error updating user:", error);
      throw new Error("Failed to update user");
    }
  }

  /**
   * Update current user profile
   */
  async updateProfile(userData: UpdateProfileDTO): Promise<User> {
    // Validate password change if provided
    if (userData.newPassword && !userData.currentPassword) {
      throw new Error("Current password is required to set new password");
    }

    if (userData.newPassword && userData.newPassword.length < 6) {
      throw new Error("New password must be at least 6 characters long");
    }

    // Check password strength for new passwords (must be at least 80%)
    if (userData.newPassword) {
      const passwordStrength = calculatePasswordStrength(
        userData.newPassword,
        i18n.t
      );
      if (passwordStrength < 80) {
        throw new Error(
          "New password must be at least 80% strong. Please include uppercase, lowercase, numbers, and special characters."
        );
      }
    }

    try {
      return await this.userRepository.updateProfile(userData);
    } catch (error) {
      console.error("Error updating profile:", error);
      throw new Error("Failed to update profile");
    }
  }

  /**
   * Upload profile image
   */
  async uploadProfileImage(profileImage: File): Promise<{
    profileImageUrl: string;
    message: string;
    refreshedUser?: User;
  }> {
    // Validate file
    if (!profileImage) {
      throw new Error("Profile image is required");
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (profileImage.size > maxSize) {
      throw new Error("Profile image must be less than 5MB");
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(profileImage.type)) {
      throw new Error("Profile image must be JPEG, PNG, or WebP format");
    }

    try {
      return await this.userRepository.uploadProfileImage(profileImage);
    } catch (error) {
      console.error("Error uploading profile image:", error);
      throw new Error("Failed to upload profile image");
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: string): Promise<void> {
    if (!id) {
      throw new Error("User ID is required");
    }

    try {
      await this.userRepository.deleteUser(id);
    } catch (error) {
      console.error("Error deleting user:", error);
      throw new Error("Failed to delete user");
    }
  }

  /**
   * Check if user has admin permissions
   */
  async checkAdminPermissions(userId: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(userId);
      return user?.isAdmin() || false;
    } catch (error) {
      console.error("Error checking admin permissions:", error);
      return false;
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(
    role: "ADMIN" | "STAFF",
    take: number = 10,
    skip: number = 0
  ): Promise<UserDomainListResponseDTO> {
    return await this.getUserList({
      take,
      skip,
      role,
    });
  }

  /**
   * Search users by name
   */
  async searchUsersByName(
    name: string,
    take: number = 10,
    skip: number = 0
  ): Promise<UserDomainListResponseDTO> {
    if (!name.trim()) {
      throw new Error("Search name cannot be empty");
    }

    return await this.getUserList({
      take,
      skip,
      name: name.trim(),
    });
  }

  /**
   * Search users by email
   */
  async searchUsersByEmail(
    email: string,
    take: number = 10,
    skip: number = 0
  ): Promise<UserDomainListResponseDTO> {
    if (!email.trim()) {
      throw new Error("Search email cannot be empty");
    }

    return await this.getUserList({
      take,
      skip,
      email: email.trim(),
    });
  }

  /**
   * Search users by phone
   */
  async searchUsersByPhone(
    phone: string,
    take: number = 10,
    skip: number = 0
  ): Promise<UserDomainListResponseDTO> {
    if (!phone.trim()) {
      throw new Error("Search phone cannot be empty");
    }

    return await this.getUserList({
      take,
      skip,
      phone: phone.trim(),
    });
  }

  /**
   * Get users with custom sorting
   */
  async getUsersWithSorting(
    take: number = 10,
    skip: number = 0,
    sortBy:
      | "name"
      | "email"
      | "phone"
      | "role"
      | "createdAt"
      | "updatedAt" = "createdAt",
    sortOrder: "asc" | "desc" = "desc"
  ): Promise<UserDomainListResponseDTO> {
    return await this.getUserList({
      take,
      skip,
      sortBy,
      sortOrder,
    });
  }
}
