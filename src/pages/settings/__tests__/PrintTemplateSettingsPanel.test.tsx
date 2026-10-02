import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it("creates a finance template as its own type", async () => {
    createTemplate.mockResolvedValue({ id: "template-finance" });
    render(<PrintTemplateSettingsPanel />);

    fireEvent.click(
      screen.getByRole("button", { name: /settings.printTemplate.placeFinanceHint/ })
    );
    fireEvent.click(
      screen.getByRole("button", { name: "settings.printTemplate.save" })
    );

    expect(createTemplate).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "FINANCE",
        name: "Default finance",
        locationId: "location-1",
        isDefault: true,
      })
    );
  });

  it("updates the receipt preview when display settings change", () => {
    render(<PrintTemplateSettingsPanel />);

    expect(screen.getByText("Coffee").parentElement).toHaveTextContent("10.00");
    expect(screen.getByText("+ Large 2.00")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "settings.printTemplate.price" })
    );
    fireEvent.change(screen.getByLabelText("settings.printTemplate.fontSize"), {
      target: { value: "LARGE" },
    });
    fireEvent.change(screen.getByLabelText("settings.printTemplate.paperWidth"), {
      target: { value: "MM58" },
    });

    expect(screen.getByText("Coffee").parentElement).not.toHaveTextContent("10.00");
    expect(screen.getByText("+ Large")).toBeInTheDocument();
    expect(screen.queryByText("+ Large 2.00")).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "settings.printTemplate.price" })
    );
    expect(screen.getByText("Coffee").parentElement).toHaveTextContent("10.00");
    expect(screen.getByText("+ Large 2.00")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("checkbox", { name: "settings.printTemplate.modifiers" })
    );
    expect(screen.queryByText("+ Large 2.00")).not.toBeInTheDocument();
    expect(screen.getByText("Coffee").closest("div")).toHaveClass("text-base");
  });
});
