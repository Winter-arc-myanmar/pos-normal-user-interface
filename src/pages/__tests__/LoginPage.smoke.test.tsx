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

    expect(screen.getByLabelText("login.emailLabel")).toBeInTheDocument();
    expect(screen.getByLabelText("login.passwordLabel")).toBeInTheDocument();
    expect(screen.queryByLabelText("login.tenantIdLabel")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("login.branchIdLabel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "login.submit" })).toBeInTheDocument();
  });
});
