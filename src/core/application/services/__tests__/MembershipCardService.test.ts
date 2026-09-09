import { describe, expect, it, vi } from "vitest";
import { MembershipCard } from "@/core/domain/entities/MembershipCard";
import { MembershipCardService } from "../MembershipCardService";
import { IMembershipCardRepository } from "@/core/domain/repositories/IMembershipCardRepository";

const card = new MembershipCard({
  id: "card-1",
  tenantId: "tenant-1",
  customerId: "cust-1",
  cardNumber: "MC-001",
  balance: "100.0000",
  status: "BOUND",
});

describe("MembershipCardService", () => {
  const repository: IMembershipCardRepository = {
    getMembershipCard: vi.fn(),
    topupMembershipCard: vi.fn().mockResolvedValue({ card }),
    refundMembershipCard: vi.fn().mockResolvedValue({ card }),
    bindMembershipCard: vi.fn().mockResolvedValue({ card }),
    unbindMembershipCard: vi.fn().mockResolvedValue({ card }),
    closeMembershipCard: vi.fn().mockResolvedValue({ card }),
    detectMembershipCard: vi.fn().mockResolvedValue({ card }),
    getTopupAmountOptions: vi.fn().mockResolvedValue([]),
    topupMembershipCardByNumber: vi.fn().mockResolvedValue({ card }),
    createTopupReceipt: vi.fn().mockResolvedValue({
      receiptId: "rcpt-1",
      cardNumber: "MC-001",
      amount: "100.0000",
      balanceAfter: "200.0000",
      printedAt: "2026-01-01T00:00:00.000Z",
    }),
    verifyMembershipCardPin: vi.fn().mockResolvedValue({ verified: true }),
    getRefundAmountOptions: vi.fn().mockResolvedValue([]),
    refundMembershipCardByNumber: vi.fn().mockResolvedValue({ card }),
    createRefundReceipt: vi.fn().mockResolvedValue({
      receiptId: "rcpt-refund-1",
      cardNumber: "MC-001",
      amount: "50.0000",
      balanceAfter: "50.0000",
      printedAt: "2026-01-01T00:00:00.000Z",
    }),
  };

  const service = new MembershipCardService(repository);

  it("rejects topup without amount", async () => {
    await expect(
      service.topupMembershipCard("cust-1", {
        tenantId: "tenant-1",
        amount: "0",
      })
    ).rejects.toThrow("Topup amount must be greater than zero");
  });

  it("binds a card with card number", async () => {
    const result = await service.bindMembershipCard("cust-1", {
      tenantId: "tenant-1",
      cardNumber: "MC-001",
    });
    expect(result.card.cardNumber).toBe("MC-001");
    expect(repository.bindMembershipCard).toHaveBeenCalled();
  });

  it("rejects card detection without card number", async () => {
    await expect(
      service.detectMembershipCard({ cardNumber: "  " })
    ).rejects.toThrow("Card number is required");
  });

  it("falls back to default amount options when repository returns empty", async () => {
    const options = await service.getTopupAmountOptions();
    expect(options.length).toBeGreaterThan(0);
  });

  it("rejects refund without PIN", async () => {
    await expect(
      service.refundMembershipCardByNumber({
        tenantId: "tenant-1",
        cardNumber: "MC-001",
        amount: "10.0000",
        pin: "",
      })
    ).rejects.toThrow("PIN is required");
  });

  it("falls back to default refund amount options when repository returns empty", async () => {
    const options = await service.getRefundAmountOptions();
    expect(options.length).toBeGreaterThan(0);
  });
});
