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

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ user: { tenantId: "tenant-1" } }),
}));

vi.mock("@/core/presentation/hooks/useVenueSetting", () => ({
  useVenueSetting: () => ({ currency: "MMK" }),
}));

vi.mock("@/core/presentation/hooks/usePrinterConnection", () => ({
  printCompanyFor: () => Promise.resolve({ name: "Grand Spa" }),
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

  it("previews the receipt with the code that prints it", async () => {
    render(<PrintTemplateSettingsPanel />);
    const preview = screen.getByTestId("slip-preview");

    expect(await screen.findByText("GRAND SPA")).toBeInTheDocument();
    expect(preview).toHaveTextContent("53,675 MMK");
    expect(preview).toHaveTextContent("+ Extra egg (+500)");
    expect(preview).toHaveTextContent("Cashier Aung Aung");

    fireEvent.click(
      screen.getByRole("checkbox", { name: "settings.printTemplate.cashier" })
    );
    fireEvent.click(
      screen.getByRole("checkbox", { name: "settings.printTemplate.modifiers" })
    );
    expect(preview).not.toHaveTextContent("Aung Aung");
    expect(preview).not.toHaveTextContent("Extra egg");
  });

  it("narrows the preview to the paper width", () => {
    render(<PrintTemplateSettingsPanel />);
    const preview = screen.getByTestId("slip-preview");
    expect(preview.style.width).toContain("48ch");

    fireEvent.change(screen.getByLabelText("settings.printTemplate.paperWidth"), {
      target: { value: "MM58" },
    });
    expect(screen.getByTestId("slip-preview").style.width).toContain("32ch");
  });

  it("previews a kitchen ticket for a kitchen template", () => {
    render(<PrintTemplateSettingsPanel />);
    fireEvent.click(
      screen.getByRole("button", { name: /settings.printTemplate.placeKdsHint/ })
    );
    const preview = screen.getByTestId("slip-preview");
    expect(preview).toHaveTextContent("KTV K3");
    expect(preview).toHaveTextContent("FRIED RICE");
    expect(preview).not.toHaveTextContent("53,675");
  });
});
