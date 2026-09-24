import { describe, expect, it, vi } from "vitest";
import { downloadCsv } from "../exportReport";

describe("downloadCsv", () => {
  it("downloads a csv named for the report", () => {
    const click = vi.fn();
    const link = { href: "", download: "", click };
    vi.spyOn(document, "createElement").mockReturnValue(link as unknown as HTMLElement);
    URL.createObjectURL = vi.fn(() => "blob:report");
    URL.revokeObjectURL = vi.fn();

    downloadCsv("payments-2026-09-01.csv", [
      ["Method", "Amount"],
      ["Cash", "10"],
    ]);

    expect(link.download).toBe("payments-2026-09-01.csv");
    expect(click).toHaveBeenCalled();
  });
});
