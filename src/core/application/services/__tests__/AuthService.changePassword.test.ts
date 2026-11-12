import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../AuthService";
import type { IAuthRepository } from "@/core/domain/repositories/IAuthRepository";

const repository = (
  changePassword = vi.fn().mockResolvedValue(true)
): IAuthRepository & Record<string, ReturnType<typeof vi.fn>> =>
  ({
    login: vi.fn(),
    setActiveBranch: vi.fn(),
    changePassword,
    logout: vi.fn(),
    checkSession: vi.fn(),
    getCurrentUser: vi.fn(),
  }) as unknown as IAuthRepository & Record<string, ReturnType<typeof vi.fn>>;

describe("AuthService change password", () => {
  it("sends the current and the new password and resolves once the server changed it", async () => {
    const repo = repository();

    await new AuthService(repo).changePassword({
      currentPassword: "oldpass1",
      newPassword: "newpass123",
    });

    expect(repo.changePassword).toHaveBeenCalledWith({
      currentPassword: "oldpass1",
      newPassword: "newpass123",
    });
  });

  it("requires the current password", async () => {
    const repo = repository();

    await expect(
      new AuthService(repo).changePassword({
        currentPassword: "",
        newPassword: "newpass123",
      })
    ).rejects.toThrow(/current password/i);
    expect(repo.changePassword).not.toHaveBeenCalled();
  });

  it("refuses a new password outside 8 to 20 characters", async () => {
    const repo = repository();
    const service = new AuthService(repo);

    await expect(
      service.changePassword({ currentPassword: "oldpass1", newPassword: "short7!" })
    ).rejects.toThrow(/8 to 20/);
    await expect(
      service.changePassword({
        currentPassword: "oldpass1",
        newPassword: "x".repeat(21),
      })
    ).rejects.toThrow(/8 to 20/);
    expect(repo.changePassword).not.toHaveBeenCalled();
  });

  it("refuses a new password that matches the current one", async () => {
    const repo = repository();

    await expect(
      new AuthService(repo).changePassword({
        currentPassword: "samepass1",
        newPassword: "samepass1",
      })
    ).rejects.toThrow(/different/i);
    expect(repo.changePassword).not.toHaveBeenCalled();
  });

  it("keeps the API's message when the current password is wrong (400, never a sign-out)", async () => {
    const repo = repository(
      vi.fn().mockRejectedValue(new Error("Current password is incorrect"))
    );

    await expect(
      new AuthService(repo).changePassword({
        currentPassword: "wrongpass",
        newPassword: "newpass123",
      })
    ).rejects.toThrow("Current password is incorrect");
  });

  it("fails when the server reports the password was not changed", async () => {
    const repo = repository(vi.fn().mockResolvedValue(false));

    await expect(
      new AuthService(repo).changePassword({
        currentPassword: "oldpass1",
        newPassword: "newpass123",
      })
    ).rejects.toThrow(/not changed/i);
  });
});
