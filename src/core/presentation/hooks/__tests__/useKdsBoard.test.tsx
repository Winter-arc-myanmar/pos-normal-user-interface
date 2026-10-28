import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KdsTicket } from "../../../domain/entities/Cashier";

const service = vi.hoisted(() => ({
  listKdsTickets: vi.fn(),
  startKdsTicket: vi.fn(),
  readyKdsTicket: vi.fn(),
}));

vi.mock("../../../infrastructure/di/container", () => ({
  default: { resolve: () => service },
}));

import { useKdsBoard } from "../useKdsBoard";

const ticket = new KdsTicket({
  id: "ticket-1",
  status: "PENDING",
  firedAt: "2026-10-01T10:00:00.000Z",
});

describe("useKdsBoard ticket actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.listKdsTickets.mockResolvedValue({ tickets: [ticket] });
  });

  it("keeps tickets and sets the error when starting a ticket fails", async () => {
    service.startKdsTicket.mockRejectedValue(new Error("Kitchen offline"));
    const { result } = renderHook(() => useKdsBoard());

    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.tickets).toEqual([ticket]);

    await act(async () => {
      await result.current.start("ticket-1");
    });

    expect(result.current.error).toBe("Kitchen offline");
    expect(result.current.tickets).toEqual([ticket]);
  });

  it("sets the error when readying a ticket fails", async () => {
    service.readyKdsTicket.mockRejectedValue(new Error("Station unavailable"));
    const { result } = renderHook(() => useKdsBoard());

    await act(async () => {
      await result.current.ready("ticket-1");
    });

    expect(result.current.error).toBe("Station unavailable");
    expect(result.current.tickets).toEqual([]);
  });
});
