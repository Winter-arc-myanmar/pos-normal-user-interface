import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "../LoginPage";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({
    login: vi.fn(),
    setActiveBranch: vi.fn(),
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  }),
}));

describe("LoginPage", () => {
  it("renders sign-in form fields", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByLabelText("login.userIdLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("login.passwordLabel")).toBeInTheDocument();
    expect(screen.queryByLabelText("login.tenantIdLabel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("login.branchIdLabel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "login.submit" })).toBeInTheDocument();
  });

  it("keeps an oversized login card in a top-reachable scroll container", () => {
    const { container } = render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    const viewport = container.querySelector("section");
    expect(viewport).toHaveClass("h-full", "flex-col", "overflow-y-auto");
    expect(viewport).not.toHaveClass("justify-center", "items-center-safe");
    expect(viewport?.firstElementChild).toHaveClass("my-auto", "shrink-0", "w-full");
    expect(container.querySelector('img[src="/logo.png"]')).toHaveAttribute("width", "176");
    expect(container.querySelector('img[src="/logo.png"]')).toHaveAttribute("height", "176");
  });
});
