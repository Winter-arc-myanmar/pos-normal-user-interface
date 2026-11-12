import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProfileSettingsPanel } from "../ProfileSettingsPanel";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const state = vi.hoisted(() => ({
  changePassword: vi.fn(),
  reset: vi.fn(),
  isSaving: false,
  error: null as string | null,
  changed: false,
  user: {
    name: "Daw Mya",
    nickname: "Daw Mya",
    loginId: "SHW0001",
    role: "STAFF" as const,
  },
}));

vi.mock("@/core/presentation/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user }),
}));

vi.mock("@/core/presentation/hooks/useChangePassword", () => ({
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 20,
  useChangePassword: () => ({
    isSaving: state.isSaving,
    error: state.error,
    changed: state.changed,
    changePassword: state.changePassword,
    reset: state.reset,
  }),
}));

const fill = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe("ProfileSettingsPanel change password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.isSaving = false;
    state.error = null;
    state.changed = false;
    state.changePassword.mockResolvedValue(true);
  });

  it("shows who is signed in", () => {
    render(<ProfileSettingsPanel />);

    expect(screen.getByText("Daw Mya")).toBeInTheDocument();
    expect(screen.getByText("SHW0001")).toBeInTheDocument();
    expect(screen.getByText("settings.profile.roleStaff")).toBeInTheDocument();
  });

  it("stops when the two new passwords differ", async () => {
    render(<ProfileSettingsPanel />);

    fill("settings.profile.currentPassword", "oldpass1");
    fill("settings.profile.newPassword", "newpass123");
    fill("settings.profile.confirmPassword", "otherpass1");
    fireEvent.click(
      screen.getByRole("button", { name: "settings.profile.submit" })
    );

    expect(
      await screen.findByText("settings.profile.mismatch")
    ).toBeInTheDocument();
    expect(state.changePassword).not.toHaveBeenCalled();
  });

  it("sends both passwords and clears the form once the server changed it", async () => {
    render(<ProfileSettingsPanel />);

    fill("settings.profile.currentPassword", "oldpass1");
    fill("settings.profile.newPassword", "newpass123");
    fill("settings.profile.confirmPassword", "newpass123");
    fireEvent.click(
      screen.getByRole("button", { name: "settings.profile.submit" })
    );

    await waitFor(() =>
      expect(state.changePassword).toHaveBeenCalledWith("oldpass1", "newpass123")
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("settings.profile.currentPassword")
      ).toHaveValue("")
    );
  });

  it("shows the API's message when the current password is wrong", () => {
    state.error = "Current password is incorrect";

    render(<ProfileSettingsPanel />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Current password is incorrect"
    );
  });
});
