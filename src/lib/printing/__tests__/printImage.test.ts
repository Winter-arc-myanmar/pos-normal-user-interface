import { describe, expect, it } from "vitest";
import { defaultPrintTemplateSettings } from "@/core/domain/entities/PrintTemplate";
import { encodeEscPos } from "../escPosBytes";
import {
  buildSaleReceiptLines,
  formatSaleReceipt,
  saleReceiptPreview,
  SaleReceipt,
} from "../formatKdsTicket";
import {
  ditherToImage,
  iconImage,
  imageFromRows,
  imageRuns,
  inlineIconCommand,
  isDot,
  rasterCommand,
} from "../printImage";
import { logoSize } from "../printLogo";

const GS = "\x1d";
const ESC = "\x1b";

describe("printer dots", () => {
  it("packs a drawn picture eight dots to a byte, left dot high", () => {
    const image = imageFromRows(["#.......#", "........."]);
    expect(image.width).toBe(9);
    expect(Array.from(image.bits)).toEqual([0x80, 0x80, 0, 0]);
    expect(isDot(image, 0, 0)).toBe(true);
    expect(isDot(image, 8, 0)).toBe(true);
    expect(isDot(image, 1, 0)).toBe(false);
  });

  it("prints dark pixels, leaves light and transparent ones as paper", () => {
    const pixels = new Uint8ClampedArray([
      0, 0, 0, 255, // black
      255, 255, 255, 255, // white
      0, 0, 0, 0, // transparent black
    ]);
    const image = ditherToImage(pixels, 3, 1);
    expect([0, 1, 2].map((x) => isDot(image, x, 0))).toEqual([true, false, false]);
  });

  it("shades a mid grey as roughly half the dots", () => {
    const pixels = new Uint8ClampedArray(16 * 16 * 4).fill(128);
    for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
    const image = ditherToImage(pixels, 16, 16);
    const dots = imageRuns(image).reduce((sum, run) => sum + run.width, 0);
    expect(dots).toBeGreaterThan(256 * 0.4);
    expect(dots).toBeLessThan(256 * 0.6);
  });

  it("sends a picture as raster bands the printer can keep up with", () => {
    const image = imageFromRows(Array.from({ length: 100 }, () => "#".repeat(16)));
    const command = rasterCommand(image);
    const bands = command.split(`${GS}v0\x00`).slice(1);
    expect(bands).toHaveLength(2);
    // 2 bytes a row, 64 rows, then the 36 left over.
    expect(bands[0].slice(0, 4)).toBe("\x02\x00\x40\x00");
    expect(bands[1].slice(0, 4)).toBe("\x02\x00\x24\x00");
    expect(bands[0]).toHaveLength(4 + 2 * 64);
  });

  it("puts an icon inside a line of text, 24 dots high", () => {
    const command = inlineIconCommand("phone");
    expect(command.startsWith(`${ESC}*\x21\x18\x00`)).toBe(true);
    expect(command).toHaveLength(5 + 24 * 3);
    expect(iconImage("email").height).toBe(24);
  });

  it("keeps the picture's bytes as bytes on the way to the printer", () => {
    expect(Array.from(encodeEscPos("\x80\xff"))).toEqual([0x80, 0xff]);
    expect(Array.from(encodeEscPos("က"))).toEqual([0xe1, 0x80, 0x80]);
  });

  it("fits a logo to half the roll and 160 dots high, in whole bytes", () => {
    expect(logoSize(1000, 500, "MM80")).toEqual({ width: 288, height: 144 });
    expect(logoSize(1000, 500, "MM58")).toEqual({ width: 192, height: 96 });
    expect(logoSize(200, 800, "MM80")).toEqual({ width: 40, height: 160 });
    expect(logoSize(64, 32, "MM80")).toEqual({ width: 64, height: 32 });
  });
});

describe("the receipt header", () => {
  const logo = imageFromRows(["########", "########"]);
  const receipt = (over: Partial<SaleReceipt> = {}): SaleReceipt => ({
    title: "Receipt",
    lines: [],
    total: "1000",
    company: {
      name: "Grand Spa",
      phone: "09 123 456 789",
      email: "hello@grandspa.com",
    },
    logo,
    template: defaultPrintTemplateSettings(),
    ...over,
  });

  it("prints the logo first, then the name, then phone and email after their icons", () => {
    const escPos = formatSaleReceipt(receipt());
    const logoAt = escPos.indexOf(`${GS}v0`);
    const nameAt = escPos.indexOf("GRAND SPA");
    const phoneAt = escPos.indexOf(`${inlineIconCommand("phone")} 09 123 456 789`);
    const emailAt = escPos.indexOf(`${inlineIconCommand("email")} hello@grandspa.com`);
    expect(logoAt).toBeGreaterThan(-1);
    expect(nameAt).toBeGreaterThan(logoAt);
    expect(phoneAt).toBeGreaterThan(nameAt);
    expect(emailAt).toBeGreaterThan(phoneAt);
  });

  it("leaves out whatever the template switches off", () => {
    const template = defaultPrintTemplateSettings();
    template.header.logo = false;
    template.header.email = false;
    const escPos = formatSaleReceipt(receipt({ template }));
    expect(escPos).not.toContain(`${GS}v0`);
    expect(escPos).not.toContain("hello@grandspa.com");
    expect(escPos).toContain("09 123 456 789");
  });

  it("prints no logo when the business has none", () => {
    expect(formatSaleReceipt(receipt({ logo: null }))).not.toContain(`${GS}v0`);
  });

  it("writes Tel and Email where icons cannot be drawn", () => {
    const text = buildSaleReceiptLines(receipt()).join("\n");
    expect(text).toContain("Tel 09 123 456 789");
    expect(text).toContain("Email hello@grandspa.com");
  });

  it("previews the logo and the icon lines", () => {
    const rows = saleReceiptPreview(receipt()).rows;
    expect(rows[0]).toEqual({ kind: "image", image: logo });
    expect(rows).toContainEqual({ kind: "contact", icon: "email", text: "hello@grandspa.com" });
  });
});

describe("the template's other switches", () => {
  const bill = (over: Partial<SaleReceipt> = {}): SaleReceipt => ({
    title: "Receipt",
    lines: [{ name: "Fried rice", quantity: "2", unitPrice: "6500" }],
    subtotal: "13000",
    total: "13000",
    payments: [{ name: "Cash", amount: "15000" }],
    change: "2000",
    paidAt: "2026-10-09T14:31:00",
    cashier: "Aung Aung",
    template: defaultPrintTemplateSettings(),
    ...over,
  });
  const text = (receipt: SaleReceipt) => buildSaleReceiptLines(receipt).join("\n");

  it("leaves the money off the order receipt when told to", () => {
    const template = defaultPrintTemplateSettings();
    template.item.hidePriceOnOrderBill = true;
    const floor = text(bill({ template, copy: "ORDER_RECEIPT", title: "Order receipt" }));
    expect(floor).toContain("2 x Fried rice");
    expect(floor).not.toContain("13,000");
    expect(floor).not.toContain("TOTAL");
    expect(floor).not.toMatch(/Cash\s+15,000/);
    expect(text(bill({ template }))).toContain("13,000");
  });

  it("keeps prices on the order receipt unless told otherwise", () => {
    expect(text(bill({ copy: "ORDER_RECEIPT" }))).toContain("13,000");
  });

  it("prints when it was paid when pay time is on", () => {
    const template = defaultPrintTemplateSettings();
    expect(text(bill({ template }))).not.toContain("Paid at");
    template.bill.payTime = true;
    expect(text(bill({ template }))).toMatch(/Paid at\s+09 Oct 2026 14:31/);
  });

  it("prints items and the rest at the sizes chosen", () => {
    const template = defaultPrintTemplateSettings();
    template.item.itemTextScale = "2H2W";
    template.item.otherTextScale = "2H1W";
    const rows = saleReceiptPreview(bill({ template })).rows.filter((row) => row.kind === "text");
    // Big text halves the line, so the name wraps.
    const item = rows.find((row) => row.kind === "text" && row.text.includes("Fried"));
    const cashier = rows.find((row) => row.kind === "text" && row.text.includes("Aung Aung"));
    expect(item).toMatchObject({ size: "huge" });
    expect(cashier).toMatchObject({ size: "tall" });
    expect(formatSaleReceipt(bill({ template }))).toContain(`${ESC}!\x302 x Fried`);
  });

  it("keeps an older template's large font printing tall", () => {
    const template = defaultPrintTemplateSettings();
    template.item.fontSize = "LARGE";
    const rows = saleReceiptPreview(bill({ template })).rows;
    expect(rows.find((row) => row.kind === "text" && row.text.includes("Fried rice"))).toMatchObject({
      size: "tall",
    });
  });
});

describe("which copies a paid bill prints", () => {
  it("prints the guest's copy alone unless the template asks for more", async () => {
    const { checkoutCopies, copySlip } = await import("../receiptCopies");
    const template = defaultPrintTemplateSettings();
    template.copies = [];
    expect(checkoutCopies(template)).toEqual(["CUSTOMER"]);
    template.copies = ["FINANCE", "CUSTOMER", "ORDER_RECEIPT"];
    expect(checkoutCopies(template)).toEqual(["CUSTOMER", "ORDER_RECEIPT", "FINANCE"]);
    const finance = copySlip({ title: "Receipt", lines: [], total: "1", template }, "FINANCE");
    expect(finance).toMatchObject({ title: "Finance copy", place: "FINANCE", template: undefined });
  });
});
