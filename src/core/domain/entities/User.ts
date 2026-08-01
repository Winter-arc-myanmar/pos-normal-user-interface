/**
 * User entity representing the core domain model for users in the system
 * This is independent of any framework or external concern
 */
export class User {
  id!: string;
  name!: string;
  email!: string;
  phone?: string;
  role!: "ADMIN" | "STAFF";
  nickname?: string;
  adminRoleId?: string;
  adminRoleName?: string;
  permissions?: string[];
  profileImageUrl?: string;
  createdDate?: Date;
  updatedDate?: Date;

  // Index signature to allow access to properties by string key
  [key: string]: unknown;

  constructor(data: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: "ADMIN" | "STAFF";
    nickname?: string;
    adminRoleId?: string;
    adminRoleName?: string;
    permissions?: string[];
    profileImageUrl?: string;
    createdDate?: Date;
    updatedDate?: Date;
  }) {
    Object.assign(this, data);
  }

  /**
   * Validates that the user entity contains valid data
   */
  isValid(): boolean {
    // Basic email regex pattern for domain entity validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return (
      !!this.id &&
      !!this.name &&
      !!this.email &&
      emailRegex.test(this.email) &&
      !!this.role &&
      ["ADMIN", "STAFF"].includes(this.role)
    );
  }

  /**
   * Check if user has admin role
   */
  isAdmin(): boolean {
    return this.role === "ADMIN";
  }

  /**
   * Check if user has staff role
   */
  isStaff(): boolean {
    return this.role === "STAFF";
  }
}
