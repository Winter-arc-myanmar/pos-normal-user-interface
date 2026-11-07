import { describe, expect, it } from "vitest";
import {
  PrintTemplate,
  defaultPrintTemplateSettings,
} from "@/core/domain/entities/PrintTemplate";
import { pickPrintTemplate, pickSavedPrintTemplate } from "../selectPrintTemplate";

const template = (fields: Partial<PrintTemplate> = {}): PrintTemplate =>
  new PrintTemplate({
    id: "t1",
    type: "KITCHEN",
    name: "Kitchen",
    paperWidth: "MM80",
    settings: defaultPrintTemplateSettings(),
    createdAt: "2026-01-01T00:00:00.000Z",
    ...fields,
  });

/** The item text size a template prints with, as a stand-in for "its sizes". */
const scaleOf = (picked?: PrintTemplate) => picked?.settings.item.itemTextScale;

describe("picking the template a slip prints with", () => {
  it("keeps the one default the server would use", () => {
    const kitchen = template({ isDefault: true, settings: kitchenSettings("2H1W") });
    expect(scaleOf(pickSavedPrintTemplate("KDS", [kitchen]))).toBe("2H1W");
  });

  it("uses the saved template when nothing is flagged default", () => {
    const kitchen = template({ settings: kitchenSettings("1H1W") });

    // The server's rule refuses a template that is not a default.
    expect(pickPrintTemplate("KDS", [kitchen])).toBeUndefined();
    // Printing with it still beats printing the built-in double-height items.
    expect(scaleOf(pickSavedPrintTemplate("KDS", [kitchen]))).toBe("1H1W");
  });

  it("prints this outlet's copy before the all-outlets one", () => {
    const shared = template({
      id: "shared",
      settings: kitchenSettings("2H2W"),
      updatedAt: "2026-06-01T00:00:00.000Z",
    });
    const outlet = template({
      id: "outlet",
      locationId: "loc-1",
      settings: kitchenSettings("1H1W"),
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(scaleOf(pickSavedPrintTemplate("KDS", [shared, outlet], "loc-1"))).toBe("1H1W");
    // Another outlet keeps the all-outlets template.
    expect(scaleOf(pickSavedPrintTemplate("KDS", [shared, outlet], "loc-2"))).toBe("2H2W");
  });

  it("picks the newest one when two are flagged default", () => {
    const older = template({
      id: "older",
      isDefault: true,
      settings: kitchenSettings("1H1W"),
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    const newer = template({
      id: "newer",
      isDefault: true,
      settings: kitchenSettings("2H1W"),
      updatedAt: "2026-05-01T00:00:00.000Z",
    });

    // The strict picker refuses this state, which used to leave the built-in
    // kitchen layout (double-height items) printing instead of the shop's sizes.
    expect(() => pickPrintTemplate("KDS", [older, newer])).toThrow();
    expect(scaleOf(pickSavedPrintTemplate("KDS", [older, newer]))).toBe("2H1W");
  });

  it("prints nothing saved for another section or a deleted one", () => {
    const receipt = template({ id: "r1", type: "RECEIPT", isDefault: true });
    const removed = template({ id: "k1", deletedAt: "2026-02-01T00:00:00.000Z" });

    expect(pickSavedPrintTemplate("KDS", [receipt, removed])).toBeUndefined();
    expect(pickSavedPrintTemplate("KDS", [])).toBeUndefined();
  });
});

function kitchenSettings(itemTextScale: string) {
  const settings = defaultPrintTemplateSettings();
  settings.item.itemTextScale = itemTextScale;
  // The settings screen leaves this at the kitchen's large once the switch is used.
  settings.item.fontSize = "LARGE";
  return settings;
}
