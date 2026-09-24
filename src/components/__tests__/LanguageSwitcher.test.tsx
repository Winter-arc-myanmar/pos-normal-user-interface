import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "../LanguageSwitcher";
import i18n, { setAppLanguage } from "@/lib/i18n";
import { DashboardPage } from "@/pages/DashboardPage";

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({ activeLocationId: "" }),
}));

vi.mock("@/core/presentation/hooks/useReports", () => ({
  useReports: () => ({
    isLoading: false,
    error: null,
    salesSummary: vi.fn().mockResolvedValue({
      orders: { count: 0 },
      sales: { netSales: "0", grossSales: "0", grandTotal: "0", lineDiscounts: "0", orderDiscounts: "0", totalDiscounts: "0" },
      refunds: { count: 0, total: "0" },
      netAfterRefunds: "0",
      payments: { byMethod: [], tendered: "0", changeGiven: "0" },
      byServiceType: [],
    }),
    itemSales: vi.fn().mockResolvedValue({ categories: [], items: [] }),
    zReport: vi.fn().mockResolvedValue({
      orders: { completed: 0, voided: 0, refunded: 0 },
      totals: { grandTotal: "0", totalTax: "0" },
      payments: [],
    }),
  }),
}));

function renderDashboard() {
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <LanguageSwitcher />
        <DashboardPage />
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe("LanguageSwitcher", () => {
  afterEach(async () => {
    await setAppLanguage("en");
  });

  it("switches dashboard copy when Myanmar is selected", async () => {
    await setAppLanguage("en");
    renderDashboard();

    expect(
      screen.getByText("Sales summary, payments, item sales, and the end-of-day shift report.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Switch language"));
    expect(screen.queryByRole("option", { name: "한국어" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "简体中文" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "မြန်မာ" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "အရောင်းခွဲခြမ်းစိတ်ဖြာ" })
      ).toBeInTheDocument();
      expect(
        screen.getByText("အရောင်းအနှစ်ချုပ်၊ ငွေပေးချေမှု၊ ပစ္စည်းအရောင်းနှင့် အဆိုင်းအစီရင်ခံစာ။")
      ).toBeInTheDocument();
    });
  });

  it("translates cashier, cards, and settings namespaces in Myanmar", async () => {
    await setAppLanguage("my");
    expect(i18n.t("cashier.waitlistTitle")).toBe("စောင့်ဆိုင်းစာရင်း");
    expect(i18n.t("cashier.tipPool.title")).toBe("တိပ်ပေါင်းငွေ");
    expect(i18n.t("cards.title")).toBe("ကတ်များ");
    expect(i18n.t("counterOrders.title")).toBe("ကောင်တာ အော်ဒါများ");
    expect(i18n.t("settings.tabs.cashier")).not.toBe("Cashier Settings");
    expect(i18n.t("sync.title")).not.toBe("Sync & maintenance");
  });
});
