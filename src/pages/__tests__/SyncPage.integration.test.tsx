import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncPage } from "../SyncPage";

const mocks = vi.hoisted(() => ({
  pullLatestSettings: vi.fn(),
  pullItemUpdates: vi.fn(),
  uploadOrders: vi.fn(),
  restartService: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "sync.lastRun") return `Last time ${options?.time ?? ""}`;
      const labels: Record<string, string> = {
        "sync.title": "Sync & maintenance",
        "sync.subtitle": "Keep this device aligned",
        "sync.neverRun": "Not run yet on this device",
        "sync.settings.title": "Get latest settings",
        "sync.settings.description": "Pull latest settings",
        "sync.settings.getUpdates": "Get updates",
        "sync.settings.itemUpdates": "Item updates",
        "sync.upload.title": "Upload order",
        "sync.upload.description": "Upload orders",
        "sync.upload.uploadNow": "Upload now",
        "sync.restart.title": "Service restart",
        "sync.restart.description": "Restart services",
        "sync.restart.restart": "Restart",
      };
      return labels[key] || key;
    },
  }),
}));

vi.mock("@/lib/i18n/formatters", () => ({
  useDateFormatter: () => ({
    formatDateTime: (value: string) => value,
  }),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { tenantId: "tenant-1" },
  }),
}));

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({
    activeLocationId: "location-1",
    activePosRegisterId: "register-1",
    activePosSessionId: "session-1",
  }),
}));

vi.mock("@/core/presentation/hooks/usePosSync", () => ({
  usePosSync: () => ({
    lastSettingsSyncAt: null,
    lastItemSyncAt: null,
    lastOrderUploadAt: null,
    lastRestartAt: null,
    isLoading: false,
    error: null,
    notice: null,
    pullLatestSettings: mocks.pullLatestSettings,
    pullItemUpdates: mocks.pullItemUpdates,
    uploadOrders: mocks.uploadOrders,
    restartService: mocks.restartService,
    clearError: vi.fn(),
    clearNotice: vi.fn(),
  }),
}));

describe("SyncPage integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pullLatestSettings.mockResolvedValue(undefined);
    mocks.pullItemUpdates.mockResolvedValue(undefined);
    mocks.uploadOrders.mockResolvedValue(undefined);
    mocks.restartService.mockResolvedValue(undefined);
  });

  it("renders sync cards and triggers actions", () => {
    render(<SyncPage />);

    expect(screen.getByText("Sync & maintenance")).toBeInTheDocument();
    expect(screen.getByText("Get latest settings")).toBeInTheDocument();
    expect(screen.getByText("Upload order")).toBeInTheDocument();
    expect(screen.getByText("Service restart")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Get updates" }));
    fireEvent.click(screen.getByRole("button", { name: "Item updates" }));
    fireEvent.click(screen.getByRole("button", { name: "Upload now" }));
    fireEvent.click(screen.getByRole("button", { name: "Restart" }));

    expect(mocks.pullLatestSettings).toHaveBeenCalled();
    expect(mocks.pullItemUpdates).toHaveBeenCalled();
    expect(mocks.uploadOrders).toHaveBeenCalled();
    expect(mocks.restartService).toHaveBeenCalled();
  });
});
