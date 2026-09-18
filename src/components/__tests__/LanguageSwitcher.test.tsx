import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { LanguageSwitcher } from "../LanguageSwitcher";
import i18n, { setAppLanguage } from "@/lib/i18n";
import { DashboardPage } from "@/pages/DashboardPage";

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
      screen.getByText("Neutral starter home. Replace this page with your product overview.")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Switch language"));
    expect(screen.queryByRole("option", { name: "한국어" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "简体中文" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: "မြန်မာ" }));

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "ပင်မစာမျက်နှာ" })
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "ထုတ်ကုန်အနှစ်ချုပ်ဖြင့် အစားထိုးနိုင်သော စတင်သည့်စာမျက်နှာ။"
        )
      ).toBeInTheDocument();
      expect(screen.getByText("နောက်ထပ်လုပ်ရန်များ")).toBeInTheDocument();
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
