import { beforeEach, describe, expect, it } from "vitest";
import {
  clearPosWorkspaceStorage,
  markPosWorkspaceBootstrapped,
  preparePosWorkspaceForLogin,
  readLastAuthUserId,
  shouldBootstrapPosWorkspace,
} from "../posWorkspace";
import {
  readStoredActiveLocationId,
  writeStoredActiveLocationId,
} from "../activeLocation";

describe("posWorkspace", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("requires bootstrap after login preparation", () => {
    writeStoredActiveLocationId("tenant-1", "location-old");
    markPosWorkspaceBootstrapped("cashier-1");

    preparePosWorkspaceForLogin("tenant-1");

    expect(readLastAuthUserId()).toBeNull();
    expect(readStoredActiveLocationId("tenant-1")).toBeNull();
    expect(shouldBootstrapPosWorkspace("cashier-1")).toBe(true);
  });

  it("skips bootstrap for the same user until logout clears storage", () => {
    markPosWorkspaceBootstrapped("cashier-1");

    expect(shouldBootstrapPosWorkspace("cashier-1")).toBe(false);
    expect(shouldBootstrapPosWorkspace("cashier-2")).toBe(true);
  });

  it("clears workspace storage on logout", () => {
    writeStoredActiveLocationId("tenant-1", "location-1");
    markPosWorkspaceBootstrapped("cashier-1");

    clearPosWorkspaceStorage("tenant-1");

    expect(readLastAuthUserId()).toBeNull();
    expect(readStoredActiveLocationId("tenant-1")).toBeNull();
  });
});
