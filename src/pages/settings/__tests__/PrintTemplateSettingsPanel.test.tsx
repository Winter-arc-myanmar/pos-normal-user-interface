import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PrintTemplateSettingsPanel } from "../PrintTemplateSettingsPanel";

const createTemplate = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/core/presentation/hooks/usePosWorkspace", () => ({
  usePosWorkspace: () => ({ activeLocationId: "location-1" }),
}));

vi.mock("@/core/presentation/hooks/usePrintTemplateManagement", () => ({
  usePrintTemplateManagement: () => ({
    templates: [],
    isLoading: false,
    error: null,
    listTemplates: vi.fn().mockResolvedValue({ templates: [] }),
    createTemplate,
    updateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
  }),
}));

describe("PrintTemplateSettingsPanel", () => {
  it("creates a receipt template for the current branch", async () => {
    createTemplate.mockResolvedValue({ id: "template-1" });
    render(<PrintTemplateSettingsPanel />);

    fireEvent.click(
      screen.getByRole("button", { name: "settings.printTemplate.save" })
    );

    expect(createTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "RECEIPT",
        name: "Default receipt",
        locationId: "location-1",
        paperWidth: "MM80",
        isDefault: true,
      })
    );
  });

  it("updates the receipt preview when display settings change", () => {
    render(<PrintTemplateSettingsPanel />);

    expect(screen.getAllByText("settings.printTemplate.logo")).toHaveLength(2);
    expect(screen.getAllByText("10.00").length).toBeGreaterThan(0);
    expect(screen.queryByText("ကော်ဖီ")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "settings.printTemplate.logo" }));
    fireEvent.click(
      screen.getByRole("checkbox", { name: "settings.printTemplate.hidePriceOnOrderBill" })
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "settings.printTemplate.bilingual" })
    );
    fireEvent.change(screen.getByLabelText("settings.printTemplate.fontSize"), {
      target: { value: "LARGE" },
    });
    fireEvent.change(screen.getByLabelText("settings.printTemplate.paperWidth"), {
      target: { value: "MM58" },
    });
    fireEvent.change(screen.getByLabelText("settings.printTemplate.place"), {
      target: { value: "KDS" },
    });

    expect(screen.getAllByText("settings.printTemplate.logo")).toHaveLength(1);
    expect(screen.queryAllByText("10.00")).toHaveLength(0);
    expect(screen.getByText("ကော်ဖီ")).toBeInTheDocument();
    expect(screen.getByText("settings.printTemplate.kitchen")).toBeInTheDocument();
    expect(screen.getByText("Coffee").closest("div")).toHaveClass("text-base");
  });
});
