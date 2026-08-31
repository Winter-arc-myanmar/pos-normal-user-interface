import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomersPage } from "../CustomersPage";

const mocks = vi.hoisted(() => ({
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
  createCustomer: vi.fn(),
  getInteractions: vi.fn(),
  createInteraction: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "crm.termsDays") return `${options?.days ?? 0} days`;
      const labels: Record<string, string> = {
        "crm.selectMember": "Please select a member",
        "crm.search": "Please enter Name, Phone No, Email",
        "crm.addCustomer": "Add customer",
        "crm.name": "Name",
        "crm.phone": "Phone",
        "crm.email": "Email",
        "crm.accountType": "Account type",
        "crm.loyaltyTier": "Loyalty tier",
        "crm.maxCredit": "Max credit",
        "crm.terms": "Payment terms",
        "crm.creditOn": "Credit account",
        "crm.created": "Customer created.",
        "common.save": "Save",
        "common.cancel": "Cancel",
        "common.delete": "Delete",
        "cashier.errors.missingTenant": "Missing tenant",
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
    user: { id: "user-1", tenantId: "tenant-1" },
  }),
}));

vi.mock("@/core/presentation/hooks/useCustomerManagement", () => ({
  useCustomerManagement: () => ({
    customers: [
      {
        id: "cust-1",
        name: "Test1",
        phone: "09123456789",
        email: "test1@example.com",
        accountType: "RETAIL",
        hasCreditAccount: false,
        maxCreditLimit: "0.0000",
        currentCreditBalance: "0.0000",
        paymentTermsDays: 0,
        loyaltyTier: "BRONZE",
        lifetimePointsEarned: 0,
      },
    ],
    page: 1,
    totalPages: 1,
    currentCustomer: null,
    interactions: [],
    isLoading: false,
    error: null,
    createCustomer: mocks.createCustomer,
    getCustomers: mocks.getCustomers,
    getCustomerById: mocks.getCustomerById,
    updateCustomer: vi.fn(),
    deleteCustomer: vi.fn(),
    getInteractionsForCustomer: mocks.getInteractions,
    createCustomerInteraction: mocks.createInteraction,
    deleteCustomerInteraction: vi.fn(),
    clearCurrentCustomer: vi.fn(),
  }),
}));

describe("CRM page integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCustomers.mockResolvedValue({ customers: [], total: 1, page: 1 });
    mocks.getCustomerById.mockResolvedValue({
      id: "cust-1",
      name: "Test1",
      phone: "09123456789",
    });
    mocks.getInteractions.mockResolvedValue({ interactions: [] });
    mocks.createCustomer.mockResolvedValue({
      id: "cust-2",
      name: "Walk-In Customer",
      phone: "09999999999",
    });
  });

  it("lists customers, opens a member, and creates a new customer", async () => {
    render(<CustomersPage />);

    expect(screen.getByText("Please select a member")).toBeInTheDocument();
    expect(screen.getByText("Test1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Test1/ }));
    await waitFor(() => {
      expect(mocks.getCustomerById).toHaveBeenCalledWith("cust-1");
      expect(mocks.getInteractions).toHaveBeenCalledWith(
        "cust-1",
        expect.objectContaining({ page: 1, limit: 20 })
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "Add customer" }));
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Walk-In Customer" },
    });
    fireEvent.change(screen.getByLabelText("Phone"), {
      target: { value: "09999999999" },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Add customer" })[1]);

    await waitFor(() => {
      expect(mocks.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "tenant-1",
          name: "Walk-In Customer",
          phone: "09999999999",
          accountType: "RETAIL",
          loyaltyTier: "BRONZE",
        })
      );
    });
  });
});
