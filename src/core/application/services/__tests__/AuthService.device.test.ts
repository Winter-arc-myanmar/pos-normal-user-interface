import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../AuthService";
import type { IAuthRepository } from "@/core/domain/repositories/IAuthRepository";

describe("AuthService one POS device", () => {
  const repository = () =>
    ({
      login: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
      setActiveBranch: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
      checkSession: vi.fn().mockResolvedValue(undefined),
    }) as unknown as IAuthRepository & Record<string, ReturnType<typeof vi.fn>>;

  it("signs in as the POS, so the device signed in before is signed out", async () => {
    const repo = repository();
    await new AuthService(repo).login({ userId: "SHW0001", password: "secret" });

    expect(repo.login).toHaveBeenCalledWith({
      userId: "SHW0001",
      password: "secret",
      type: "user",
      app: "pos",
    });
  });

  it("checks the sign-in is still this device's", async () => {
    const repo = repository();
    await new AuthService(repo).checkSession();
    expect(repo.checkSession).toHaveBeenCalled();
  });
});
