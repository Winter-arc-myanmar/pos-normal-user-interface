import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SettingsToggle, SettingsToggleRow } from "../settingsUi";

describe("settings switches", () => {
  it("keeps the switch width when the row description is long", () => {
    render(
      <SettingsToggleRow
        title="KDS delete slip"
        description={"Print a DELETE slip when a sent item is removed. ".repeat(4)}
        checked
        onChange={vi.fn()}
      />
    );

    const toggle = screen.getByRole("switch", { name: "KDS delete slip" });
    expect(toggle).toHaveClass("w-12", "min-w-[3rem]", "shrink-0");
    expect(toggle).toHaveAttribute("aria-checked", "true");
  });

  it("toggles on click and does not toggle while disabled", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SettingsToggle checked={false} onChange={onChange} label="KDS delete slip" />
    );

    fireEvent.click(screen.getByRole("switch", { name: "KDS delete slip" }));
    expect(onChange).toHaveBeenCalledWith(true);

    rerender(
      <SettingsToggle
        checked={false}
        onChange={onChange}
        label="KDS delete slip"
        disabled
      />
    );
    fireEvent.click(screen.getByRole("switch", { name: "KDS delete slip" }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
