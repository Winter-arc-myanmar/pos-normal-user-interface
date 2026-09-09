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
});
