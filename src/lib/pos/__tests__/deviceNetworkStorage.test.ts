import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  LOCAL_DATA_VERSION,
  readDeviceWorkstation,
  resetDeviceSyncPassword,
  saveDeviceWorkstation,
  validateDeviceNetwork,
} from "../deviceNetworkStorage";

describe("device network storage", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    });
    let seed = 1;
    vi.stubGlobal("crypto", {
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(seed);
        seed += 1;
        return bytes;
      },
    });
  });

  it("rejects an incomplete network profile", () => {
    expect(
      validateDeviceNetwork({
        deviceName: "",
        ipAddress: "192.168.1.20",
        subnetMask: "255.255.255.0",
        gateway: "192.168.1.1",
      })
    ).toBe("name");
    expect(
      validateDeviceNetwork({
        deviceName: "Front counter",
        ipAddress: "192.168.1.20",
        subnetMask: "255.0.255.0",
        gateway: "192.168.1.1",
      })
    ).toBe("mask");
  });

  it("saves the workstation network and rotates the sync password", () => {
    const saved = saveDeviceWorkstation("tenant-1", "register-1", {
      deviceName: "Front counter",
      ipAddress: "192.168.1.20",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    });

    expect(saved.localDataVersion).toBe(LOCAL_DATA_VERSION);
    expect(readDeviceWorkstation("tenant-1", "register-1")?.network).toEqual({
      deviceName: "Front counter",
      ipAddress: "192.168.1.20",
      subnetMask: "255.255.255.0",
      gateway: "192.168.1.1",
    });

    const nextPassword = resetDeviceSyncPassword("tenant-1", "register-1");
    expect(nextPassword).not.toBe(saved.syncPassword);
    expect(readDeviceWorkstation("tenant-1", "register-1")?.syncPassword).toBe(
      nextPassword
    );
  });
});
