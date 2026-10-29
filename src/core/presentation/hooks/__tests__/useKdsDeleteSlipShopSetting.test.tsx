import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  kdsDeleteSlips: true,
  canWrite: true,
  update: vi.fn(),
}));

vi.mock("../useVenueSetting", () => ({
  useVenueSetting: () => ({ kdsDeleteSlips: mocks.kdsDeleteSlips }),
}));

vi.mock("@/features/permissions/usePermissions", () => ({
  usePermissions: () => ({
    hasPermission: () => mocks.canWrite,
  }),
}));

vi.mock("@/core/infrastructure/di/container", () => ({
  default: {
    resolve: () => ({ updateKdsDeleteSlips: mocks.update }),
  },
}));

import { useKdsDeleteSlipShopSetting } from "../useKdsDeleteSlipShopSetting";

describe("useKdsDeleteSlipShopSetting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.kdsDeleteSlips = true;
    mocks.canWrite = true;
    mocks.update.mockResolvedValue({ kdsDeleteSlips: false });
  });

  it("saves the off state to the shop setting and reflects it", async () => {
    const { result } = renderHook(() => useKdsDeleteSlipShopSetting());

    expect(result.current.enabled).toBe(true);
    await act(async () => {
      await result.current.save(false);
    });

    expect(mocks.update).toHaveBeenCalledWith(false);
    expect(result.current.enabled).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("does not save when the account cannot write venue settings", async () => {
    mocks.canWrite = false;
    const { result } = renderHook(() => useKdsDeleteSlipShopSetting());

    await act(async () => {
      await result.current.save(false);
    });

    expect(result.current.canWrite).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
