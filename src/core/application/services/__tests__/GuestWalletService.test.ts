import { describe, expect, it, vi } from "vitest";
import { GuestWallet } from "@/core/domain/entities/GuestWallet";
import { GuestWalletService } from "../GuestWalletService";
import { IGuestWalletRepository } from "@/core/domain/repositories/IGuestWalletRepository";

const wallet = new GuestWallet({
  id: "wallet-1",
  tenantId: "tenant-1",
  walletNumber: "W-000041",
  guestName: "Ko Aung",
  guestPhone: "09123456789",
  tierId: "tier-1",
  tierNameSnapshot: "Silver",
  discountBpsSnapshot: 500,
  isPostpaidSnapshot: false,
  preloadAmountSnapshot: "100000",
  preloadFundingSnapshot: "PURCHASED",
  balance: "88600",
  purchasedBalance: "88600",
  grantedBalance: "0",
  sequenceNo: 4,
  status: "ACTIVE",
  issuedAtLocationId: "loc-1",
  issuedByUserId: "user-1",
});

describe("GuestWalletService", () => {
  const repository: IGuestWalletRepository = {
    issueWallet: vi.fn().mockResolvedValue(wallet),
    listWallets: vi.fn(),
    getWallet: vi.fn(),
    listWalletCards: vi.fn(),
    listWalletLedger: vi.fn(),
    auditWallet: vi.fn(),
    topUpWallet: vi.fn(),
    getSettlementQuote: vi.fn(),
    beginSettlement: vi.fn(),
    cancelSettlement: vi.fn(),
    settleWallet: vi.fn().mockResolvedValue(wallet),
    refundWallet: vi.fn().mockResolvedValue(wallet),
    voidWallet: vi.fn(),
    lookupCard: vi.fn(),
    bindCard: vi.fn(),
    listCards: vi.fn(),
    getCard: vi.fn(),
    unbindCard: vi.fn(),
    reportCardLost: vi.fn(),
    replaceCard: vi.fn(),
  };

  const service = new GuestWalletService(repository);

  it("rejects issue without a card UID", async () => {
    await expect(
      service.issueWallet({
        tierId: "tier-1",
        guestName: "Ko Aung",
        guestPhone: "09123456789",
        locationId: "loc-1",
        posSessionId: "session-1",
        cards: [{ cardUid: "  " }],
        payment: { paymentMethodId: "pm-1", amount: "100000" },
      })
    ).rejects.toThrow("At least one card UID is required");
  });

  it("rejects refund without approver authorization", async () => {
    await expect(
      service.refundWallet("wallet-1", {
        amount: "20000",
        paymentMethodId: "pm-1",
        posSessionId: "session-1",
        locationId: "loc-1",
        approverAuthorization: " ",
      })
    ).rejects.toThrow("Approver authorization is required");
  });

  it("adds an idempotency key when topping up", async () => {
    await service.topUpWallet("wallet-1", {
      amount: "60000",
      paymentMethodId: "pm-1",
      posSessionId: "session-1",
      locationId: "loc-1",
    });
    expect(repository.topUpWallet).toHaveBeenCalledWith(
      "wallet-1",
      expect.objectContaining({
        amount: "60000",
        idempotencyKey: expect.any(String),
      })
    );
  });
});
